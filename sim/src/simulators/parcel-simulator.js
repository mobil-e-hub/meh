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
        // this.start();
    }

    init() {
        this.parcels = Object.assign({}, ...Object.values(this.scenario.entities.parcels).map(p => {
            let id = _.cloneDeep(p.id) || uuid();
            let carrier = _.cloneDeep(p.carrier);
            let destination = _.cloneDeep(p.destination);
            let newParcel = new Parcel(id, carrier, destination)

            return {[id]: newParcel};
        }));
    }

    stop() {
        this.parcels = {};
    }

    test() {
        // TODO rolled back addition of parcels with random hubs on test message, because of:
        //      - send placed message again for parcels that were already in delivery (carried by entity) -> led to new mission
        //      - carrier hub could also be a hub without drones
        //      - random uuid if none given in scenario: not saved here -> parcel placed at 'h02' while it actually had a random uuid
        // if (_.isEmpty(this.parcels) || !Object.values(this.parcels).some(p => p.carrier.type == 'hub')) {
        //     let randomHubs = _.sampleSize(Object.keys(this.scenario.entities.hubs), 2);
        //     let id = uuid();
        //     this.parcels[id] = new Parcel(id,{type: 'hub', id: randomHubs[0]}, {type: 'hub', id: randomHubs[1]});
        //     this.publish(`parcel/${id}`, 'state', this.parcels[id]),
        //             // start delivery mission
        //     this.publish(`parcel/${id}`, 'placed', this.parcels[id])  //
        // }
        // else {
        for (const [id, parcel] of Object.entries(this.parcels)) {
            // add parcel to viz/opt
            this.publish(`parcel/${id}`, 'state', parcel),
                // start delivery mission
            this.publish(`parcel/${id}`, 'placed', parcel)  //
        }
        // }
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
            if (parcel != null) {
                parcel.carrier = message;

                this.publish(`parcel/${parcel.id}`, 'state', parcel);
                if (_.isEqual(parcel.carrier, parcel.destination)) {
                    this.publish(`parcel/${parcel.id}`, 'delivered', parcel);
                    delete this.parcels[parcel.id];
                }
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
