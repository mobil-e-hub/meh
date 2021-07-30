// External modules

// Internal modules
const {random, uuid} = require('../helpers');
const MQTTClient = require('../mqtt-client');
const Hub = require('../models/hub');

module.exports = class HubSimulator extends MQTTClient {
    constructor(scenario) {
        super('hub-simulator', ['to/hub/#', 'from/visualization/#']);

        this.scenario = scenario;
        this.hubs = {};
    }

    start() {
        this.init();

        for (const [id, hub] of Object.entries(this.hubs)) {
            this.publishFrom(`hub/${id}`, 'state', hub);
        }
    }

    resume() {
        for (const [id, hub] of Object.entries(this.hubs)) {
            this.publishFrom(`hub/${id}`, 'state', hub);
        }
    }

    stop() {
        this.hubs = {};
    }

    init() {
        this.hubs = Object.assign({}, ...Object.values(this.scenario.entities.hubs).map(hub => {
            let id = hub.id || uuid();
            let position = hub.position || random.key(this.scenario.topology.nodes);
            return {[id]: new Hub(id, position)};
        }));
    }

    reset() {
        this.stop();
        this.start();
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'from/visualization/#')) {
            if (['start', 'stop', 'reset'].includes(topic.rest)) {
                this[topic.rest]();
            }
        }
            // //TODO remove
            // else if (this.matchTopic(topic, '+/+/+/test_init')) {
            //     this.test_init();
        // }
        else if (this.matchTopic(topic, 'to/hub/+/mission')) {
            let hub = this.hubs[topic.id];
            let transaction = message.tasks[0].transaction;

            hub.transactions[transaction.id] = transaction;
            if (transaction.to.id === hub.id) {
                this.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            }
        } else if (this.matchTopic(topic, 'to/hub/+/transaction/+/ready')) {
            // This message is only received if the hub is the transaction's "from" instance
            let hub = this.hubs[topic.id];
            let transaction = hub.transactions[topic.args[1]];

            this.publishTo(`${transaction.to.type}/${transaction.to.id}`, `transaction/${transaction.id}/execute`);
            this.publishTo(`parcel/${transaction.parcel}`, 'transfer', transaction.to);
        } else if (this.matchTopic(topic, 'to/hub/+/transaction/+/execute')) {
            // This message is only received if the hub is the transaction's "to" instance and has already sent the "ready" message
            let hub = this.hubs[topic.id];
            let transaction = hub.transactions[topic.args[1]];
            this.addParcelToHub(hub.id, transaction.parcel);
            this.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);
            delete this.hubs[topic.id].transactions[topic.args[1]];

            this.publishFrom(`hub/${hub.id}`, 'state', hub);
        } else if (this.matchTopic(topic, 'to/hub/+/transaction/+/complete')) {
            // This message is only received if the hub is the transaction's "from" instance and has already sent the "execute" message
            let hub = this.hubs[topic.id];
            let transaction = hub.transactions[topic.args[1]];

            delete hub.transactions[transaction.id];
            delete hub.parcels[transaction.parcel];

            this.publishFrom(`hub/${hub.id}`, `transaction/${transaction.id}/complete`);
            this.publishFrom(`hub/${hub.id}`, 'state', hub);
        } else if (this.matchTopic(topic, 'to/hub/test')) {
            console.log(`<<<<< HUB-SIMULATOR: RECEIVED MESSAGE: ${message} <<<<<<<<`)
        }

    }

    addParcelToHub(hubID, parcel) {
        this.hubs[hubID].parcels[parcel] = parcel;
    }
};
