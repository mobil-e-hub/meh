// External modules
const { v4: uuid } = require('uuid');
const express = require('express');
const cors = require('cors');
const MQTT = require('mqtt');

// Internal modules
const DroneSimulator = require('./simulation/drone-simulator');
const VehicleSimulator = require('./simulation/vehicle-simulator');

// Server
const app = express();
const port = 3000;
app.use(express.static('src/www'));
app.use(cors());

app.get('/', (req, res) => {
    return res.send('Hello World!')
});

app.get('/drones', (req, res) => {
    return res.json(droneSimulator.drones)
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
});

// MQTT Client
const mqtt = {
    client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
    root: 'mobil-e-hub/v1',
    id: uuid()
};

mqtt.client.on('connect', () => {
    // mqtt.client.subscribe(`${mqtt.root}/#`);

    publish('connected');
});

mqtt.client.on('message', (topic, message) => {
    receive(topic.split('/'), JSON.parse(message.toString()));
});

function publish(topic, message = '') {
    mqtt.client.publish(`${mqtt.root}/from/server/${mqtt.id}/${topic}`, JSON.stringify(message));
    console.log(`< [Server] from/server/${mqtt.id}/${topic}: ${JSON.stringify(message)}`);
}

function receive(topic, message) {
    console.log(`> [Server] ${topic.join('/')}: ${JSON.stringify(message)}`);
}

// Simulators
const droneSimulator = new DroneSimulator(5);
const vehicleSimulator = new VehicleSimulator(3);
