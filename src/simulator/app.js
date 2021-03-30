// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');

// Internal modules
const DroneSimulator = require('./simulators/drone-simulator');
const CarSimulator = require('./simulators/car-simulator');
const HubSimulator = require('./simulators/hub-simulator');
const ParcelSimulator = require('./simulators/parcel-simulator');
const ControlSystem = require('./control-system/control-system');

const { uuid } = require('./helpers');
const topology = require('../topology');

// Server
const app = express();
const port = 3000;
app.use(cors());
app.use(bodyParser.json());

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`)
});

// Simulators
const droneSimulator = new DroneSimulator(5);
const carSimulator = new CarSimulator(0);
const hubSimulator = new HubSimulator(3);
const parcelSimulator = new ParcelSimulator(hubSimulator);
const controlSystem = new ControlSystem(droneSimulator, carSimulator, hubSimulator, parcelSimulator);

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
    server.close(() => {
        droneSimulator.destructor();
        carSimulator.destructor();
        hubSimulator.destructor();
        parcelSimulator.destructor();
        controlSystem.destructor();

        console.log('< Server shut down.');
        process.exit(0);
    });
}

// Endpoints
app.post('/meh/viz/hubs/find', (req, res) => {
    res.json(controlSystem.getHubs(req.body.position, req.body.radius));
});

app.post('/meh/viz/orders/request', (req, res) => {
    res.json({
        sourceHubs: controlSystem.getHubs(req.body.source.position, req.body.source.radius).map(h => ({ id: h.id, position: topology.nodes[h.position].position })),
        destinationHubs: controlSystem.getHubs(req.body.destination.position, req.body.destination.radius).map(h => ({ id: h.id, position: topology.nodes[h.position].position }))
    });
});

app.post('/meh/viz/orders/place', (req, res) => {
    const sourceHub = hubSimulator.hubs[req.body.destinationHubs];
    const destinationHubs = _.pick(hubSimulator.hubs, req.body.destinationHubs);

    parcelSimulator.
    controlSystem.

    res.status(200).json('ok');
});
