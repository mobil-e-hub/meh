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

const forwardings = {
    mqttToHttp: {
        // Topics to listen to from MQTT broker (make sure that they are disjoint from topics received from Orchestrator!)
        'parcel/+/transfer': {
            inputSchema: schemas.mqtt.parcelSchema,
            outputSchema: schemas.orchestrator.statusUpdateSchema,
            handler: (topic, message) => {
                return {
                    boxId: message.id,
                    transportId: message.orderId,
                    location: {platformId: message.carrier.id},
                    state: message.carrier.type === 'drone' ? 'InTransportInAir' : (message.carrier.type === 'car' ? 'InTransport' : 'WaitingForTransport')
                };
            }
        },
        'parcel/+/delivered': {
            inputSchema: schemas.mqtt.parcelSchema,
            outputSchema: schemas.orchestrator.statusUpdateSchema,
            handler: (topic, message) => {
                return { boxId: message.id, transportId: message.orderId, location: {platformId: message.carrier.id}, state: 'Delivered' };
            }
        },
        'parcel/+/collected': {
            inputSchema: schemas.mqtt.parcelSchema,
            outputSchema: schemas.orchestrator.statusUpdateSchema,
            handler: (topic, message) => {
                return { boxId: message.id, transportId: message.orderId, location: {platformId: message.carrier.id}, state: 'Completed' };
            }
        },
        'parcel/+/removed': {
            inputSchema: schemas.mqtt.parcelSchema,
            outputSchema: schemas.orchestrator.statusUpdateSchema,
            handler: (topic, message) => {
                return { boxId: message.id, transportId: message.orderId, location: {platformId: message.carrier.id}, state: 'Failed' };
            }
        }
    },
    httpToMqtt: {
        'order-placed': {
            inputSchema: schemas.orchestrator.orderPlacedSchema,
            outputSchema: schemas.mqtt.parcelSchema,
            handler: (req, res) => {
                return {
                    topic: `${root}/${version}/order/${req.body.transportId}/placed`,
                    message: {
                        id: req.body.boxId,
                        orderId: req.body.transportId,
                        carrier: null,
                        destination: {type: 'hub', id: req.body.destinationLocation.platformId}
                    }
                };
            }
        },
        'order-cancelled': {
            inputSchema: schemas.orchestrator.statusUpdateSchema,
            outputSchema: null,
            handler: (req, res) => {
                return {
                    topic: `${root}/${version}/order/${req.body.transportId}/canceled`,
                    message: { }
                };
            }
        }
    }
}

// Server
const app = express();
app.use(cors());
app.use(express.json());

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
    mqttClient.subscribe(Object.keys(forwardings.mqttToHttp).map(topic => `${root}/${version}/${topic}`));
    console.log(`< (connector) MQTT client subscribed to topics ${Object.keys(forwardings.mqttToHttp).join(', ')}.`);
});


// Endpoints
// Base
app.get('/', (req, res) => {
    res.status(200).json('This is the base url of the meh/connector module.');
});


//Ping
app.get('/ping', (req, res) => {
    res.status(200).json({ connector: 'pong', method: 'get' });
});

app.post('/ping', (req, res) => {
    res.status(200).json({ connector: 'pong', method: 'post' });
});


// Receive events from Orchestrator and forward them to MQTT broker
app.post('/', async (req, res, next) => {
    for (const [key, { inputSchema, outputSchema, handler }] of Object.entries(forwardings.httpToMqtt)) {
        if (key === req.query.topic) {
            try {
                if (!inputSchema || schemaValidator.validate(req.body, inputSchema).valid) {
                    const { topic, message } = handler(req, res);
                    if (!outputSchema || schemaValidator.validate(message, outputSchema).valid) {
                        mqttClient.publish(topic, JSON.stringify(message));
                        console.log(`  (connector) Forwarding ${topic}: ${JSON.stringify(message)} from Orchestrator to MQTT.`);

                        // There's no need to return anything except status 200. Return json just for human readability (e.g., from Postman))
                        res.status(200).json({ success: true, message: `Message forwarded to MQTT with topic ${topic}.` });
                    }
                    else {
                        console.log(`> (connector) Output schema validation failed: ${schemaValidator.validate(message, outputSchema)}`);
                        res.status(400).end();
                    }
                }
                else {
                    console.log(`> (connector) Input schema validation failed: ${schemaValidator.validate(req.body, inputSchema)}`);
                    res.status(400).end();
                }
            }
            catch (e) {
                console.log(`> (connector) Could not forward ${req.body} from Orchestrator to MQTT: ${e}`);
                return res.status(400).end();
            }
        }
    }
    res.status(400).json({ success: false, message: 'Could not find any matching topic!' });
});

// Receive messages from MQTT broker and forward them to Orchestrator
mqttClient.on('message', async (topic, message) => {
    try {
        let [root, version, ...args] = topic.split('/');
        topic = args.join('/');
        message = JSON.parse(message);
    }
    catch (err) {
        console.log(`  (connector) Could not parse ${topic}: ${JSON.stringify(message)}: ${err}!`);
    }

    for (const [key, { inputSchema, outputSchema, handler }] of Object.entries(forwardings.mqttToHttp)) {
        if (mqttMatch(key, topic)) {
            try {
                if (!inputSchema || schemaValidator.validate(message, inputSchema).valid) {
                    const body = handler(topic, message);
                    if (!outputSchema || schemaValidator.validate(body, outputSchema).valid) {
                        await axios.post(orchestrator.url, body, { headers: { 'Ocp-Apim-Subscription-Key': orchestrator.subscriptionKey, 'Content-Type': 'application/json' } });
                        console.log(`  (connector) Forwarding ${topic}: ${JSON.stringify(message)} from MQTT to Orchestrator as ${JSON.stringify(body)}.`);
                    }
                    else {
                        console.log(`> (connector) Output schema validation failed: ${schemaValidator.validate(body, outputSchema)}`);
                    }
                }
                else {
                    console.log(`> (connector) Input schema validation failed: ${schemaValidator.validate(message, inputSchema)}`);
                }
            }
            catch (e) {
                console.log(`> (connector) Could not forward ${topic} (${JSON.stringify(message)}) from MQTT to Orchestrator: ${e}`);
            }
        }
    }
});
