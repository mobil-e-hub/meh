// External modules

// Internal modules

const MQTTClient = require('../mqtt-client');
const { random, uuid } = require('../helpers');
const EventGridClient = require('../eventgrid-client');
const Hub = require('../models/hub');

const topology = require('../../assets/topology');

module.exports = class HubSimulator extends MQTTClient {
    constructor(eventGrid, numberOfHubs) {
        super('hub-simulator', eventGrid);

        this.subscribe('visualization/#', this.handleCommand.bind(this));
        this.subscribe('hub/+/mission', this.handleMission.bind(this));
        this.subscribe('hub/+/transaction/+/ready', this.handleTransactionReady.bind(this));
        this.subscribe('hub/+/transaction/+/execute', this.handleTransactionExecute.bind(this));
        this.subscribe('hub/+/transaction/+/complete', this.handleTransactionComplete.bind(this));

        this.numberOfHubs = numberOfHubs;
        this.hubs = { };

        this.reset();
    }

    start() {
        for (const [id, hub] of Object.entries(this.hubs)) {
            this.publish('state', hub, `hub/${id}`);
        }
    }

    stop() {

    }

    reset() {
        this.hubs = Object.assign({}, ...Array.from({ length: this.numberOfHubs }).map(() => {
            let id = uuid();
            return { [id]: new Hub(id, random.key(topology.nodes)) };
        }));
    }

    handleCommand(topic, message) {
        if (['start', 'stop', 'reset'].includes(topic.rest)) {
            this[topic.rest]();
        }
    }

    handleMission(topic, message) {
        let hub = this.hubs[topic.id];
        let transaction = message.tasks[0].transaction;

        hub.transactions[transaction.id] = transaction;
        if (transaction.to.id === hub.id) {
            this.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
        }
    }

    handleTransactionReady(topic, message) {
        // This message is only received if the hub is the transaction's "from" instance
        let hub = this.hubs[topic.id];
        let transaction = hub.transactions[topic.args[1]];

        this.publishTo(`${transaction.to.type}/${transaction.to.id}`, `transaction/${transaction.id}/execute`);
        this.publishTo(`parcel/${transaction.parcel}`, 'transfer', transaction.to);
    }

    handleTransactionExecute(topic, message) {
        // This message is only received if the hub is the transaction's "to" instance and has already sent the "ready" message
        let hub = this.hubs[topic.id];
        let transaction = hub.transactions[topic.args[1]];

        hub.parcels[transaction.parcel] = transaction.parcel;
        this.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);
        delete hub.transactions[topic.args[1]];

        this.publishFrom(`hub/${hub.id}`, 'state', hub);
    }

    handleTransactionComplete(topic, message) {
        // This message is only received if the hub is the transaction's "from" instance and has already sent the "execute" message
        let hub = this.hubs[topic.id];
        let transaction = hub.transactions[topic.args[1]];

        delete hub.transactions[transaction.id];
        delete hub.parcels[transaction.parcel];

        this.publishFrom(`hub/${hub.id}`, `transaction/${transaction.id}/complete`);
        this.publishFrom(`hub/${hub.id}`, 'state', hub);
    }
};
