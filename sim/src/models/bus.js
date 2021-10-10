// External modules
const _ = require('lodash');

// Internal modules
const random = require('../helpers').random;

const BusState = {
    idle: 0,
    moving: 1,
    plannedStop: 2,
    transactionState: 3,
    charging: 4,
};

const MissionState = {
    notStarted: 0,
    ongoing: 1,
    // waitingForTransaction: 2,    // TODO eher BusState als MissionState... mission bleibt not started, egal ob Bus Kapazität voll oder am Laden
    // charging: 3,
    completed: 2,
    failed: 3
};

const TaskState = {
    notStarted: 0,
    ongoing: 1,
    waitingForTransaction: 2,
    executingTransaction: 3,
    completed: 4
    //canceled
};

//TODO: - functionality to change waiting time at certain stop --> set new route?
//      - refactor to manage transactions with explicit timing (?) --> necessary to allow
//      - mechanism to handle abort other mission if dropoff failed --> done by control-system

//TODO:
//          - compute time frames to see availability --> do this in optimization engine, just needed fir decentralised approach...
//       - TimeOut - Buffer -> change state
//
// TODO .............................................................................................................................
//       July_21:
//          - new mission started if old one is finished??

class Bus {
    constructor(id, position, route, capacity = 2) {
        this.id = id;
        this.position = position;

        this.capacity = capacity; // number of parcels that can be transported simultaneously
        this.route = route;      // array of stops that are perpetually visited                         [ {node: n00, position: {}, time: 10},
                                 //   --> objects with (node:  stoppingTime)                               {node: n01, position: {}, time: 3},
                                 //                                                                       {node: n06, position: {}, time 6} ]  node object, int - time in seconds
        this.nextStop = null;

        //difference to car/drones: Bus can have several Missions -> won't move differently:
        this.missions = {};  // TODO use array (or Map?) to guarantee order --> opt_engine can insert missions at optimal index = priority order
                             //  --> alternative: maintain array for sequence of keys ordered by priority --> look up which to start next
        // this.activeMissions = {}; --> TODO better performance if active ones stored here? -> better: lookup for state.Ongoing --> how many missions for bus are realistic

        this.speed = 10;
        this.parcels = [];
        this.state = BusState.idle;

        // active tasks are added here --> no dropoff before pickup of parcel etc...
        this.activeTasks = {};   // k: missionID, value: task: {type: 'dropoff', node: n00, from: bus00, to: drone02, parcel: p00}}

        this.arrivalTimeAtStop = null;
    }

    move(interval, simulator) {
        if (!this.route) {
            return false;
        } else {
            if (this.arrivalTimeAtStop !== null && (this.state === BusState.plannedStop || this.state === BusState.transactionState)) {
                let stop_time = Date.now() - this.arrivalTimeAtStop;
                if (stop_time >= this.nextStop.time * 1000) {
                    this.driveToNextStop(simulator);
                    return false;
                }
                // TODO abklären intervall --> 1 sek vor abfahrt keine transcations mehr ok? oder erst bei Weiterfahrt?
                // else if (stop_time >= (this.nextStop.time - 1)* 1000) {
                //     this.unreadyTransaction(simulator);
                //     return false;
                // }
            }
            switch (this.state) {
                case BusState.idle:
                    if (this.route.length >= 1) {
                        this.state = BusState.moving;
                        this.driveToNextStop(simulator)
                    }
                    return false;

                case BusState.moving:

                    let next = this.nextStop;
                    let direction = {
                        x: next.position.x - this.position.x,
                        y: next.position.y - this.position.y,
                        z: next.position.z - this.position.z,
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

                    if (_.isEqual(this.position, next.position)) {
                        this.stopAtBusStop(simulator)
                        //this.completeTask(simulator);
                    }
                    return true;

                case BusState.plannedStop:
                case BusState.transactionState:
                    // move to separate function??
                    let tasksAtStop = Object.values(this.activeTasks).filter(t => t.type === 'dropoff' || t.type === 'pickup');  // TODO move this to startTask / stop at Busstop? -> dont filter at every iteration
                    if (tasksAtStop.length > 0) {  // TODO replace with activeTasks filter for dropoff
                        // TODO remove task from tasksAtStop after they are done
                        // let drive = false;
                        tasksAtStop.forEach(function (task) {
                            if (task.type === 'pickup') {
                                //wait for execute message

                            } else if (task.type === 'dropoff') {

                                if (task.transaction.ready) {
                                    simulator.publish(`${task.transaction.to.type}/${task.transaction.to.id}`, `transaction/${task.transaction.id}/execute`);
                                    simulator.publish(`parcel/${task.transaction.parcel}`, 'transfer', task.transaction.to);
                                    // drive = false;
                                }
                                // drive = true;
                            }
                        });
                        return false; // drive;
                    }
            }
        }
    }

    stopAtBusStop(simulator) {
        // called only once at arrival at stop
        this.state = BusState.plannedStop;
        this.arrivalTimeAtStop = Date.now();

        let _m = Object.keys(this.activeTasks).filter(t => this.activeTasks[t].type === 'move' && this.activeTasks[t].destination === this.nextStop.node);
        _m.forEach(mID => this.completeTask(simulator, null, mID));     // TODO check --> does this only close the move task???

    }

    driveToNextStop(simulator) {
        // TODO call unready at start of next section of route (=here) or 1(?) sec before departure?
        this.unreadyTransactions(simulator);

        if (this.route == null) {
            this.state = BusState.idle;
            return false;
        }
        this.nextStop = this.route.shift();
        this.route.push(this.nextStop);

        this.arrivalTimeAtStop = null;

        this.state = BusState.moving;
    }

    unreadyTransactions(simulator) {

        let pending = Object.keys(this.activeTasks).filter(t => this.activeTasks[t].type !== 'move');

        pending.forEach(m => this.unreadyTransaction(simulator, m, this.activeTasks[m]));

        //pass
    }

    unreadyTransaction(simulator, mID, task) {

        let transaction = task.transaction;
        simulator.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/unready`);
        task.state = TaskState.ongoing;

        this.missions[mID].tasks.unshift({
            type: 'move', state: 'TaskState.notStarted', destination: this.position,
            minimumDuration: 10
        });
        this.activeTasks[mID] = this.missions[mID].tasks[0];
    }

    completeTransaction(simulator, tID) {
        let mID = this.matchTransactionToMission(tID)

        if (mID === undefined) {
            console.error(`Transaction ${tID} failed!`)
            return;
        }

        let task = this.activeTasks[mID]

        if (task.type !== 'pickup') {
            console.log('Wrong transaction!');
        } else {
            let transaction = task.transaction;
            if(this.parcels.length < this.capacity) {
                this.parcels.push(transaction.parcel);
                simulator.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);
            } else {
                simulator.publish(`bus/${this.id}`, `error/capacity/exceeded/parcel/${transaction.parcel}`);
            }
            this.completeTask(simulator, tID, mID);
        }
    }

    matchTransactionToMission(tId) {
        let mID = Object.keys(this.activeTasks).find(t => this.activeTasks[t].transaction && this.activeTasks[t].transaction.id === tId);

        if (mID === undefined) {
            // TODO handle Error --> raise Exception and publish error to VUE
            console.log(`Bus: Error - Could not find mission with transaction ${tId}`)
        }

        return mID;
    }

    completeTask(simulator, tID = null, mID = null) {

        if (mID === null) {
            console.assert(tID !== null, "Error: Both transactionID and missionID are null! ")
            mID = this.matchTransactionToMission(tID);
        }

        // TODO here? :  check if any active task != move
        //              --> no: busState = plannedStop

        // TODO debug this.missions[mID] is undefined
        let oldTask = this.missions[mID].tasks.splice(0, 1)[0];
        if (oldTask.type === 'dropoff') {
            this.parcels = this.parcels.filter(p => p !== oldTask.transaction.parcel);      // TODO debug: crashed ->    oldTask.transaction is undefined --> cannot read parcel
        }


        // TODO IN Debug: check if parcels are correct
        delete this.activeTasks[mID];
        if (!(Object.values(this.activeTasks).find(t => t.type !== 'move'))) {  // TODO overthink... --> reset BusState before new task is even started???
            this.state = BusState.plannedStop;
        }

        simulator.updateBusState(this.id);

        if (this.missions[mID].tasks.length === 0) {
            this.completeMission(simulator, mID);

        } else {
            this.startTask(simulator, mID);
        }
    }

    completeMission(simulator, mID) {
        /**
         * deletes mission with ID mID from Mission list and from ActiveTasks list.
         */
        // TODO: set Mission State to Complete (OR Failed ???)

        delete this.missions[mID];
        simulator.publishFrom(`bus/${this.id}`, `mission/${mID}/complete`);

        this.startTask(simulator)
    }

    //TODO: message: new Mission = null --> ignore (!) or reset all missions? -> abklären
    // TODO check for collision -> missionID given twice?
    setMission(mission, simulator) {

        if (mission !== null) {
            let newMission = {};
            newMission[mission.id] = {tasks: mission.tasks, state: MissionState.notStarted};
            this.missions = Object.assign(this.missions, newMission);


            // TODO fix: capacity = max # parcels held in parallel -> can hold more move tasks!! -> opt:engines job
            //  --> do not check this in Bus, only when accepting new parcels --> throw error if capacity exceeded
            if (Object.keys(this.activeTasks).length < this.capacity) {

                // TODO: add to tasks at Stop if dropoff or pickup???
                this.activeTasks[mission.id] = this.missions[mission.id].tasks[0];
                this.missions[mission.id].state = MissionState.ongoing;
                // TODO publish mission started??
            }

        }
    }

    setRoute(route, simulator) {
        this.route = route;
        if (route === null) {
            this.state = BusState.idle;
        } else {
            this.driveToNextStop(simulator);
        }
    }

    startTask(simulator, mID = undefined) {
        // if missionID === undefined --> start new mission, else continue with next task

        if (mID === undefined) {
            mID = Object.keys(this.missions).find(m => m.state === MissionState.notStarted)
            if (mID === undefined) {
                console.log("No unstarted missions.")
                return;
            }
        }

        let task = this.missions[mID].tasks[0];

        this.activeTasks[mID] = task;

        if (task.type === 'move') {
            // movement handled separately --> here: only indicates where to start next task
            // this.state = BusState.moving;
            // task.state = TaskState.ongoing;
        } else if (task.type === 'pickup') {

            let transaction = task.transaction;
            simulator.publish(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            this.state = BusState.transactionState;
            task.state = TaskState.waitingForTransaction;
        } else if (task.type === 'dropoff') {

            if (task.transaction.ready) {
                this.state = BusState.transactionState;
                task.state = TaskState.executingTransaction;
            } else {
                this.state = BusState.transactionState;
                task.state = TaskState.waitingForTransaction;
            }
        }
    }
}

module.exports = {Bus, BusState, TaskState};
