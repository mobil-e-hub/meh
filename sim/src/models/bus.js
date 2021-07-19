// External modules
const _ = require('lodash');

// Internal modules
const random = require('../helpers').random;

const BusState = {
    idle: 0,
    moving: 1,
    plannedStop: 2,       // TODO multiple parallel transactions at one stop possible...
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

//TODO: - mechanism: accept mission if # missions < capacity allows for it  --> accepts limit by parcel capacity needs timer
//          - after: pickup success: --> dropoff task becomes active
//          - after dropoff success: --> send transaction/task/mission complete +
//          - compute time frames to see availability --> do this in optimization engine, just needed fir decentralised approach...
// TODO .............................................................................................................................
//       - handle complete transaction  --> after pickup
//       -  handle complete mission      --> after dropoff
//       - TimeOut - Buffer -> change state
//
// TODO .............................................................................................................................
//       July_21:
//          - new mission started if old one is finished??
//
//
//  ..................................................................................................................................

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
        this.missions = {};  // TODO use array (or Map?) to guarantee order --> opt_engine can insert missions at optimial index = priority order
                             //  --> alternative: maintain array for sequence of keys ordered by priority --> look up which to start next
        // this.activeMissions = {}; --> TODO better performance if active ones stored here? -> better: lookup for state.Ongoing --> how many missions for bus are realistic

        this.speed = 10;
        this.parcels = {};
        this.state = BusState.idle;

        // TODO double check bus states!!! --> hasRoute() => state not idle but moving?

        // active tasks are added here --> no dropoff before pickup of parcel etc...
        this.activeTasks = {};   // k: missionID, value: task: {type: 'dropoff', node: n00, from: bus00, to: drone02, parcel: p00}}            // TODO save as object of Missions with 2 tasks each (transactions)
        //                            k                                                     --> alternative: add clock?
        //      }

        // TODO refactor to use this task format (from control-system)
        // Tasks currently: { type: 'pickup', state: TaskState.notStarted, transaction: _.clone(transactions.t00) },
        // Tasks should be: => { type: 'move', state: TaskState.notStarted, destination: { x: -50, y: -50, z: 0 }, minimumDuration: 10 },
        // Transactions "":  t01: {id: 't01', from: { type: 'drone', id: 'd00' }, to: { type: 'car', id: 'v00' }, parcel: 'p00'}, // TODO should include stop node where t happens

        // this.tasksAtStop = [];  //to-do list of bus for the next waiting time at a stop   --> { m0: t1, m2: t4}
        this.arrivalTimeAtStop = null;
    }

    move(interval, simulator) {
        if (!this.route) {     // this.state != BusState.moving; --> also handle BusState.waitingForTransaction
            return false;
        } else {
            switch (this.state) {
                case BusState.idle:
                    if (this.route.length >= 1) {
                        this.state = BusState.moving;
                        this.driveToNextStop()
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
                    // move to separate function??
                    let tasksAtStop = Object.values(this.activeTasks).filter(t => t.type === 'dropoff' || t.type === 'pickup');
                    if (tasksAtStop.length > 0) {  // TODO replace with activeTasks filter for dropoff
                        // TODO remove task from tasksAtStop after they are done
                        // let drive = false;
                        for (let task in tasksAtStop) {
                            if (task.type === 'pickup') {
                                //wait for execute message

                            } else if (task.type === 'dropoff') {

                                if (task.transaction.ready) {
                                    simulator.publishTo(`${task.transaction.to.type}/${task.transaction.to.id}`, `transaction/${task.transaction.id}/execute`);
                                    simulator.publishTo(`parcel/${task.transaction.parcel}`, 'transfer', task.transaction.to);
                                    // drive = false;
                                    // TODO call Mission Complete? --> done from simulator
                                }
                                // drive = true;
                            }
                        }
                        return false; // drive;
                    }
                    // TODO das else hier weg? --> solange taskAtStop nicht leer?
                    else {
                        if (Date.now() - this.arrivalTimeAtStop >= this.nextStop.time * 1000) {
                            this.driveToNextStop(simulator);
                        }
                        return false;
                    }
            }
        }
    }

    stopAtBusStop(simulator) { // TODO remove simulator parameter -> needed?
        // called only once at arrival at stop
        this.state = BusState.plannedStop;
        this.arrivalTimeAtStop = Date.now();

        // TODO does not send transaction ready message
        // TODO debug filter & for each! --> filter does not find move tasks that are done
        // TasksAtStop: Iterate over activeMissions --> if move task ends here --> close task and do proceed to next one

        let _m = Object.keys(this.activeTasks).filter(t => this.activeTasks[t].type === 'move' && this.activeTasks[t].destination === this.nextStop.node);
        _m.forEach(mID => this.completeTask(simulator, null, mID));     // TODO check --> does this only close the move task???
        // TODO alex
        // - remove task from activeTasks / tasksAtStop / mission / activeMissions
        // - add next task to tasksAtStop and activeTasks? --> oder active Tasks immer nur die vom type: 'move'

        // TODO wieso doppelt?
        // if (this.tasksAtStop.length > 0) { // use keys / _m instead
        //
        //     for (let task in this.tasksAtStop) {
        //         if (task.type === 'pickup') {
        //             simulator.publishTo(`${task.from.type}/${task.from.id}`, `transaction/${task.id}/ready`);
        //             this.state = BusState.transactionState;
        //         }
        //         //dropoff gets active after ready message received          TODO check can happen from the move method (continuous calls)
        //         else if (task.type === 'dropoff') {
        //             if (task.transaction.ready) {
        //                 this.state = BusState.transactionState;
        //                 task.state = TaskState.executingTransaction;
        //             } else {
        //                 this.state = BusState.transactionState;
        //                 task.state = TaskState.waitingForTransaction;
        //             }
        //         }
        //     }
        // }
    }

    driveToNextStop(simulator) {
        // TODO check if 'move' mission arrived at goal -> then move to next task for this mission

        let pending = Object.values(this.activeTasks).filter(t => t.type !== 'move');
        pending.forEach(t => this.unreadyTransaction(simulator, t.transaction.id));

        if (this.route == null) {
            this.state = BusState.idle;
            return false;
        }
        this.nextStop = this.route.shift();
        this.route.push(this.nextStop);

        this.arrivalTimeAtStop = null;

        // check for transactions at next stop   TODO alex: refactor -> done at stopAtBusstop
        // this.tasksAtStop = Object.values(this.activeTasks).filter(t => t.node === this.nextStop.node)
        //
        // this.tasksAtStop.forEach(t => delete this.activeTasks[t]) // move current transactions from to future do list

        this.state = BusState.moving;
    }

    unreadyTransaction(simulator, tID) {
        // TODO:  - inform entitites / opt_engine
        //          - reset transaction state
        //          - respective mission: add move to node tasks again in the beginning before further instructions...

        //pass
    }

    completeTransaction(simulator, tID) {

        // TODO adapt to several missions
        // TODO search for this mission and switch to corresponding dropoff task
        let mID = this.matchTransactionToMission(tID)

        let task = this.activeTasks[mID]

        if (task.type !== 'pickup') {
            console.log('Wrong transaction!');
        } else {
            console.assert(Object.keys(this.parcels).length < this.capacity,
                `Transaction Error: Bus/${this.id} has no free capacity for transaction/${tID}`);
            let transaction = task.transaction;

            this.parcels = Object.assign(this.parcels, transaction.parcel);   // TODO key parcelID needed here?
            simulator.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/complete`);

            this.completeTask(simulator, tID, mID);
        }
    }

    matchTransactionToMission(tId) {
        // TODO debug -> mission m03 not found here!!!
        let mID = Object.keys(this.activeTasks).find(t => this.activeTasks[t].transaction && this.activeTasks[t].transaction.id === tId); //TODO change to keys!!!

        if (mID === undefined) {
            // TODO handle Error --> raise Exception and publish error to VUE
            console.log(`Bus: Error - Could not find mission with transaction ${tId}`)
        }

        return mID;
    }

    // TODO change --> missions / task id or index as parameter --> continue for the given mission / task
    //             --> refactor to make this also change activeTasks / tasksAtStop
    completeTask(simulator, tID = null, mID = null) {

        if (mID === null) {
            console.assert(tID !== null, "Error: Both transactionID and missionID are null! ")
            mID = this.matchTransactionToMission(tID);
        }

        // TODO debug this.missions[mID] is undefined
        let oldTask = this.missions[mID].tasks.splice(0, 1);
        if (oldTask[0].type === 'dropoff') {
            delete this.parcels[mID];
        }

        if (this.missions[mID].tasks.length === 0) {
            this.completeMission();

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
        delete this.activeTasks[mID];
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
            this.driveToNextStop();
        }
    }

    startTask(simulator, mID = undefined) {
        // if missionID === undefined --> start new mission, else continue with next task

        if (mID === undefined) {
            mID = Object.keys(this.missions).find(m => m.state === MissionState.notStarted)
            if (mID === undefined) {
                console.log("No waiting missions")
                return;
            }
        }

        let task = this.missions[mID].tasks[0];

        this.activeTasks[mID] = task;

        if (task.type === 'move') {
            // movement handled separately
            // this.state = BusState.moving;
            // task.state = TaskState.ongoing;
        } else if (task.type === 'pickup') {

            // this.tasksAtStop.push(task);

            let transaction = task.transaction;
            simulator.publishTo(`${transaction.from.type}/${transaction.from.id}`, `transaction/${transaction.id}/ready`);
            this.state = BusState.transactionState;
            task.state = TaskState.waitingForTransaction;
        } else if (task.type === 'dropoff') {

            // this.tasksAtStop.push(task);

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
