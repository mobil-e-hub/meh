// External modules
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const _ = require('lodash');
const morgan = require('morgan');
const mqttMatch = require('mqtt-match');
const dotenv = require('dotenv');
const MQTT = require('mqtt');
const path = require('path');

// Internal modules
const DroneSimulator = require('./simulators/drone-simulator');
const CarSimulator = require('./simulators/car-simulator');
const BusSimulator = require('./simulators/bus-simulator');
const HubSimulator = require('./simulators/hub-simulator');
const ParcelSimulator = require('./simulators/parcel-simulator');

//const {uuid} = require('./helpers');

const ControlSystem = require('./control-system/control-system');


// Environment variables
dotenv.config();
const port = process.env.SIM_PORT || 3000;

const brokerUrl = process.env.MQTT_BROKER_URL;
const brokerUsername = process.env.MQTT_BROKER_USERNAME;
const brokerPassword = process.env.MQTT_BROKER_PASSWORD;
const mqttRoot = process.env.MQTT_ROOT;

const scenarioPath = process.env.PATH_SCENARIOS;
const defaultScenario = process.env.DEFAULT_SCENARIO;
// Server
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined'));

const server = app.listen(port, () => {
    console.log(`< Server listening at http://localhost:${port}.`);
});

// Map and initial entities
const initScenario = require(path.join(`${scenarioPath}`, `${defaultScenario}`));
// console.log(`New Scenario is found?? => ${initScenario}`);

// Simulators
const hubSimulator = new HubSimulator(initScenario);
const droneSimulator = new DroneSimulator(initScenario);
const carSimulator = new CarSimulator(initScenario);
const busSimulator = new BusSimulator(initScenario);
const parcelSimulator = new ParcelSimulator(initScenario);

// Control system for dummy simulation
const controlSystem = new ControlSystem();

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
    <br> <b>/ping/mqtt:</b> MQTT Health-Check`);
});

app.get('/ping', (req, res) => {
    res.status(200).json({sim: "pong"});
});

app.get('/ping/mqtt', (req, res) => {
    mqttClient.publish('pong', 'simulator');
    res.status(200).json({mqtt: 'pong'});
});


// MQTT client
// TODO erweitere diesen MQTT client: get list of available scenarios and send them to viz
// Message Callback for 'request-scenarios':

const mqttClient = MQTT.connect(brokerUrl, {
                username: brokerUsername,
                password: brokerPassword
});

mqttClient.on("connect",function() {
    console.log("< [Sim-Server] mqtt-client connected  " + mqttClient.connected);
    mqttClient.subscribe([`${mqttRoot}/visualization/#`]);

    sendAvailableScenarios(scenarioPath);
});

mqttClient.on("message", (topic, message) => {
    let [project, version, entity, id, ...args] = topic.split('/');
    console.log(`!!! [sim-server] ${entity}/${id}/${args.join('/')}: ${message}`);
    let topicShort =  `${entity}/${id}/${args.join('/')}`;
    if(matchTopic('visualization/+/scenario/request', topicShort)) {

        sendAvailableScenarios(scenarioPath);
    }
    else if(matchTopic('visualization/+/scenario/start', topicShort)) {
        console.log("!!! [SIM_SERVER] received start-scenario " + message);
        //TODO check if scenario exists?
        // cancel current missions!!
        try {
            reloadScenario(JSON.parse(message));
        }
        catch (e) {
            console.error("[Sim-server] could not parse scenario name from ../scenario/start message");
        }
    }
});

function matchTopic(pattern, topic) {
    return mqttMatch(pattern, topic);
}

function sendAvailableScenarios(directory) {
    console.log(`Send Avail Scenarios is called:`)
    console.log(`${__dirname} -- ${directory}`)
    const testFolder = path.join(__dirname, `${directory}`);
    console.log(`${testFolder}`)
    const fs = require('fs');

    console.log(`Send Avail Scenarios is called: ${testFolder}`)
    fs.readdir(testFolder, (err, files) => {
        if(err) {
            mqttClient.publish(`${mqttRoot}/error/no-scenarios`, "The scenarios could not be loaded.");
        }
        else {
            let scenarios = new Object();
            files.forEach(file => {
                scenarios[file.slice(0, -3)] = false;

            });
            scenarios[defaultScenario] = true;
            mqttClient.publish(`${mqttRoot}/visualization/scenario/update`, JSON.stringify(scenarios));
        }
    });
};

function reloadScenario(scenarioName) {
    //TODO jeweils stop(), overwrite scenario & start() mit dem neuen scenario
    let scenario = require(scenarioPath + scenarioName);


    hubSimulator.reload(scenario);
    droneSimulator.reload(scenario);
    carSimulator.reload(scenario);
    busSimulator.reload(scenario);
    parcelSimulator.reload(scenario);


//    TODO notify opt_engine to delete everything
//    TODO notify vue / vuex to delete everything
}


