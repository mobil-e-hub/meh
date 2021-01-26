// Internal modules
const Parcel = require('./parcel.js');

module.exports = class Order {
    constructor(source, destination) {
        this.state = 'placed';
        this.parcel = new Parcel(source, destination);
    }

    reset() {
        this.state = 'placed';
        this.parcel.reset();
    }
};
