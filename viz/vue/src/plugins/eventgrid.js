// External modules
const io = require('socket.io-client');
const mqttMatch = require('mqtt-match');

// Internal modules

// Plugin definition
export default {
    install: (app, options) => {
        const socket = io('localhost:3002'); // TODO: Add authentication for socket connections
        const subscriptions = { };

        socket.on('eventgrid', ({ topic, message }) => {
            for (const [pattern, handler] of Object.entries(subscriptions)) {
                if (mqttMatch(pattern, topic.string)) {
                    handler(topic, message, { timestamp: Date.now() });
                }
            }
        });

        app.prototype.$eventGrid = {
            publish: async (topic, message = '', sender = `${options.type}/${options.id}`) => {
                socket.emit('eventgrid', { topic: `${sender}/${topic}`, message });
            },
            subscribe: (pattern, handler) => {
                subscriptions[pattern] = handler;
            },
            unsubscribe: (pattern) => {
                delete subscriptions[pattern];
            }
        };
    }
}
