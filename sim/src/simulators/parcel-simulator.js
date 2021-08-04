// External modules
const _ = require('lodash');

// Internal modules
const MQTTClient = require('../mqtt-client');
const {random, uuid} = require('../helpers');
const Parcel = require('../models/parcel');

module.exports = class ParcelSimulator extends MQTTClient {
    constructor(scenario) {
        super('parcel-simulator', ['to/parcel/#', 'from/visualization/#']);

        this.parcels = {};
        this.scenario = scenario;
    }

    resume() {
        for (const [id, parcel] of Object.entries(this.parcels)) {
            this.publishFrom(`parcel/${id}`, 'state', parcel);
        }
    }

    start() {
        this.init();
        this.resume();
    }

    reset() {
        this.stop();
        this.start();
    }

    init() {
        this.parcels = Object.assign({}, ...Object.values(this.scenario.entities.parcels).map(p => {
            let id = p.id || uuid();
            let carrier = p.destination;
            let destination = p.carrier;
            let newParcel = new Parcel(id, carrier, destination)

            return {[id]: newParcel};
        }));
    }

    stop() {
        this.parcels = {};
    }

    test() {
        for (const [id, parcel] of Object.entries(this.parcels)) {
            this.publishFrom(`parcel/${id}`, 'state', parcel),
            this.publishFrom(`parcel/${id}`, 'placed', parcel)

        }
    }

    receive(topic, message) {
        super.receive(topic, message);
        if (topic.direction === 'from') {
            if (topic.entity === 'visualization') {
                if (['start', 'stop', 'reset', 'test'].includes(topic.rest)) {
                    this[topic.rest]();
                } else if (topic.rest === 'place-order') {
                    let id = uuid();
                    this.publishFrom(`order/${id}`, 'placed');
                } else if (topic.rest === 'place-parcel') {
                    // let orderId = uuid();
                    let id = uuid();
                    // let [source, destination] = random.keys(this.hubSimulator.hubs, 2);
                    // this.orders[orderId] = new Order(source, destination);

                    // this.publishFrom(`order/${id}`, 'state', this.orders[id]);
                    this.placeParcel(id, message.carrier, message.destination);
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

    placeParcel(id, carrier, destination) {
        this.parcels[id] = new Parcel(id, carrier, destination);

        this.publishFrom(`parcel/${id}`, 'placed', this.parcels[id]);
        this.publishFrom(`parcel/${id}`, 'state', this.parcels[id]);

        return {[id]: this.parcels[id]};
    }


};
