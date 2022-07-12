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
const schemaValidator = require('jsonschema');

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
const schemas = {
    mqtt: {
        parcelSchema: require('./schemas/mqtt/parcelState.json')
    },
    orchestrator: {
        orderPlacedSchema: require("./schemas/orchestrator/orderPlacedSchema"),
        statusUpdateSchema: require("./schemas/orchestrator/statusUpdateSchema")
    }
}

// Topics to listen to from MQTT broker (make sure that they are disjoint from topics received from Orchestrator!)
const subscriptionTopics = [
    'parcel/+/transfer',
    'parcel/+/delivered',
    'parcel/+/collected',
    'parcel/+/removed'
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

// Receive events from Orchestrator and forward them to MQTT broker
// The only valid event received from Orchestrator is an order/placed event -> validate immediately
app.post('/', validate({body: schemas.orchestrator.orderPlacedSchema}), async (req, res, next) => {
    try {
        const topic = `${root}/${version}/order/${req.body.transportId}/placed`;
        const message = {
            id: req.body.boxId,
            orderId: req.body.transportId,
            carrier: null,
            destination: {
                type: 'hub',
                id: req.body.destinationLocation.platformId
            }
        }

        mqttClient.publish(topic, JSON.stringify(message));

        console.log(`  (connector) Forwarding ${topic}: ${JSON.stringify(message)} from Orchestrator to MQTT`);

        // There's no need to return anything except status 200. Return json just for human readability (e.g., from Postman))
        res.status(200).json({ success: true, message: `Message forwarded to MQTT with topic ${topic}.` });
    }
    catch (error) {
        console.log(`> (connector) Invalid message received: ${JSON.stringify({ body: req.body, error })}`);
        return res.status(400).end();
    }
});

// Receive messages from MQTT broker and forward them to Orchestrator
mqttClient.on('message', async (topic, message) => {
    try {
        let [root, version, ...args] = topic.split('/');
        topic = args.join('/');
        console.log(`Message: ${message}, parsed: ${JSON.parse(message)}`)
        message = JSON.parse(message);

        const body = null;

        if (mqttMatch('parcel/+/transfer', topic)) {
            // Convert into statusUpdate format
            const validationResult = schemaValidator.validate(JSON.parse(message), schemas.mqtt.parcelSchema);
            if (validationResult.valid) {
                console.log(1);
                const body = {
                    boxId: message.id,
                    transportId: message.orderId,
                    location: { platformId: message.carrier.id },
                    state: message.carrier.type === 'drone' ? 'InTransportInAir' : (message.carrier.type === 'car' ? 'InTransport' : 'WaitingForTransport')
                }
                console.log(2);
                if (!schemaValidator.validate(body, schemas.orchestrator.statusUpdateSchema).valid) {
                    console.log(`> (connector) Could not transform message: ${JSON.stringify(message)}`);
                    return;
                }
                console.log(3);
            }
            else {
                console.log(`> (connector) Invalid event received from MQTT broker: ${message}. Validation result: ${JSON.stringify(validationResult)}`);
                return;
            }
        }
        else if (mqttMatch('parcel/+/delivered', topic)) {
            // Convert into statusUpdate format
            if (schemaValidator.validate(message, schemas.mqtt.parcelSchema).valid) {
                const body = {
                    boxId: message.id,
                    transportId: message.orderId,
                    location: { platformId: message.carrier.id },
                    state: 'Delivered'
                }

                if (!schemaValidator.validate(body, schemas.orchestrator.statusUpdateSchema).valid) {
                    console.log(`> (connector) Could not transform message: ${JSON.stringify(message)}`);
                    return;
                }
            }
            else {
                console.log(`> (connector) Invalid event received from MQTT broker: ${JSON.stringify(message)}`);
                return;
            }
        }
        else if (mqttMatch('parcel/+/collected', topic)) {
            // Convert into statusUpdate format
            if (schemaValidator.validate(message, schemas.mqtt.parcelSchema).valid) {
                const body = {
                    boxId: message.id,
                    transportId: message.orderId,
                    location: { platformId: message.carrier.id },
                    state: 'Completed'
                }

                if (!schemaValidator.validate(body, schemas.orchestrator.statusUpdateSchema).valid) {
                    console.log(`> (connector) Could not transform message: ${JSON.stringify(message)}`);
                    return;
                }
            }
            else {
                console.log(`> (connector) Invalid event received from MQTT broker: ${JSON.stringify(message)}`);
                return;
            }
        }
        else if (mqttMatch('parcel/+/removed', topic)) {
            // Convert into statusUpdate format
            if (schemaValidator.validate(message, schemas.mqtt.parcelSchema).valid) {
                const body = {
                    boxId: message.id,
                    transportId: message.orderId,
                    location: { platformId: message.carrier.id },
                    state: 'Failed'
                }

                if (!schemaValidator.validate(body, schemas.orchestrator.statusUpdateSchema).valid) {
                    console.log(`> (connector) Could not transform message: ${JSON.stringify(message)}`);
                    return;
                }
            }
            else {
                console.log(`> (connector) Invalid event received from MQTT broker: ${JSON.stringify(message)}`);
                return;
            }
        }
        else if (false) {
            // TODO: add other messages for forwarding to the Orchestrator
        }

        console.log(4);
        // Forward message to Orchestrator
        const result = await axios.post(orchestrator.url, body, { headers: { 'Ocp-Apim-Subscription-Key': orchestrator.subscriptionKey } });
        console.log(`  (connector) Forwarding ${topic}: ${JSON.stringify(message)} from MQTT to Orchestrator as ${JSON.stringify(body)}.`);
    }
    catch (err) {
        // console.log(`  (connector) Could not forward message ${JSON.stringify(body)} from MQTT to Orchestrator: ${err}!`);
        console.log(`  (connector) Could not forward ${topic}: ${JSON.stringify(message)} from MQTT to Orchestrator: ${err}!`);
    }
});
