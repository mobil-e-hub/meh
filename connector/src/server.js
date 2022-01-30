// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');
const mqttMatch = require('mqtt-match');
const { EventGridPublisherClient, AzureKeyCredential } = require("@azure/eventgrid");
const dotenv = require('dotenv');
const MQTT = require('mqtt');
const { Validator, ValidationError } = require('express-json-validator-middleware');


// Environment variables
dotenv.config();

const eventGridEndpoint = process.env.EVENT_GRID_ENDPOINT;
const eventGridKey = process.env.EVENT_GRID_KEY;
const port = process.env.SERVER_PORT || 3004;

const brokerUrl = process.env.MQTT_BROKER_URL;
const brokerUsername = process.env.MQTT_BROKER_USERNAME;
const brokerPassword = process.env.MQTT_BROKER_PASSWORD;

const root = process.env.ROOT || 'mobil-e-hub';
const version = process.env.VERSION || 'v1';

// JSON schema validation
const { validate } = new Validator();
const gridSchema = require("./schema")

// Topics to listen to from MQTT broker (make sure that they are disjoint from topics received from EventGrid!)
const subscriptionTopics = [
    'drone/#'
];

function validationErrorMiddleware(error, request, response, next) {
	 if (error instanceof ValidationError) {
    // Handle the error
    response.status(400).send(error.validationErrors);
    next();
  } else {
    // Pass error on if not a validation error
    next(error);
  }
}


// Server
const app = express();
app.use(cors());
app.use(express.json());

// app.use(validationErrorMiddleware);
/**
 * Error handler middleware for validation errors.
 */
app.use((error, req, res, next) => {
    // Check the error is a validation error
    console.log(`< (connector) Error caught: ${error}.`);
    if (error instanceof ValidationError) {
        // Handle the error
        console.log(`< (connector) Validation Error against JSON schema caught: ${error}.`);
        res.status(400).send(error.validationErrors);
        next();
    } else {
        // Pass error on if not a validation error
        next(error);
    }
});



const server = app.listen(port, () => {
    console.log(`< (connector) Server listening at http://localhost:${port}.`);
});


// MQTT client
const mqttClient = MQTT.connect(brokerUrl, {
                username: brokerUsername,
                password: brokerPassword
});

// Listen to any message which starts with the correct root and version
mqttClient.on('connect', () => {
    console.log(`< (connector) MQTT client connected to broker at ${brokerUrl}.`);
    mqttClient.subscribe(subscriptionTopics.map(topic => `${root}/${version}/${topic}`));
    console.log(`< (connector) MQTT client subscribed to topics ${subscriptionTopics.join(', ')}.`);
});


// EventGrid client (@azure/eventgrid)
const eventGridClient = new EventGridPublisherClient(eventGridEndpoint, 'EventGrid', new AzureKeyCredential(eventGridKey));


// Endpoints
// Base
app.get('/', (req, res) => {
    res.status(200).json('This is the base url of the meh/connector module.');
});


//Ping
app.get('/ping', (req, res) => {
    res.status(200).json({ connector: 'pong' });
});


// TODO: - move async to function?
//      - where exactly to place next() calls?
//      - split into seperate files -> Error handling ()
//       - move schema out of src folder

// Receive events from EventGrid and forward them to MQTT broker
app.post('/', validate({body: gridSchema}), async (req, res, next) => {
    try {

        // EventGrid messages are sent as an array
        if (Array.isArray(req.body)) {
            for (const event of req.body) {
                // If this is a validation request, reply appropriately
                if (event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
                    try {
                        console.log(`> (connector) SubscriptionValidation received from EventGrid: Validation code = ${event.data.validationCode}, topic = ${event.topic}`);
                        res.status(200).json({ValidationResponse: event.data.validationCode});
                    } catch (err) {
                        res.status(400).end();
                    }
                    next();
                }
                // If it is a simple echo, log it
                else if (event.eventType === "Portal_Echo") {
                    console.log(`> (connector) Echo received from EventGrid!`);
                    next();
                }
                // If it has the correct root and version, process it
                else if (event.eventType === root && event.dataVersion === version) {
                    try {
                        const topic = event.subject;
                        const message = JSON.stringify(event.data);
                        let [entity, id, ...args] = topic.split('/');
    
                        // Forward message to MQTT broker
                        mqttClient.publish(`${root}/${version}/${topic}`, message);
    
                        console.log(`  (connector) Forwarding ${topic}: ${message} from EventGrid to MQTT`);
                    } catch (err) {
                        console.log(`> (connector) Invalid event received from EventGrid: ${JSON.stringify({ event, err })}`);
                    }
                    next();
                }
                // Otherwise, log it
                else {
                    console.log(`> (connector) Invalid message received: ${JSON.stringify(req.body)}`);
                    return res.status(400).end();
                }
            }
            // All messages forwarded
            return res.status(200).end();
        }
        else {
            console.log(`> (connector) Invalid message received: ${JSON.stringify(req.body)}`);
            return res.status(400).end();
        }
    } 
    catch (error) {
        //TODO replace with expressjs middleware error Handling  --> https://www.robinwieruch.de/node-express-error-handling/
        console.log(`> (connector) Invalid message received: ${JSON.stringify({ body: req.body, error })}`);
        return res.status(400).end();
    }

    // There's no need to return anything except status 200
    res.status(200).end();
});

// Receive messages from MQTT broker and forward them to EventGrid
mqttClient.on('message', async (topic, message) => {
    try {
        let [root, version, ...args] = topic.split('/');
        topic = args.join('/');
        message = JSON.parse(message.toString());

        // Forward message to EventGrid
        try {
            await eventGridClient.send([{ eventType: root, dataVersion: version, subject: topic, data: message }]);
        }
        catch (err) {
            console.log(`< (connector) Could not forward ${topic}: ${JSON.stringify(message)} to EventGrid: ${err}`);
        }

        console.log(`  (connector) Forwarding ${topic}: ${JSON.stringify(message)} from MQTT to EventGrid`);
    }
    catch (err) {
        console.log(`> (connector) Invalid event received from MQTT broker: ${err}`);
    }
});
