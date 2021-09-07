module.exports = class Hub {
    constructor(id, position, capacity = 1000) {
        this.id = id;
        this.capacity = capacity;
        this.position = position;
        this.transactions = { };
        this.parcels = {  };
    }
};
