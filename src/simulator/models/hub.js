module.exports = class Hub {
    constructor(id, position) {
        this.id = id;
        this.position = position;
        this.transactions = { };
        this.parcels = { };
    }
};
