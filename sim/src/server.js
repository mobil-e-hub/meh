// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');
const mqttMatch = require('mqtt-match');
const dotenv = require('dotenv');
const MQTT = require('mqtt');


// Internal modules
const DroneSimulator = require('./simulators/drone-simulator');
const CarSimulator = require('./simulators/car-simulator');
const BusSimulator = require('./simulators/bus-simulator');
const HubSimulator = require('./simulators/hub-simulator');
const ParcelSimulator = require('./simulators/parcel-simulator');
// const ControlSystem = require('./control-system/control-system');

const {uuid} = require('./helpers');
const topology = require('../assets/scenario');


// Environment variables
dotenv.config();
const port = process.env.SIM_PORT || 3000;

const brokerUrl = process.env.MQTT_BROKER_URL;
const brokerUsername = process.env.MQTT_BROKER_USERNAME;
const brokerPassword = process.env.MQTT_BROKER_PASSWORD;

// Server
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`)
});

// Map and initial entities
const scenario = require('../assets/scenario');

// // MQTT client   TODO: why is there an extra MQTT client on the server?
// const mqtt_client = {
//     client: MQTT.connect('wss://ines-gpu-01.informatik.uni-mannheim.de:9001/meh/mqtt'),
//     root: 'mobil-e-hub/sim',
//     id: uuid(),
//     type: 'server'
// };
// mqtt_client.client.on('connect', () => {
//     console.log('Connected');
//     mqtt_client.client.subscribe(subscriptionTopics.map(topic => `${mqtt_client.root}/${topic}`));
// });
//
// mqtt_client.client.on('message', (topic, message) => {
//     let [project, version, direction, entity, id, ...args] = topic.split('/');
//     mqtt.receive({ version, direction, entity, id, args, rest: args.join('/'), string: { long: topic, short: `${direction}/${entity}/${id}/${args.join('/')}` } }, JSON.parse(message.toString()));
// });
// const mqtt = {
//     publish(topic, message = '') {
//         mqtt_client.client.publish(`mobil-e-hub/${mqtt_client.id}`, topic, message);
//         console.log(`< [${mqtt_client.type}] from/${sender}/${topic}: ${JSON.stringify(message)}`);
//         },
//     receive(topic, message) {
//         console.log(`> [${mqtt_client.type}] ${topic.direction}/${topic.entity}/${topic.id}/${topic.rest}: ${JSON.stringify(message)}`);
//     },
//     // publishFrom(sender, topic, message = '') {
//     //     mqtt_client.client.publish(`mobil-e-hub/sim/from/${sender}/${topic}`, JSON.stringify(message));
//     //     console.log(`< [${mqtt_client.type}] from/${sender}/${topic}: ${JSON.stringify(message)}`);
//     // }
// };


// Simulators
const hubSimulator = new HubSimulator(scenario);
const droneSimulator = new DroneSimulator(scenario);
const carSimulator = new CarSimulator(scenario);
const busSimulator = new BusSimulator(scenario);
const parcelSimulator = new ParcelSimulator(scenario);


// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
    server.close(() => {
        // droneSimulator.destructor();
        // carSimulator.destructor();
        // busSimulator.destructor();
        // hubSimulator.destructor();
        // parcelSimulator.destructor();
        // controlSystem.destructor();

        console.log('< Server shut down.');
        process.exit(0);
    });
}

// MQTT client
const mqttClient = MQTT.connect(brokerUrl, {
                username: brokerUsername,
                password: brokerPassword
});

// Endpoints
app.get('/', (req, res) => {
    res.status(200).send(`This is the base url of the simulation module. 
    <br> <br> <b>/ping:</b> Health-Check <br> 
    <br> <b>/ping/mqtt:</b> MQTT Health-Check`);
});

app.get('/ping', (req, res) => {
    res.status(200).json({sim: "pong"});
});

app.get('/ping/mqtt', (req, res) => {
    mqttClient.publish('pong', 'simulator');
    res.status(200).json({mqtt: 'pong'});
});

function matchTopic(pattern, topic) {
    return mqttMatch(pattern, topic.string);
}

app.get('/ping/mqtt', (req, res) => {
    mqtt.publish('pong', 'simulator');
    res.status(200).json({ mqtt: 'pong' });
});


// app.post('/meh/viz/hubs/find', (req, res) => {
//     res.json(controlSystem.getHubs(req.body.position, req.body.radius));
// });
//
// app.post('/meh/viz/orders/request', (req, res) => {
//     res.json({
//         sourceHubs: controlSystem.getHubs(req.body.source.position, req.body.source.radius).map(h => ({ id: h.id, position: topology.nodes[h.position].position })),
//         destinationHubs: controlSystem.getHubs(req.body.destination.position, req.body.destination.radius).map(h => ({ id: h.id, position: topology.nodes[h.position].position }))
//     });
// });
//
// app.post('/meh/viz/orders/place', (req, res) => {
//     const sourceHub = hubSimulator.hubs[req.body.destinationHubs];
//     const destinationHubs = _.pick(hubSimulator.hubs, req.body.destinationHubs);
//
//     parcelSimulator.
//     controlSystem.
//
//     res.status(200).json('ok');
// });

// Receive and distribute incoming event
// async function receive(topic, message) {
//     console.log(`> ${topic.string}: ${JSON.stringify(message)}`);
//     for (const [pattern, handlers] of Object.entries(eventGridSubscriptions)) {
//         if (matchTopic(pattern, topic)) {
//             for (const handler of handlers) {
//                 await handler(topic, message);
//             }
//         }
//     }
// }


