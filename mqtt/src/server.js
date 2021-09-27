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


// Topics to listen to from MQTT broker (make sure that they are disjoint from topics received from EventGrid!)
const subscriptionTopics = [
    'drone/#'
];


// Server
const app = express();
app.use(cors());
app.use(bodyParser.json());
// app.use(morgan('combined'));

const server = app.listen(port, () => {
    console.log(`< (mqtt) Server listening at http://localhost:${port}.`);
});


// MQTT client
const mqttClient = MQTT.connect(brokerUrl, {
                username: brokerUsername,
                password: brokerPassword
});

// Listen to any message which starts with the correct root and version
mqttClient.on('connect', () => {
    console.log(`< (mqtt) MQTT client connected to broker at ${brokerUrl}.`);
    mqttClient.subscribe(subscriptionTopics.map(topic => `${root}/${version}/${topic}`));
    console.log(`< (mqtt) MQTT client subscribed to topics ${subscriptionTopics.join(', ')}.`);
});


// EventGrid client (@azure/eventgrid)
const eventGridClient = new EventGridPublisherClient(eventGridEndpoint, 'EventGrid', new AzureKeyCredential(eventGridKey));


// Endpoints
// Base
app.get('/', (req, res) => {
    res.status(200).json('This is the base url of the meh/mqtt module.');
});

// EventGrid Dummy
app.get('/dummy', (req, res) => {
    res.status(200).json('This is the endpoint dummy for EventGrid style messages to the meh/mqtt module.');
});

//Ping
app.get('/ping', (req, res) => {
    res.status(200).json({ mqtt: 'pong' });
});

// Receive events from EventGrid and forward them to MQTT broker
//TODO remove this dummy post method
app.post('/dummy', async (req, res) => {
    for (const event of req.body) {
        // If this is a validation request, reply appropriately
        if (event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
            try {
                console.log(`> (mqtt) SubscriptionValidation received from EventGrid: Validation code = ${event.data.validationCode}, topic = ${event.topic}`);
                res.status(200).json({ ValidationResponse: event.data.validationCode });
            }
            catch (err)
            {
                res.status(404).end();
            }
        }
        // If it is a simple echo, log it
        else if (event.eventType === "Portal_Echo") {
            console.log(`> (mqtt) Echo received from EventGrid!`);
        }
        // If it has the correct root and version, process it
        else if (event.eventType === root && event.dataVersion === version){
            try {
                const topic = event.subject;
                const message = JSON.stringify(event.data);
                let [entity, id, ...args] = topic.split('/');

                // Forward message to MQTT broker
                mqttClient.publish(`${root}/${version}/${topic}`, message);

                console.log(`  (mqtt) Forwarding ${topic}: ${message} from EventGrid to MQTT`);
            }
            catch (err) {
                console.log(`> (mqtt) Invalid event received from EventGrid: ${err}`);
            }
        }
        // Otherwise, log it
        else {
            try {
                console.log(`> (mqtt) Invalid message received from EventGrid: ${JSON.stringify({ type: event.eventType, version: event.dataVersion, topic: event.subject, message: event.data })}`);
            }
            catch (err) {
                console.log(`> (mqtt) Invalid event received from EventGrid: ${err}`);
            }
        }
    }

    // There's no need to return anything except status 200
    res.status(200).end();
});

// Receive events from EventGrid and forward them to MQTT broker
app.post('/', async (req, res) => {
    for (const event of req.body) {
        // If this is a validation request, reply appropriately
        if (event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
            try {
                console.log(`> (mqtt) SubscriptionValidation received from EventGrid: Validation code = ${event.data.validationCode}, topic = ${event.topic}`);
                res.status(200).json({ ValidationResponse: event.data.validationCode });
            }
            catch (err)
            {
                res.status(404).end();
            }
        }
        // If it is a simple echo, log it
        else if (event.eventType === "Portal_Echo") {
            console.log(`> (mqtt) Echo received from EventGrid!`);
        }
        // If it has the correct root and version, process it
        else if (event.eventType === root && event.dataVersion === version){
            try {
                const topic = event.subject;
                const message = JSON.stringify(event.data);
                let [entity, id, ...args] = topic.split('/');

                // Forward message to MQTT broker
                mqttClient.publish(`${root}/${version}/${topic}`, message);

                console.log(`  (mqtt) Forwarding ${topic}: ${message} from EventGrid to MQTT`);
            }
            catch (err) {
                console.log(`> (mqtt) Invalid event received from EventGrid: ${err}`);
            }
        }
        // Otherwise, log it
        else {
            try {
                console.log(`> (mqtt) Invalid message received from EventGrid: ${JSON.stringify({ type: event.eventType, version: event.dataVersion, topic: event.subject, message: event.data })}`);
            }
            catch (err) {
                console.log(`> (mqtt) Invalid event received from EventGrid: ${err}`);
            }
        }
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
            console.log(`< (mqtt) Could not forward ${topic}: ${JSON.stringify(message)} to EventGrid: ${err}`);
        }

        console.log(`  (mqtt) Forwarding ${topic}: ${JSON.stringify(message)} from MQTT to EventGrid`);
    }
    catch (err) {
        console.log(`> (mqtt) Invalid event received from MQTT broker: ${err}`);
    }
});
