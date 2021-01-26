module.exports = class Vehicle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.speed = 3;
    }

    move(interval) {
        this.x += (Math.random() - 0.5) * this.speed * interval;
        this.y += (Math.random() - 0.5) * this.speed * interval;
    }

    reset() {
        this.x = 0;
        this.y = 0;
    }
};
