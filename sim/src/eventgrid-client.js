// External modules
const MQTT = require('mqtt');
const mqttMatch = require('mqtt-match');

// Internal modules
const { random, uuid } = require('./helpers');


module.exports = class EventGridClient {
    constructor(type, eventGrid) {
        this.type = type;
        this.id = uuid();
        this.eventGrid = eventGrid;
    }

    publish(topic, message = '', sender=`${this.type}/${this.id}`) {
        this.eventGrid.publish(`${sender}/${topic}`, JSON.stringify(message));
        console.log(`< [${this.type}/${this.id}] ${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    receive(topic, message) {
        console.log(`> [${this.type}/${this.id}] ${sender}/${topic}: ${JSON.stringify(message)}`);
    }

    subscribe(pattern, handler) {
        this.eventGrid.subscribe(pattern, handler);
    }

    unsubscribe(pattern, handler) {
        this.eventGrid.unsubscribe(pattern, handler);
    }
};
