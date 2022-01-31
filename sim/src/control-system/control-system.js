// External modules

// Internal modules
const MQTTClient = require('../mqtt-client');


module.exports = class ControlSystem extends MQTTClient {
    constructor() {
        super('control-system', ['control-system/#', 'parcel/+/placed', 'parcel/+/delivered', 'visualization/#', 'order/+/placed']);

    }

    async receive(topic, message) {
        super.receive(topic, message);

        if (this.matchTopic(topic, 'order/+/placed')) {
            // When an order comes in (from the Orchestrator), start dummy simulation
            // which returns three status updates over the next 15 seconds, ending with delivery
            await startDummyDeliverySimulation(topic, message);
        }
    } 
};

async function startDummyDeliverySimulation(topic, message) {
    // Dummy simulation: 
    // - Wait 5 seconds
    // - Send status update
    // - Wait 5 seconds
    // - Send status update
    // - Wait 5 seconds
    // - Send status update (delivered)

    const parcel = {
        id: message.transportId,
        carrier: message.address.platformId,
        state: 'WaitingForTransport'
    }

    await sleep(5000);
    this.publish(`parcel/${parcel.id}`, 'status', parcel);

    await sleep(5000);
    parcel.state = 'InTransport';
    this.publish(`parcel/${parcel.id}`, 'status', parcel);

    await sleep(5000);
    parcel.state = 'Delivered';
    this.publish(`parcel/${parcel.id}`, 'status', parcel);
}
  
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}