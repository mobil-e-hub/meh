// External modules
const _ = require('lodash');

// Internal modules
const random = require('../helpers').random;

const BusState = {
    idle: 0,
    moving: 1,
    waitingForTransaction: 2,       // TODO multiple parallel transactions at one stop possible...
    executingTransaction: 3,
    charging: 4,
    plannedStop: 5                  // encapsulates 2 and 3
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
//TODO check: design decisions:   - no sanity checks if route plausible / possible
//                                - transactions with multiple drones can happen in parallel at same stop
//                                - transaction will happen at next visit at node/position --> not possible to schedule transactions for the visit after next
//                                - pending transactions at stop currently block the bus from continuing to the next stop  -> cancel after ready-msg send requires new messages
//                                - currently: capacity limits number of accepted/active missions, not number of parcels transported in parallel

//TODO: - functionality to change waiting time at certain stop
//check - refactor to manage transactions with explicit timing (?) --> necessary to allow

//TODO: - mechanism: accept mission if # missions < capacity allows for it  --> accepts limit by parcel capacity needs timer
//          - after: pickup success: --> dropoff task becomes active
//          - after dropoff success: --> send transaction/task/mission complete +

class Bus {
    constructor(id, position, route, capacity = 2) {
        this.id = id;
        this.position = position;

        this.capacity = capacity; // number of parcels that can be transported simultaneously
        this.route = route;      // array of stops that are perpetually visited                         [ {node: n00, time: 10},
                                 //   --> objects with (node:  stoppingTime)                               {node: n01, time: 3},
                                 //                                                                       {node: n06, time 6} ]  node object, int - time in seconds
        this.nextStop = null;

        //difference to car/drones: Bus can have several Missions -> won't move differently:
        this.missions = null;

        this.speed = 10;
        this.parcels = null;
        this.state = BusState.idle;


        // active tasks are added here --> no dropoff before pickup of parcel etc...
        this.tasks = null;   // {   t00: {type: 'dropoff', node: n00, from: bus00, to: drone02, parcel: p00}            // TODO save as object of Missions with 2 tasks each (transactions)
                                    //                                                                                 --> alternative: add clock?
                                    //      }

        // TODO refactor to use this task format (from control-system)
        // Tasks currently: { type: 'pickup', state: TaskState.notStarted, transaction: _.clone(transactions.t00) },
        // Transactions "":  t01: {id: 't01', from: { type: 'drone', id: 'd00' }, to: { type: 'car', id: 'v00' }, parcel: 'p00'}, // TODO should include stop node where t happens

        this.tasksAtStop = null;  //to-do list of bus for the next waiting time at a stop
        this.arrivalTimeAtStop = null;
    }

    move(interval, simulator) {
        if (!this.route) {     // this.state != BusState.moving; --> also handle BusState.waitingForTransaction
            return false;
        }
        else {
            switch (this.state) {
                case BusState.moving:

                    let next = this.nextStop.node;
                    let direction = {
                        x: next.destination.x - this.position.x,
                        y: next.destination.y - this.position.y,
                        z: next.destination.z - this.position.z,
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

                    if (_.isEqual(this.position, next.destination)) {
                        this.stopAtBusStop()
                        //this.completeTask(simulator);
                    }
                    return true;

                case BusState.plannedStop:

                    if (this.tasksAtStop != null) {
                        // TODO remove task from tasksAtStop after they are done
                        // let drive = false;
                        for (let task in this.tasksAtStop) {
                             if (task.type === 'pickup') {
                                //wait for execute message
                             }

                             else if (task.type === 'dropoff') {

                                 if (task.transaction.ready) {
                                     simulator.publishTo(`${task.transaction.to.type}/${task.transaction.to.id}`, `transaction/${task.transaction.id}/execute`);
                                     simulator.publishTo(`parcel/${task.transaction.parcel}`, 'transfer', task.transaction.to);
                                     // drive = false;
                                 }
                                 // drive = true;
                             }
                        }
                        return false; // drive;
                    }

                    else {
                        let now = Date.now();
                        let minTime = this.nextStop.time * 1000;

                        if (now - this.arrivalTimeAtStop >= minTime) {
                            this.driveToNextStop();
                        }
                        return false;
                    }
            }
        }
    }


    stopAtBusStop(simulator) {
        // called only once at arrival at stop
        this.state = BusState.plannedStop;
        this.arrivalTimeAtStop = Date.now();

        // TODO start to stop time  -> move to when stop reached...

        // check for transactions at this stop // Move to earlier point? --> Maybe driveToNextStop
        this.tasksAtStop = this.tasks.filter(t => t.node === this.nextStop.node)   // TODO check if correct equals?

        this.tasksAtStop.forEach(t => delete this.tasks[t]) // move current transactions from to future do list

        if (this.tasksAtStop != null) {

            for(let task in this.tasksAtStop) {
                if (task.type === 'pickup') {
                    simulator.publishTo(`${task.from.type}/${task.from.id}`, `transaction/${task.id}/ready`);
                    //this.state = BusState.waitingForTransaction;
                }
                //dropoff gets active after ready message received
                else if(task.type === 'dropoff') {
                    if (task.transaction.ready) {
                        //this.state = BusState.executingTransaction;
                        task.state = TaskState.executingTransaction;
                    }
                    else {
                        //this.state = BusState.waitingForTransaction;
                        task.state = TaskState.waitingForTransaction;
                    }
                }

            }

        }
    }

    completeTransaction(simulator) {
        // TODO adapt to several parcels
        // TODO search for this mission and switch to corresponding dropoff task
        let task = this.mission.tasks[0];
        if (task.type !== 'pickup') {
            console.log('Wrong transaction!');
        }
        else {
            let transaction = task.transaction;
            this.parcels = transaction.parcel;
            simulator.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);

            this.completeTask(simulator);
        }
    }



    //TODO: message: new Mission = null --> ignore (!) or reset all missions?
    setMission(mission, simulator) {
        this.missions = Object.assign(this.missions, { mission })  // TODO double check this append -->  which key for this mission?
        if (mission !== null && Object.keys(this.tasks).length < this.capacity) {
            let m = mission;
            this.tasks = Object.assign(this.tasks, mission.tasks[0]);//{ m:id: mission.tasks[0]});
        }
    }

    setRoute(route, simulator) {
        this.route = route;
        if (route === null) {
            this.state = BusState.idle;
        }
        else {
            // TODO start driving the route
            this.driveToNextStop();

        }
    }

    driveToNextStop() {
        if(this.route == null){
            this.state = BusState.idle;
            return false;
        }
        this.nextStop = this.route.shift();
        this.route.push(this.nextStop);

        this.arrivalTimeAtStop = null;

        this.state = BusState.moving;
    }

    startTask(simulator) {                  //TODO weg: Bus bekommt andere tasks : orders??
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
