// External modules
const _ = require('lodash');

// Internal modules
const random = require('../helpers').random;

const CarState = {
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

// TODO model capacity: number of parcels that car can load
//      - model timeout/  transaction abort mechanism

class Car {
    constructor(id, position, capacity = 2) {
        this.id = id;
        this.position = position;

        this.speed = 5;
        this.capacity = capacity;
        this.parcels = [];
        this.state = CarState.idle;

    }

    move(interval, simulator) {
        if (!this.mission) {
            return false;
        } else {
            let task = this.mission.tasks[0];
            switch (task.type) {
                case 'move':
                    let direction = {
                        lat: task.destination.lat - this.position.lat,
                        long: task.destination.long - this.position.long,
                        alt: task.destination.alt - this.position.alt,
                    };
                    let length = Math.sqrt(direction.lat ** 2 + direction.long ** 2 + direction.alt ** 2);
                    if (length > this.speed * interval) {
                        direction = {
                            lat: direction.lat / length * this.speed * interval,
                            long: direction.long / length * this.speed * interval,
                            alt: direction.alt / length * this.speed * interval
                        }
                    }

                    this.position.lat += direction.lat;
                    this.position.long += direction.long;
                    this.position.alt += direction.alt;

                    if (_.isEqual(this.position, task.destination)) {
                        this.completeTask(simulator);
                    }

                    return true;
                case 'pickup':
                    // this.state === CarState.waitingForTransaction
                    return false;
                case 'dropoff':
                    if (this.state === CarState.waitingForTransaction) {
                        return false;
                    } else {
                        // this.state === CarState.executingTransaction
                        simulator.publish(`${task.transaction.to.type}/${task.transaction.to.id}`, `transaction/${task.transaction.id}/execute`);
                        simulator.publish(`parcel/${task.transaction.parcel}`, 'transfer', task.transaction.to);

                        return true;
                    }
                case 'place':
                    let new_parcel = {
                        id: task.transaction.id,
                        orderId: task.transaction.orderId,
                        carrier: task.transaction.carrier,
                        destination: task.transaction.destination
                    };
                    this.parcels.push(new_parcel)

                    return true;

            }
        }
    }

    completeTransaction(simulator) {
        let task = this.mission.tasks[0];

        if (task.type === undefined) {
            console.error(`Transaction failed! - Could not find transaction in tasks of Car.`)
            return;
        }

        if (task.type !== 'pickup') {
            console.log('Wrong transaction!');
        } else {
            let transaction = task.transaction;

            // this.parcel = transaction.parcel;
            if(this.parcels.length < this.capacity) {
                this.parcels.push(transaction.parcel)
                simulator.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);
            } else {
                  simulator.publish(`car/${this.id}`, `error/capacity/exceeded/parcel/${transaction.parcel}`); // TODO include in table
            }
            // TODO Is task completed when parcel is rejected and other modules are notified?

            this.completeTask(simulator);
        }
    }

    setMission(mission, simulator) {
        this.mission = mission;
        if (mission === null) {
            this.state = CarState.idle;
        } else {
            this.startTask(simulator);

        }
    }

    startTask(simulator) {
        let task = this.mission.tasks[0];

        if (task.type === 'move') {
            this.state = CarState.moving;
            task.state = TaskState.ongoing;
        } else if (task.type === 'pickup') {
            let transaction = task.transaction;
            simulator.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            this.state = CarState.waitingForTransaction;
            task.state = TaskState.waitingForTransaction;
        } else if (task.type === 'dropoff') {
            if (task.transaction.ready) {
                this.state = CarState.executingTransaction;
                task.state = TaskState.executingTransaction;
        } else if (task.type === 'place') {

            let transaction = task.transaction;
            simulator.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            this.state = CarState.waitingForTransaction;
            task.state = TaskState.waitingForTransaction;
        } else {
                this.state = CarState.waitingForTransaction;
                task.state = TaskState.waitingForTransaction;
            }
        }
    }

    completeTask(simulator) {
        if (this.mission.tasks[0].type === 'dropoff') {
            this.parcels = this.parcels.filter(p => p !== this.mission.tasks[0].transaction.parcel);
        }
        this.mission.tasks.splice(0, 1);

        if (this.mission.tasks.length === 0) {
            simulator.publish(`car/${this.id}`, `mission/${this.mission.id}/complete`);
            this.mission = null;
            this.state = CarState.idle;
        } else {
            this.startTask(simulator);
        }
        simulator.updateCarState(this.id);
    }
}

module.exports = {Car, CarState, TaskState};
