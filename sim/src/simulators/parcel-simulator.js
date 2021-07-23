// External modules
const _ = require('lodash');

// Internal modules
const MQTTClient = require('../mqtt-client');
const {random, uuid} = require('../helpers');
const Parcel = require('../models/parcel');

module.exports = class ParcelSimulator extends MQTTClient {
    constructor(hubSimulator) {
        super('parcel-simulator', ['to/parcel/#', 'from/visualization/#']);

        this.parcels = {};
        this.hubSimulator = hubSimulator;
    }

    resume() {
        for (const [id, parcel] of Object.entries(this.parcels)) {
            this.publishFrom(`parcel/${id}`, 'state', parcel);
        }
    }

    stop() {
        this.parcels = {p00: new Parcel('p00', {type: 'hub', id: 'h00'}, {type: 'hub', id: 'h01'})};
    }

    //TODO remove function & remove topic from receive
    test_init() {
        this.parcels = {p00: new Parcel('p00', {type: 'hub', id: 'h00'}, {type: 'hub', id: 'h01'})};
    }

    receive(topic, message) {
        super.receive(topic, message);

        //TODO remove
        if (this.matchTopic(topic, '+/+/+/test_init')) {
            this.test_init();
        } else if (topic.direction === 'from') {
            if (topic.entity === 'visualization') {
                if (topic.rest === 'stop') {
                    this.stop();
                } else if (topic.rest === 'place-order') {
                    let id = uuid();
                    this.publishFrom(`order/${id}`, 'placed');
                } else if (topic.rest === 'place-parcel') {
                    // let orderId = uuid();
                    let id = uuid();
                    // let [source, destination] = random.keys(this.hubSimulator.hubs, 2);
                    // this.orders[orderId] = new Order(source, destination);
                    this.parcels[id] = new Parcel(id, message.carrier, message.destination);

                    // this.publishFrom(`order/${id}`, 'state', this.orders[id]);
                    this.publishFrom(`parcel/${id}`, 'placed', this.parcels[id]);
                    this.publishFrom(`parcel/${id}`, 'state', this.parcels[id]);
                }
            }
        } else {
            if (topic.entity === 'parcel') {
                if (topic.rest === 'pickup') {
                    let parcel = this.parcels[topic.id];
                    parcel.carrier = message;
                    this.publishFrom(`parcel/${parcel.id}`, 'state', parcel);
                } else if (topic.rest === 'dropoff') {
                    let parcel = this.parcels[topic.id];
                    parcel.carrier = message;
                    this.publishFrom(`parcel/${parcel.id}`, 'state', parcel);
                }
            }
        }
        if (this.matchTopic(topic, 'to/parcel/+/transfer')) {
            let parcel = this.parcels[topic.id];
            parcel.carrier = message;

            this.publishFrom(`parcel/${parcel.id}`, 'state', parcel);
            if (_.isEqual(parcel.carrier, parcel.destination)) {
                this.publishFrom(`parcel/${parcel.id}`, 'delivered', parcel);
            }
        }
    }

};
