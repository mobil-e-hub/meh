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
            await this.startDummyDeliverySimulation(topic, message);
        }
    } 

    async startDummyDeliverySimulation(topic, message) {
        // Dummy simulation: 
        // - Wait 5 seconds
        // - Send status update
        // - Wait 5 seconds
        // - Send status update
        // - Wait 5 seconds
        // - Send status update (delivered)
        console.log('  Starting dummy simulation...');
    
        const parcel = {
            id: message.boxId,
            orderId: message.transportId,
            carrier: message.startLocation.platformId,
            state: 'WaitingForTransport'
        }
    
        await sleep(5000);
        this.publish(`parcel/${parcel.id}`, 'status', parcel);
    
        await sleep(5000);
        parcel.state = 'InTransport';
        this.publish(`parcel/${parcel.id}`, 'status', parcel);
    
        await sleep(5000);
        parcel.carrier = message.destinationLocation.platformId;
        parcel.state = 'Delivered';
        this.publish(`parcel/${parcel.id}`, 'status', parcel);
    
        console.log('  Dummy simulation finished!');
    }
}
  
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}