// External modules
const express = require('express');
const cors = require('cors');
const _ = require('lodash');
const morgan = require('morgan');
const mqttMatch = require('mqtt-match');
const dotenv = require('dotenv');
const MQTT = require('mqtt');
const { Validator, ValidationError } = require('express-json-validator-middleware');
const axios = require('axios');

// Environment variables
dotenv.config();

// Orchestrator config
const orchestrator = {
    url: process.env.ORCHESTRATOR_URL,
    subscriptionKey: process.env.ORCHESTRATOR_SUBSCRIPTION_KEY
}

const port = process.env.SERVER_PORT || 3004;

const brokerUrl = process.env.MQTT_BROKER_URL;
const brokerUsername = process.env.MQTT_BROKER_USERNAME;
const brokerPassword = process.env.MQTT_BROKER_PASSWORD;

const root = process.env.ROOT || 'mobil-e-hub';
const version = process.env.VERSION || 'v1';

// JSON schema validation
const { validate } = new Validator();
const orderPlacedSchema = require("./schemas/orderPlacedSchema");

// Topics to listen to from MQTT broker (make sure that they are disjoint from topics received from Orchestrator!)
const subscriptionTopics = [
    'parcel/+/status'
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

// Start MQTT client
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

// Receive events from Orchestrator and forward them to MQTT broker
// The only valid event received from Orchestrator is an order/placed event -> validate immediately
app.post('/', validate({body: orderPlacedSchema}), async (req, res, next) => {
    try {
        const message = req.body;
        const topic = `${root}/${version}/order/${message.transportId}/placed`;

        // mqttClient.publish(topic, JSON.stringify(message));
    
        console.log(`  (connector) Forwarding ${topic}: ${message} from Orchestrator to MQTT`);

        // There's no need to return anything except status 200. Return json just for human readability (e.g., from Postman))
        res.status(200).json({ success: true, message: `Message forwarded to MQTT with topic ${topic}.` });
    } 
    catch (error) {
        //TODO replace with expressjs middleware error Handling  --> https://www.robinwieruch.de/node-express-error-handling/
        console.log(`> (connector) Invalid message received: ${JSON.stringify({ body: req.body, error })}`);
        return res.status(400).end();
    }
});

// Receive messages from MQTT broker and forward them to Orchestrator
mqttClient.on('message', async (topic, message) => {
    try {
        let [root, version, ...args] = topic.split('/');
        topic = args.join('/');
        message = JSON.parse(message.toString());

        // TODO: Validate message format against schema
        if (false) {
            console.log(`> (connector) Invalid event received from MQTT broker: ${message}`);
        }

        // Forward message to Orchestrator
        headers = { 
            'Ocp-Apim-Subscription-Key': orchestrator.subscriptionKey 
        };
        
        body = {
            transportId: message.id,
            address: { platformId: message.carrier },
            state: message.state
        }

        result = await axios.post(orchestrator.url, body, { headers });
        console.log(`  (connector) Forwarding ${topic}: ${message} from MQTT to Orchestrator.`);
    }
    catch (err) {
        console.log(`  (connector) Could not forward ${topic}: ${message} from MQTT to Orchestrator!`);
    }
});
