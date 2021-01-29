// External modules
const _ = require('lodash');

// Internal modules
const random = require('../helpers').random;

module.exports = class Drone {
    constructor(id, position) {
        this.id = id;
        this.position = position;

        this.tasks = [
            {
                type: 'fly',
                target: random.position(),
                minimumDuration: 10
            }
        ];

        this.speed = 10;
    }

    move(interval, publishTo) {
        if (this.tasks.length === 0) {
            return false;
        }
        else {
            let currentTask = this.tasks[0];
            let taskCompleted = false;
            switch (currentTask.type) {
                case 'fly':
                    let direction = {
                        x: currentTask.target.x - this.position.x,
                        y: currentTask.target.y - this.position.y,
                        z: currentTask.target.z - this.position.z,
                    };
                    let length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
                    if (length > this.speed * interval) {
                        direction = {
                            x: direction.x / length * this.speed * interval,
                            y: direction.y / length * this.speed * interval,
                            z: direction.z / length * this.speed * interval
                        }
                    }

                    if (_.isEqual(this.position, currentTask.target)) {
                        taskCompleted = true;
                    }
                    else {
                        this.position.x += direction.x;
                        this.position.y += direction.y;
                        this.position.z += direction.z;
                    }

                    break;
                case 'pickup':
                    taskCompleted = true;
                    publishTo(`parcel/${currentTask.parcelId}`, 'pickup', { type: 'drone', id: this.id });
                    break;
                case 'dropoff':
                    taskCompleted = true;
                    publishTo(`parcel/${currentTask.parcelId}`, 'dropoff', currentTask.toCarrier);
                    break;
            }
            if (taskCompleted) {
                this.tasks.splice(0, 1);
            }
            return true;
        }
    }
};
