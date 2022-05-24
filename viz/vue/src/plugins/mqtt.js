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
        const client = mqtt.connect(options.broker, {
                username: options.username,
                password: options.password
            });
        const subscriptions = {};
        console.log(`Vue-app: ATTEMPT: connected to broker ${options.broker} with root ${options.root}.`)
        client.on('connect', () => {
            console.log(`Vue-app: connected to broker ${options.broker} with root ${options.root}.`)
            client.subscribe(`${options.root}/#`);
        });
        client.on('message', (topic, message) => {
            let [project, version, entity, id, ...args] = topic.split('/');
            topic = { version, entity, id, args, rest: args.join('/'), string: { long: topic, short: `${entity}/${id}/${args.join('/')}` } };
            try {
                message = JSON.parse(message.toString());
            } catch (e) {
                console.error(e)
                message = ""
            }

            // console.log(`Vue-app: RECEIVED MSG: short -> ${topic.string.short}.`)

            for (const [pattern, handler] of Object.entries(subscriptions)) {
                if (mqttMatch(pattern, topic.string.short)) {
                    handler(topic, message, { timestamp: Date.now() });
                }
            }
        });

        app.prototype.$mqtt = {
            broker: options.broker,
            root: options.root,
            publish: (topic, message='', sender=`visualization/${id}`) => {
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
