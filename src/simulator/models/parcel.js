// External modules

module.exports = class Parcel {
    constructor(id, source, destination) {
        this.id = id;
        this.carrier = { type: 'hub', id: source };
        this.destination = { type: 'hub', id: destination };
    }

    reset() {

    }
};
