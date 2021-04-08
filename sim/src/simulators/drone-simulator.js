// External modules

// Internal modules
const { random, uuid } = require('../helpers');
const EventGridClient = require('../eventgrid-client');
const { Drone, DroneState, TaskState} = require('../models/drone');

const topology = require('../../assets/topology');

// Class
module.exports = class DroneSimulator extends EventGridClient {
    constructor(eventGrid, numberOfDrones) {
        super('drone-simulator', eventGrid);

        this.subscribe('visualization/#', this.handleCommand.bind(this));
        this.subscribe('drone/+/mission', this.handleMission.bind(this));
        this.subscribe('drone/+/transaction/+/ready', this.handleTransactionReady.bind(this));
        this.subscribe('drone/+/transaction/+/execute', this.handleTransactionExecute.bind(this));
        this.subscribe('drone/+/transaction/+/complete', this.handleTransactionComplete.bind(this));


        this.numberOfDrones = numberOfDrones;
        this.drones = { };

        this.timer = null;
        this.interval = 100;

        this.reset();
    }

    start() {
        if (!this.timer) {
            this.timer = setInterval(this.moveDrones, this.interval);
        }
        for (const [id, drone] of Object.entries(this.drones)) {
            this.publish('state', drone, `drone/${id}`);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    reset() {
        this.drones = Object.assign({}, ...Array.from({ length: this.numberOfDrones }).map(() => {
            let id = uuid();
            // TODO changed position of new drones to be only spawned at hubs --> clarify again
            // return { [id]: new Drone(id, random.position())};
            // return { [id]: new Drone(id, random.position(), { id: uuid(), items: [{ type: 'fly', destination: random.position(), minimumDuration: 10 }] }) };
            return { [id]: new Drone(id, random.value(random.droneHubs()).position, { id: uuid(), items: [{ type: 'fly', destination: random.value(random.droneHubs()).position, minimumDuration: 10 }] }) };
        }));
    }

    handleCommand(topic, message) {
        if (['start', 'stop', 'reset'].includes(topic.rest)) {
            this[topic.rest]();
        }
    }

    handleMission(topic, message) {
        this.drones[topic.id].setMission(message, this);
    }

    handleTransactionReady(topic, message) {
        // This message is only received if the drone is the transaction's "from" instance
        let transaction = this.drones[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
        transaction.ready = true;
    }

    handleTransactionExecute(topic, message) {
        // This message is only received if the drone is the transaction's "to" instance and has already sent the "ready" message
        this.drones[topic.id].completeTransaction(this);
    }

    handleTransactionComplete(topic, message) {
        // This message is only received if the drone is the transaction's "from" instance and has already sent the "execute" message
        this.drones[topic.id].completeTask(this);
    }

    moveDrones = () => {
        for (const [id, drone] of Object.entries(this.drones)) {
            if (drone.move(this.interval / 1000, this)) {
                this.publishFrom(`drone/${id}`, 'state', drone);
            }
        }
    };

    getIdleDrones() {
        return Object.fromEntries(Object.entries(this.drones).filter(d => d[1]['state'] === 0))
    }
};
