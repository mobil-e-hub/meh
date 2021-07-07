// External modules

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const { Drone, DroneState, TaskState} = require('../models/drone');

const topology = require('../../assets/topology');

// Class
module.exports = class DroneSimulator extends MQTTClient {
    constructor(numberOfDrones) {
        super('drone-simulator', ['to/drone/#', 'from/visualization/#']);

        this.numberOfDrones = numberOfDrones;
        this.drones = { };

        this.timer = null;
        this.interval = 100;

        this.transactionTopics = { };       // TODO was macht das??
    }

    start() {
        if (this.timer) {
            clearInterval(this.timer);
        }

        this.init();
        this.timer = setInterval(this.moveDrones, this.interval);
    }

    pause() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    resume() {
        if (!this.timer) {
            this.timer = setInterval(this.moveDrones, this.interval);
        }
        for (const [id, drone] of Object.entries(this.drones)) {
            this.publishFrom(`drone/${id}`, 'state', drone);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        this.drones = { };
    }

    init() {
        this.drones = Object.assign({}, ...Array.from({ length: this.numberOfDrones }).map(() => {
            let id = uuid();
            // TODO changed position of new drones to be only spawned at hubs --> clarify again
            // return { [id]: new Drone(id, random.position())};
            // return { [id]: new Drone(id, random.position(), { id: uuid(), items: [{ type: 'fly', destination: random.position(), minimumDuration: 10 }] }) };
            return { [id]: new Drone(id, random.value(random.droneHubs()).position, { id: uuid(), items: [{ type: 'fly', destination: random.value(random.droneHubs()).position, minimumDuration: 10 }] }) };
        }));
        for (const [id, drone] of Object.entries(this.drones)) {
            this.publishFrom(`drone/${id}`, 'state', drone);
        }
    }

    reset() {
        this.stop();
        this.start();
    }

    //TODO remove function & remove topic from receive
    test_init() {
        this.drones = { d00: new Drone('d00', { x: -50, y: 60, z: 0 }), d01: new Drone('d01', { x: -60, y: -60, z: 0 }), d02: new Drone('d02', { x: 60, y: 0, z: 0 }) };
        this.resume(); //side-effect: also starts app -> sets timer!
    }

    moveDrones = () => {
        for (const [id, drone] of Object.entries(this.drones)) {
            if (drone.move(this.interval / 1000, this)) {
                this.publishFrom(`drone/${id}`, 'state', drone);
            }
        }
    };

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'from/visualization/#')) {
            if (['start', 'pause', 'resume', 'stop', 'reset'].includes(topic.rest)) {
                this[topic.rest]();
            }
        }
        //TODO remove
        else if (this.matchTopic(topic, '+/+/+/test_init')) {
            this.test_init();
        }
        else if (this.matchTopic(topic, 'to/drone/+/mission')) {
            this.drones[topic.id].setMission(message, this);
        }
        else if (this.matchTopic(topic, 'to/drone/+/transaction/+/ready')) {
            // This message is only received if the drone is the transaction's "from" instance
            let transaction = this.drones[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
            transaction.ready = true;
        }
        else if (this.matchTopic(topic, 'to/drone/+/transaction/+/execute')) {
            // This message is only received if the drone is the transaction's "to" instance and has already sent the "ready" message
            this.drones[topic.id].completeTransaction(this);
        }
        else if (this.matchTopic(topic, 'to/drone/+/transaction/+/complete')) {
            // This message is only received if the drone is the transaction's "from" instance and has already sent the "execute" message
            this.drones[topic.id].completeTask(this);
        }
    }

    getIdleDrones() {
        return Object.fromEntries(Object.entries(this.drones).filter(d => d[1]['state'] === 0))
    }
};
