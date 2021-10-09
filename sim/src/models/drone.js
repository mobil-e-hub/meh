// External modules
const _ = require('lodash');

// Internal modules
const random = require('../helpers').random;

const DroneState = {
    idle: 0,
    moving: 1,
    waitingForTransaction: 2,
    executingTransaction: 3,
    charging: 4
};

const MissionState = {
    notStarted: 0,
    moving: 1,
    waitingForTransaction: 2,
    charging: 3
};

const TaskState = {
    notStarted: 0,
    ongoing: 1,
    waitingForTransaction: 2,
    executingTransaction: 3,
    completed: 4
};

// TODO add timeout mechanism / abort transaction mechanism

class Drone {
    constructor(id, position) {
        this.id = id;
        this.position = position;

        this.speed = 2;
        this.parcel = null;
        this.state = DroneState.idle;
    }

    move(interval, simulator) {
        if (!this.mission) {
            return false;
        }
        else {
            let task = this.mission.tasks[0];
            switch (task.type) {
                case 'move':
                    let direction = {
                        x: task.destination.x - this.position.x,
                        y: task.destination.y - this.position.y,
                        z: task.destination.z - this.position.z,
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

                    if (_.isEqual(this.position, task.destination)) {
                        this.completeTask(simulator);
                    }

                    return true;
                case 'pickup':
                    // this.state === DroneState.waitingForTransaction
                    return false;
                case 'dropoff':
                    if (this.state === DroneState.waitingForTransaction) {
                        return false;
                    }
                    else {
                        // this.state === DroneState.executingTransaction
                        simulator.publish(`${task.transaction.to.type}/${task.transaction.to.id}`, `transaction/${task.transaction.id}/execute`);
                        simulator.publish(`parcel/${task.transaction.parcel}`, 'transfer', task.transaction.to);

                        return true;
                    }
            }
        }
    }

    completeTransaction(simulator) {
        let task = this.mission.tasks[0];
        if (task.type !== 'pickup') {
            console.log('Wrong transaction!');
        }
        else {
            let transaction = task.transaction;
            this.parcel = transaction.parcel;
            simulator.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);

            this.completeTask(simulator);
        }
    }

    setMission(mission, simulator) {
        this.mission = mission;
        if (mission === null) {
            this.state = DroneState.idle;
        }
        else {
            this.startTask(simulator);

        }
    }

    startTask(simulator) {
        let task = this.mission.tasks[0];

        if (task.type === 'move') {
            this.state = DroneState.moving;
            task.state = TaskState.ongoing;
        }
        else if (task.type === 'pickup') {
            let transaction = task.transaction;
            simulator.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            this.state = DroneState.waitingForTransaction;
            task.state = TaskState.waitingForTransaction;
        }
        else if (task.type === 'dropoff') {
            if (task.transaction.ready) {
                this.state = DroneState.executingTransaction;
                task.state = TaskState.executingTransaction;
            }
            else {
                this.state = DroneState.waitingForTransaction;
                task.state = TaskState.waitingForTransaction;
            }
        }
    }

    completeTask(simulator) {
        // TODO: only called when parcel dropped off successfully?
        if (this.mission.tasks[0].type === 'dropoff') {
             this.parcel = null;
        }

        this.mission.tasks.splice(0, 1);

        if (this.mission.tasks.length === 0) {
            simulator.publish(`drone/${this.id}`, `mission/${this.mission.id}/complete`);
            this.mission = null;
            this.state = DroneState.idle;
        }
        else {
            this.startTask(simulator);
        }
        simulator.updateDroneState(this.id);
    }
}

module.exports = { Drone, DroneState, TaskState };
