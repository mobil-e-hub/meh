// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');
const mqttMatch = require('mqtt-match');
const {EventGridPublisherClient, AzureKeyCredential} = require("@azure/eventgrid");
const dotenv = require('dotenv');
const MQTT = require('mqtt');


// Internal modules
const DroneSimulator = require('./simulators/drone-simulator');
const CarSimulator = require('./simulators/car-simulator');
const BusSimulator = require('./simulators/bus-simulator');
const HubSimulator = require('./simulators/hub-simulator');
const ParcelSimulator = require('./simulators/parcel-simulator');
const ControlSystem = require('./control-system/control-system');

const {uuid} = require('./helpers');
const topology = require('../assets/topology');
// const subscriptionTopics = require("lodash/collection");


// Environment variables
dotenv.config();
const eventGridEndpoint = process.env.EVENT_GRID_ENDPOINT;
const eventGridKey = process.env.EVENT_GRID_KEY;
const port = process.env.SIM_PORT || 3000;

// TODO replace with prod broker
const mqttBrokerURL = process.env.MQTT_BROKER_test;
const mqttPort = process.env.BROKER_PORT_test;
const mqttRoot = process.env.MQTT_ROOT;

// Server
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`)
});

 // TODO subscriptionTopics?? --> was macht dieser Client???
// MQTT client
// const mqtt_client = {
//     client: MQTT.connect(mqttBrokerURL),
//     root: mqttRoot,
//     id: uuid(),
//     type: 'server'
// };
// mqtt_client.client.on('connect', () => {
//     console.log(` > Sim-Server: Connected to broker ${mqttBrokerURL} on port ${mqttPort}`);
//     mqtt_client.client.subscribe(subscriptionTopics.map(topic => `${mqtt_client.root}/${topic}`));
// });
//
// mqtt_client.client.on('message', (topic, message) => {
//     let [project, version, direction, entity, id, ...args] = topic.split('/');
//     mqtt.receive({
//         version,
//         direction,
//         entity,
//         id,
//         args,
//         rest: args.join('/'),
//         string: {long: topic, short: `${direction}/${entity}/${id}/${args.join('/')}`}
//     }, JSON.parse(message.toString()));
// });

// const mqtt = {
//     publish(topic, message = '') {
//         mqtt.publishFrom(`mobil-e-hub/${mqtt_client.id}`, topic, message);
//     },
//     receive(topic, message) {
//         console.log(`> [${mqtt_client.type}] ${topic.direction}/${topic.entity}/${topic.id}/${topic.rest}: ${JSON.stringify(message)}`);
//     },
//     publishFrom(sender, topic, message = '') {
//         mqtt_client.client.publish(`mobil-e-hub/sim/from/${sender}/${topic}`, JSON.stringify(message));
//         console.log(`< [${mqtt_client.type}] from/${sender}/${topic}: ${JSON.stringify(message)}`);
//     }
// };


// Simulators
const droneSimulator = new DroneSimulator(3);
const carSimulator = new CarSimulator(1);
const busSimulator = new BusSimulator(1);
const hubSimulator = new HubSimulator(3);
const parcelSimulator = new ParcelSimulator(hubSimulator);
const controlSystem = new ControlSystem(droneSimulator, carSimulator, busSimulator, hubSimulator, parcelSimulator);

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

// Endpoints
app.get('/', (req, res) => {
    res.status(200).send(`This is the base url of the simulation module. 
    <br> <br> <b>/ping:</b> Health-Check <br> 
    <b>/ping/eventgrid:</b> Eventgrid Health-Check
    <br> <b>/ping/mqtt:</b> MQTT Health-Check
    <br> <b>/eventgrid:</b> Eventgrid interface`);
});

app.get('/ping', (req, res) => {
    res.status(200).json({sim: "pong"});
});

app.get('/ping/eventgrid', (req, res) => {
    eventGrid.publish('pong', 'simulator');
    res.status(200).json({eventgrid: 'pong'});
});

app.get('/ping/mqtt', (req, res) => {
    mqtt.publish('pong', 'simulator');
    res.status(200).json({mqtt: 'pong'});
});

function matchTopic(pattern, topic) {
    return mqttMatch(pattern, topic.string);
}

// Receive events from EventGrid
// app.post('/eventgrid', async (req, res) => {
//     for (const event of req.body) {
//         // If this is a validation request, reply appropriately
//         if (event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
//             try {
//                 console.log("Got SubscriptionValidation event data, validation code: " + event.data.validationCode + " topic: " + event.topic);
//                 res.status(200).json({ValidationResponse: event.data.validationCode});
//             } catch (err) {
//                 res.status(404).end();
//             }
//         } else if (event.eventType === "Portal_Echo") {
//             console.log(`> (sim) Echo received!`);
//         }
//         // Otherwise process request
//         else {
//             try {
//                 const topic = event.subject;
//                 const message = event.data;
//                 let [entity, id, ...args] = topic.split('/');
//                 await receive({entity, id, args, rest: args.join('/'), string: topic}, message);
//             } catch (err) {
//                 console.log(`Invalid event received: ${err}`);
//             }
//         }
//     }
//
//     // There's no need to return anything except status 200
//     res.status(200).end();
// });

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


