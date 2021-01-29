// External modules
const MQTT = require('mqtt');
const _ = require('lodash');

// Internal modules
const { random, uuid } = require('../helpers');

module.exports = class ControlSystem {
    constructor(droneSimulator, vehicleSimulator, hubSimulator, parcelSimulator) {
        this.mqtt = {
            client: MQTT.connect('ws://broker.hivemq.com:8000/mqtt'),
            root: 'mobil-e-hub/v1',
            id: uuid()
        };

        this.mqtt.client.on('connect', () => {
            this.mqtt.client.subscribe(`${this.mqtt.root}/from/parcel/#`);

            this.publish('connected');
        });

        this.mqtt.client.on('message', (topic, message) => {
            let [project, version, direction, entity, id, ...rest] = topic.split('/');
            this.receive({ version, direction, entity, id, rest }, JSON.parse(message.toString()));
        });

        this.droneSimulator = droneSimulator;
        this.vehicleSimulator = vehicleSimulator;
        this.hubSimulator = hubSimulator;
        this.parcelSimulator = parcelSimulator;
    }

    destructor() {
        this.mqtt.client.end();
    }

    publishFrom(sender, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [ControlSystem] from/${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    publish(topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/from/control-system/${this.mqtt.id}/${topic}`, JSON.stringify(message));
        console.log(`< [ControlSystem] from/control-system/${this.mqtt.id}/${topic}: ${JSON.stringify(message)}`);
    }

    publishTo(receiver, topic, message = '') {
        this.mqtt.client.publish(`${this.mqtt.root}/to/${receiver}/${topic}`, JSON.stringify(message));
        console.log(`< [ControlSystem] to/${receiver}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [ControlSystem] ${topic.direction}/${topic.entity}/${topic.id}/${topic.rest}: ${JSON.stringify(message)}`);

        if (topic.direction === 'from' && topic.entity === 'parcel' && topic.rest[0] === 'placed') {
            // New parcel detected
            this.assignParcelToDrone(message);
        }
    }

    assignParcelToDrone(parcel) {
        let sourceHub = this.hubSimulator.hubs[parcel.carrier.id];
        let destinationHub = this.hubSimulator.hubs[parcel.destination.id];
        let drone = random.value(this.droneSimulator.drones);
        let tasks = [
            {
                type: 'fly',
                target: _.clone(sourceHub.position),
                minimumDuration: 10
            },
            {
                type: 'pickup',
                parcelId: parcel.id,
                fromCarrier: { type: 'hub', id: sourceHub.id },
                minimumDuration: 5
            },
            {
                type: 'fly',
                target: _.clone(destinationHub.position),
                minimumDuration: 10
            },
            {
                type: 'dropoff',
                parcelId: parcel.id,
                toCarrier: { type: 'hub', id: destinationHub.id },
                minimumDuration: 5
            }
        ];
        this.publishTo(`drone/${drone.id}`, 'tasks', tasks);
    }
};
