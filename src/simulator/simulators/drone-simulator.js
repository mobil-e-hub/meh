// External modules

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const Drone = require('../models/drone');

const DroneState = {
    idle: 0,
    flying: 1,
    waitingForTransaction: 2,
    charging: 3
};

const TaskState = {
    notStarted: 0,
    ongoing: 1,
    waitingForTransaction: 2,
    executingTransaction: 3,
    completed: 4
};

// Class
module.exports = class DroneSimulator extends MQTTClient {
    constructor(numberOfDrones) {
        super('drone-simulator', ['to/drone/#', 'from/visualization/#']);

        this.numberOfDrones = numberOfDrones;
        this.drones = { };

        this.timer = null;
        this.interval = 100;

        this.transactionTopics = { };
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
            return { [id]: new Drone(id, random.position(), { id: uuid(), items: [{ type: 'fly', destination: random.position(), minimumDuration: 10 }] }) };
        }));
        for (const [id, drone] of Object.entries(this.drones)) {
            this.publishFrom(`drone/${id}`, 'state', drone);
        }
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
            if (['start', 'pause', 'resume', 'stop'].includes(topic.rest)) {
                this[topic.rest]();
            }
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
};
