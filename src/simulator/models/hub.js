module.exports = class Hub {
    constructor(id, position) {
        this.id = id;
        this.position = position;
        this.parcels = {};
    }

    reset() {
        this.parcels = {};
    }
};
