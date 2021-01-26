module.exports = class Drone {
    constructor(id) {
        this.id = id;
        this.position = { x: 0, y: 0, z: 0 };

        this.target = {
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.5) * 20
        };

        this.speed = 1;
    }

    move(interval) {
        let direction = {
            x: this.target.x - this.position.x,
            y: this.target.y - this.position.y,
            z: this.target.z - this.position.z,
        };
        let length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
        if (length > this.speed * interval) {
            direction = {
                x: direction.x / length * this.speed * interval,
                y: direction.y / length * this.speed * interval,
                z: direction.z / length * this.speed * interval
            }
        }

        this.position.x += direction.x;
        this.position.y += direction.y;
        this.position.z += direction.z;
    }

    reset() {
        this.position = { x: 0, y: 0, z: 0 };
    }
};
