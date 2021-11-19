// External modules
const _ = require('lodash');

// Internal modules
const MQTTClient = require('../mqtt-client');
const {random, uuid} = require('../helpers');
const Parcel = require('../models/parcel');

module.exports = class ParcelSimulator extends MQTTClient {

    constructor(scenario) {
        super('parcel-simulator', ['parcel/#', 'visualization/#']);

        this.parcels = {};
        this.scenario = scenario;
    }

    resume() {
        for (const [id, parcel] of Object.entries(this.parcels)) {
            this.publish(`parcel/${id}`, 'state', parcel);
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

    reload(scenario) {
        this.stop();
        this.scenario = scenario;
        this.start();
    }

    init() {
        this.parcels = Object.assign({}, ...Object.values(this.scenario.entities.parcels).map(p => {
            let id = p.id || uuid();
            let carrier = p.carrier;
            let destination = p.destination;
            let newParcel = new Parcel(id, carrier, destination)

            return {[id]: newParcel};
        }));
    }

    stop() {
        this.parcels = {};
    }

    test() {
        for (const [id, parcel] of Object.entries(this.parcels)) {
            // add parcel to viz/opt
            this.publish(`parcel/${id}`, 'state', parcel),
            // start delivery mission
            this.publish(`parcel/${id}`, 'placed', parcel)  //

        }
    }

    receive(topic, message) {
        super.receive(topic, message);


        if (topic.entity === 'visualization') {
            if (['start', 'stop', 'reset', 'test'].includes(topic.rest)) {
                this[topic.rest]();
            } else if (topic.rest === 'place-order') {
                let id = uuid();
                this.publish(`order/${id}`, 'placed');
            } else if (topic.rest === 'place-parcel') {
                // let orderId = uuid();
                let id = uuid();
                // let [source, destination] = random.keys(this.hubSimulator.hubs, 2);
                // this.orders[orderId] = new Order(source, destination);

                // this.publishFrom(`order/${id}`, 'state', this.orders[id]);
                this.placeParcel(id, message.carrier, message.destination);
            }

        } else {
            if (topic.entity === 'parcel') {
                if (topic.rest === 'pickup') {
                    let parcel = this.parcels[topic.id];
                    parcel.carrier = message;
                    this.publish(`parcel/${parcel.id}`, 'state', parcel);
                } else if (topic.rest === 'dropoff') {
                    let parcel = this.parcels[topic.id];
                    parcel.carrier = message;
                    this.publish(`parcel/${parcel.id}`, 'state', parcel);
                }
            }
        }
        if (this.matchTopic(topic, 'parcel/+/transfer')) {
            let parcel = this.parcels[topic.id];
            parcel.carrier = message;

            this.publish(`parcel/${parcel.id}`, 'state', parcel);
            if (_.isEqual(parcel.carrier, parcel.destination)) {
                this.publish(`parcel/${parcel.id}`, 'delivered', parcel);
            }
        }
    }

    placeParcel(id, carrier, destination) {
        this.parcels[id] = new Parcel(id, carrier, destination);

        this.publish(`parcel/${id}`, 'placed', this.parcels[id]);
        this.publish(`parcel/${id}`, 'state', this.parcels[id]);

        return {[id]: this.parcels[id]};
    }
};
