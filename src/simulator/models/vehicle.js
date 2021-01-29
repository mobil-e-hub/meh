module.exports = class Vehicle {
    constructor(id, position) {
        this.id = id;
        this.position = position;

        this.speed = 10;
    }

    move(interval) {
        this.position.x += (Math.random() - 0.5) * this.speed * interval;
        this.position.y += (Math.random() - 0.5) * this.speed * interval;
    }
};
