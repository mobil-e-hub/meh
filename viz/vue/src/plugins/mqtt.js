// External modules
const mqtt = require('mqtt');
const mqttMatch = require('mqtt-match');
const _ = require('lodash');
const { v4: UUID } = require('uuid');

// Internal modules

// Plugin definition
export default {
    install: (app, options) => {
        const id = uuid();
        const client = mqtt.connect(options.broker);
        const subscriptions = {};
        client.on('connect', () => {
            client.subscribe(`${options.root}/#`);
        });
        client.on('message', (topic, message) => {
            let [project, version, direction, entity, id, ...args] = topic.split('/');
            topic = { version, direction, entity, id, args, rest: args.join('/'), string: { long: topic, short: `${direction}/${entity}/${id}/${args.join('/')}` } };
            message = JSON.parse(message.toString());

            for (const [pattern, handler] of Object.entries(subscriptions)) {
                if (mqttMatch(pattern, topic.string.short)) {
                    handler(topic, message, { timestamp: Date.now() });
                }
            }
        });

        app.prototype.$mqtt = {
            broker: options.broker,
            root: options.root,
            publish: (topic, message='', sender=`from/visualization/${id}`) => {
                client.publish(`${options.root}/${sender}/${topic}`, JSON.stringify(message));
            },
            subscribe: (topic, handler) => {
                subscriptions[topic] = handler;
            },
            unsubscribe: (topic) => {
                delete subscriptions[topic];
            }
        };
    }
}

// Helper functions
function uuid() {
    return UUID().substr(0, 8);
}
