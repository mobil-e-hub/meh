// External modules

// Internal modules
const MQTTClient = require('../mqtt-client');
const { random, uuid } = require('../helpers');
const Parcel = require('../models/parcel');

module.exports = class ParcelSimulator extends MQTTClient {
    constructor(hubSimulator) {
        super('parcel-simulator', ['to/parcel/#', 'from/visualization/#']);

        this.parcels = {};
        this.hubSimulator = hubSimulator;
    }

    stop() {
        this.parcels = {};
    }

    receive(topic, message) {
        super.receive(topic, message);

        if (topic.direction === 'from') {
            if (topic.entity === 'visualization') {
                if (topic.rest === 'stop') {
                    this.stop();
                }
                else if (topic.rest === 'place-order') {
                    // let orderId = uuid();
                    let id = uuid();
                    let [source, destination] = random.keys(this.hubSimulator.hubs, 2);
                    // this.orders[orderId] = new Order(source, destination);
                    this.parcels[id] = new Parcel(id, source, destination);

                    // this.publishFrom(`order/${id}`, 'state', this.orders[id]);
                    this.publishFrom(`parcel/${id}`, 'placed', this.parcels[id]);
                    this.publishFrom(`parcel/${id}`, 'state', this.parcels[id]);
                }
            }
        }
        else {
            if (topic.entity === 'parcel') {
                if (topic.rest === 'pickup') {
                    let parcel = this.parcels[topic.id];
                    parcel.carrier = message;
                    this.publishFrom(`parcel/${parcel.id}`, 'state', parcel);
                }
                else if (topic.rest === 'dropoff') {
                    let parcel = this.parcels[topic.id];
                    parcel.carrier = message;
                    this.publishFrom(`parcel/${parcel.id}`, 'state', parcel);
                }
            }
        }
    }
};
