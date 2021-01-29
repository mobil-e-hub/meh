// External modules

// Internal modules
const { random, uuid } = require('../helpers');
const MQTTClient = require('../mqtt-client');
const Hub = require('../models/hub');

module.exports = class HubSimulator extends MQTTClient {
    constructor(numberOfHubs) {
        super('hub-simulator', ['to/hub/#', 'from/visualization/#']);

        this.numberOfHubs = numberOfHubs;
        this.hubs = { };
    }

    start() {
        this.init();

        for (const [id, hub] of Object.entries(this.hubs)) {
            this.publishFrom(`hub/${id}`, 'state', hub);
        }
    }

    stop() {
        this.hubs = { };
    }

    init() {
        this.hubs = Object.assign({}, ...Array.from({ length: this.numberOfHubs }).map(() => {
            let id = uuid();
            return { [id]: new Hub(id, random.position(100)) };
        }));

        console.log(this.hubs);
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (topic.direction === 'from' && topic.entity === 'visualization') {
            if (['start', 'stop'].includes(topic.rest)) {
                this[topic.rest]();
            }
        }
    }
};
