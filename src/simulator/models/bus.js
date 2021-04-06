// External modules
const _ = require('lodash');

// Internal modules
const random = require('../helpers').random;

const BusState = {
    idle: 0,
    moving: 1,
    waitingForTransaction: 2,
    executingTransaction: 3,
    charging: 4,
    waitingAtStop: 5
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

class Bus {
    constructor(id, position, route, capacity = 2, stopTime = 5000) {
        this.id = id;
        this.position = position;

        this.capacity = capacity; // number of parcels that can be transported simultaneously
        this.route = route;      // array of nodes that are perpetually visited
        this.stopTime = stopTime; // time (in ms) spent at every node in route --> time frame available for transactions TODO transactions need to be in that frame or bus also waits for longer time

        this.speed = 10;
        this.parcels = null;
        this.state = BusState.idle;
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
                    // this.state === BusState.waitingForTransaction
                    return false;
                case 'dropoff':
                    if (this.state === BusState.waitingForTransaction) {
                        return false;
                    }
                    else {
                        // this.state === BusState.executingTransaction
                        simulator.publishTo(`${task.transaction.to.type}/${task.transaction.to.id}`, `transaction/${task.transaction.id}/execute`);
                        simulator.publishTo(`parcel/${task.transaction.parcel}`, 'transfer', task.transaction.to);

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
            this.parcels = transaction.parcel;   // TODO adapt to several parcels
            simulator.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);

            this.completeTask(simulator);
        }
    }

    setMission(mission, simulator) {
        this.mission = mission;
        if (mission === null) {
            this.state = BusState.idle;
        }
        else {
            this.startTask(simulator);

        }
    }

    setRoute(route, simulator) {
        this.route = route;
        if (route === null) {
            this.state = BusState.idle;
        }
        else {
            // TODO start driving the route

        }
    }

    startTask(simulator) {
        let task = this.mission.tasks[0];

        if (task.type === 'move') {
            this.state = BusState.moving;
            task.state = TaskState.ongoing;
        }
        else if (task.type === 'pickup') {
            let transaction = task.transaction;
            simulator.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            this.state = BusState.waitingForTransaction;
            task.state = TaskState.waitingForTransaction;
        }
        else if (task.type === 'dropoff') {
            if (task.transaction.ready) {
                this.state = BusState.executingTransaction;
                task.state = TaskState.executingTransaction;
            }
            else {
                this.state = BusState.waitingForTransaction;
                task.state = TaskState.waitingForTransaction;
            }
        }
    }

    completeTask(simulator) {
        this.mission.tasks.splice(0, 1);

        if (this.mission.tasks.length === 0) {
            simulator.publishFrom(`bus/${this.id}`, `mission/${this.mission.id}/complete`);
            this.mission = null;
            this.state = BusState.idle;
        }
        else {
            this.startTask(simulator);
        }
    }
}

module.exports = { Bus, BusState, TaskState };
