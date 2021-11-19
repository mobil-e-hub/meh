// External modules
const _ = require('lodash');

// Internal modules
const {random, uuid} = require('../helpers');
const MQTTClient = require('../mqtt-client');
const Hub = require('../models/hub');

module.exports = class HubSimulator extends MQTTClient {

    constructor(scenario) {
        super('hub-simulator', ['hub/#', 'visualization/#', "parcel/+/placed"]);

        this.scenario = scenario;
        this.hubs = {};
    }

    start() {
        this.init();

        for (const [id, hub] of Object.entries(this.hubs)) {
            this.publish(`hub/${id}`, 'state', hub);
        }
    }

    resume() {
        for (const [id, hub] of Object.entries(this.hubs)) {
            this.publish(`hub/${id}`, 'state', hub);
        }
    }

    stop() {
        this.hubs = {};
    }

    init() {
        this.hubs = Object.assign({}, ...Object.values(this.scenario.entities.hubs).map(hub => {
            let id = _.cloneDeep(hub.id) || uuid();
            let position = _.cloneDeep(hub.position) || random.key(this.scenario.topology.nodes);
            return {[id]: new Hub(id, position)};
        }));
    }

    reset() {
        this.stop();
        this.start();
    }

    reload(scenario) {
        this.stop();
        this.scenario = scenario;
        this.start()
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'visualization/#')) {
            if (['start', 'stop', 'reset'].includes(topic.rest)) {
                this[topic.rest]();
            }
        }

        else if (this.matchTopic(topic, 'hub/+/mission')) {

            let hub = this.hubs[topic.id];
            let transaction = message.tasks[0].transaction;

            hub.transactions[transaction.id] = transaction;
            if (transaction.to.id === hub.id) {
                this.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            }
        } else if (this.matchTopic(topic, 'hub/+/transaction/+/ready')) {
            // This message is only received if the hub is the transaction's "from" instance
            let hub = this.hubs[topic.id];
            let transaction = hub.transactions[topic.args[1]];

            this.publish(`${transaction.to.type}/${transaction.to.id}`, `transaction/${transaction.id}/execute`);
            this.publish(`parcel/${transaction.parcel}`, 'transfer', transaction.to);
        } else if (this.matchTopic(topic, 'hub/+/transaction/+/execute')) {
            // This message is only received if the hub is the transaction's "to" instance and has already sent the "ready" message
            let hub = this.hubs[topic.id];
            let transaction = hub.transactions[topic.args[1]];

            if(typeof transaction !== "undefined"){
                this.addParcelToHub(hub.id, transaction.parcel);
                this.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);
                delete this.hubs[topic.id].transactions[topic.args[1]];
            } else {
                this.publish(`hub/${hub.id}`, 'error', `No outstanding transaction ${topic.args[1]} in ${hub.id}.`);
            }
            this.publish(`hub/${hub.id}`, 'state', hub);
        } else if (this.matchTopic(topic, 'hub/+/transaction/+/complete')) {
            // This message is only received if the hub is the transaction's "from" instance and has already sent the "execute" message
            let hub = this.hubs[topic.id];
            let transaction = hub.transactions[topic.args[1]];

            if(typeof transaction !== "undefined" && transaction.id in hub.transactions) {
                delete hub.transactions[transaction.id];
            } else {
                this.publish(`hub/${hub.id}`, 'error', `Transaction not found.`);
            }
            (typeof transaction !== "undefined" && transaction.parcel in hub.parcels) ?
                delete hub.parcels[transaction.parcel] : this.publish(`hub/${hub.id}`, 'error', `Parcel not found in Hub ${hub.id}.`);

            this.publish(`hub/${hub.id}`, 'state', hub);
        } else if (this.matchTopic(topic, 'parcel/+/placed')) {
            let hubID = message.carrier.id;
            if (!this.hubs.hasOwnProperty(hubID)) {
                console.error(`Could not find carrier entity hub/${hubID} of parcel/${topic.id}`);
            }
            else {
                this.addParcelToHub(hubID, message);
            }

        } else if (this.matchTopic(topic, 'to/hub/test')) {
            console.log(`<<<<< HUB-SIMULATOR: RECEIVED MESSAGE: ${message} <<<<<<<<`)
        }

    }

    addParcelToHub(hubID, parcel) {
        let success = this.hubs[hubID].addParcel(parcel);
        if(success) {
            this.publish(`hub/${hubID}`, 'state', this.hubs[hubID]);
        }
        else {
            this.publish(`hub/${hubID}`, `error/capacity/exceeded/parcel/${parcel.id}`, this.hubs[hubID]);
        }
    }
};
