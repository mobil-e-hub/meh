// External modules


const ParcelState = {
    transportCreated: 0,
    waitingForTransport: 1,
    inTransport_InAir: 2,
    inTransport:3,
    delivered:4,
    completed:5,
    cancelled:6,
    failed:7
}

module.exports = class Parcel {
    constructor(id, carrier, destination, state=ParcelState.transportCreated) {
        this.id = id;
        this.carrier = carrier;
        this.destination = destination;
    }

    reset() {
    }
};
