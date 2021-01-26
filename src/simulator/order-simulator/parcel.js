// External modules
const { v4: uuid } = require('uuid');

module.exports = class Parcel {
    constructor(source, destination) {
        this.id = uuid();
        this.position = source;
        this.destination = destination;
    }

    reset() {

    }
};
