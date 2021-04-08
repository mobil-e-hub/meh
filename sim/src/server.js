// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');
const mqttMatch = require('mqtt-match');
const { EventGridPublisherClient, AzureKeyCredential } = require("@azure/eventgrid");

// Internal modules
const DroneSimulator = require('./simulators/drone-simulator');
// const CarSimulator = require('./simulators/car-simulator');
// const BusSimulator = require('./simulators/bus-simulator');
const HubSimulator = require('./simulators/hub-simulator');
// const ParcelSimulator = require('./simulators/parcel-simulator');
// const ControlSystem = require('./control-system/control-system');

const { uuid } = require('./helpers');
const topology = require('../assets/topology');

// Server
const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`)
});

// Event Grid client (@azure/eventgrid)
const client = new EventGridPublisherClient(
    "https://mobilehub-dev-azweu.westeurope-1.eventgrid.azure.net/api/events",
    "EventGrid",
    new AzureKeyCredential("mIODu+I1dUE6EbEUZzTDC1QDLxWb0btNujdvlVpObE4=")
);

const eventGridSubscriptions = { };

const eventGrid = {
    publish: async (topic, message='') => {
        try {
            await client.send([{ eventType: 'mobil-e-hub', dataVersion: '1.0', subject: topic, data: message }]);
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    },
    subscribe: (pattern, handler) => {
        if (eventGridSubscriptions[pattern]) {
            eventGridSubscriptions[pattern].push(handler);
        }
        else {
            eventGridSubscriptions[pattern] = [handler];
        }
    },
    unsubscribe: (pattern, handler) => {
        if (eventGridSubscriptions[pattern]) {
            _.remove(eventGridSubscriptions[pattern], h => h === handler);
            if (eventGridSubscriptions[pattern].length === 0) {
                delete eventGridSubscriptions[pattern];
            }
        }
    }
};

// Simulators
const droneSimulator = new DroneSimulator(eventGrid, 2);   // 2
// const carSimulator = new CarSimulator(1);       // 1
// const busSimulator = new BusSimulator(1);
// const hubSimulator = new HubSimulator(3);       // 3
// const parcelSimulator = new ParcelSimulator(hubSimulator);
// const controlSystem = new ControlSystem(droneSimulator, carSimulator, busSimulator, hubSimulator, parcelSimulator);
const hubSimulator = new HubSimulator(eventGrid, 3);

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
app.get('/ping', (req, res) => {
    res.status(200).json({ sim: 'pong' });
});

app.get('/ping/eventgrid', (req, res) => {
    eventGrid.publish('ping');
    res.status(200).json({ eventgrid: 'pong' });
});

// Receive events from EventGrid
app.post('/eventgrid', async (req, res) => {
    for (const event of req.body) {
        // If this is a validation request, reply appropriately
        if (event.data && event.eventType === "Microsoft.EventGrid.SubscriptionValidationEvent") {
            console.log("Got SubscriptionValidation event data, validation code: " + event.data.validationCode + " topic: " + event.topic);
            res.status(200).json({ ValidationResponse: event.data.validationCode });
        }
        // Otherwise process request
        else {
            try {
                const topic = event.subject;
                const message = event.data;
                let [entity, id, ...args] = topic.split('/');
                await receive({ entity, id, args, rest: args.join('/'), string: topic }, message);
            }
            catch (err) {
                console.log(`Invalid event received: ${err}`);
            }
        }
    }

    // There's no need to return anything except status 200
    res.status(200).end();
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
async function receive(topic, message) {
    console.log(`> ${topic.string}: ${JSON.stringify(message)}`);
    for (const [pattern, handlers] of Object.entries(eventGridSubscriptions)) {
        if (matchTopic(pattern, topic)) {
            for (const handler of handlers) {
                await handler(topic, message);
            }
        }
    }
}

function matchTopic(pattern, topic) {
    return mqttMatch(pattern, topic.string);
}
