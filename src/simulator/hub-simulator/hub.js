module.exports = class Hub {
    constructor(id) {
        this.id = id;

        this.x = (Math.random() - 0.5) * 40;
        this.y = (Math.random() - 0.5) * 40;

        this.parcels = {};
    }

    reset() {
        this.parcels = {};
    }
};
