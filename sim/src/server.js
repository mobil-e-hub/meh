// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');

// Internal modules
const DroneSimulator = require('./simulators/drone-simulator');
const CarSimulator = require('./simulators/car-simulator');
const BusSimulator = require('./simulators/bus-simulator');
const HubSimulator = require('./simulators/hub-simulator');
const ParcelSimulator = require('./simulators/parcel-simulator');
const ControlSystem = require('./control-system/control-system');

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

// Simulators
const droneSimulator = new DroneSimulator(2);   // 2
const carSimulator = new CarSimulator(1);       // 1
const busSimulator = new BusSimulator(1);
const hubSimulator = new HubSimulator(3);       // 3
const parcelSimulator = new ParcelSimulator(hubSimulator);
const controlSystem = new ControlSystem(droneSimulator, carSimulator, busSimulator, hubSimulator, parcelSimulator);

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
    server.close(() => {
        droneSimulator.destructor();
        carSimulator.destructor();
        busSimulator.destructor();
        hubSimulator.destructor();
        parcelSimulator.destructor();
        controlSystem.destructor();

        console.log('< Server shut down.');
        process.exit(0);
    });
}

// Endpoints
app.get('/ping', (req, res) => {
    res.status(200).json({ sim: 'pong' });
});

app.post('/eventgrid', (req, res) => {
    // TODO: Handle incoming messages
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
