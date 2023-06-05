// External modules

// Internal modules
// const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const { Drone, DroneState, TaskState} = require('../models/drone');

// Class
module.exports = class DroneSimulator extends MQTTClient {

    constructor(scenario) {
        super('drone-simulator', ['drone/#', 'visualization/#']);

        this.scenario = scenario;
        this.drones = { };

        this.timer = null;
        this.interval = 100;
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
            this.publish(`drone/${id}`, 'state', drone);
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
        this.drones = Object.assign({}, ...Object.values(this.scenario.entities.drones).map(drone => {
            let id = drone.id;
            //let id = drone.id || uuid();
            let position = drone.position;
            //let position = drone.position || random.droneHub().position;

            // return { [id]: new Drone(id, random.position())};
            // return { [id]: new Drone(id, random.position(), { id: uuid(), items: [{ type: 'fly', destination: random.position(), minimumDuration: 10 }] }) };
            return { [id]: new Drone(id, position)};  //{ id: uuid(), items: [{ type: 'fly', destination: random.droneHub().position, minimumDuration: 10 }] }) };
        }));
        for (const [id, drone] of Object.entries(this.drones)) {
            this.publish(`drone/${id}`, 'state', drone);
        }
    }

    reset() {
        this.stop();
        this.start();
    }

    moveDrones = () => {
        for (const [id, drone] of Object.entries(this.drones)) {
            if (drone.move(this.interval / 1000, this)) {
                this.publish(`drone/${id}`, 'state', drone);
            }
        }
    };

    receive(topic, message) {
        super.receive(topic, message);

        try {
            if (this.matchTopic(topic, 'visualization/#')) {
                if (['start', 'pause', 'resume', 'stop', 'reset'].includes(topic.rest)) {
                    this[topic.rest]();
                }
            }
            else if (this.matchTopic(topic, 'drone/+/mission')) {
                try {
                    this.publish(`drone/${topic.id}`, 'error', this.drones)
                    this.drones[topic.id].setMission(message, this);
                } catch (err) {
                    console.log(`-- Could not assign missions to Drone ${topic.id}: err.message`)
                    this.publish(`drone/${topic.id}`, 'error', `Could not assign missions to Drone ${topic.id}`)
                }
            } else if (this.matchTopic(topic, 'drone/+/transaction/+/ready')) {
                // This message is only received if the drone is the transaction's "from" instance
                let transaction = this.drones[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
                transaction.ready = true;
            } else if (this.matchTopic(topic, 'drone/+/transaction/+/unready')) {
                // This message is only received if the drone is the transaction's "from" instance
                let transaction = this.drones[topic.id].mission.tasks.find(t => t.transaction && t.transaction.id === topic.args[1]).transaction;
                transaction.ready = false;
            } else if (this.matchTopic(topic, 'drone/+/transaction/+/execute')) {
                // This message is only received if the drone is the transaction's "to" instance and has already sent the "ready" message
                this.drones[topic.id].completeTransaction(this);
            } else if (this.matchTopic(topic, 'drone/+/transaction/+/complete')) {
                // This message is only received if the drone is the transaction's "from" instance and has already sent the "execute" message
                this.drones[topic.id].completeTask(this);
            }
        }
        catch (err) {
            // console.log(`-- Caught Error: Drone/${topic.id} - ${err.message}`)
            this.publish(`drone/${topic.id}`, 'error', err.message)
        }
    }

    updateDroneState(id) {
        let drone = this.drones[id];
        this.publish(`drone/${id}`, 'state', drone);
    }
};
