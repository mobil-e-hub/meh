// External modules
const express = require('express');
const cors = require('cors');

// Internal modules
const DroneSimulator = require('./simulators/drone-simulator');
const CarSimulator = require('./simulators/car-simulator');
const HubSimulator = require('./simulators/hub-simulator');
const ParcelSimulator = require('./simulators/parcel-simulator');
const ControlSystem = require('./control-system/control-system');

// Server
const app = express();
const port = 3000;
app.use(cors());

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`)
});

// Simulators
const droneSimulator = new DroneSimulator(5);
const carSimulator = new CarSimulator(0);
const hubSimulator = new HubSimulator(0);
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
