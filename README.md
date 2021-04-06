# mobil-e-Hub: Intelligent Drone Logistics Network
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Purpose of this project
This project allows for the simulation, control and visualization of a Drone Logistics Network (DLN). It consists of three modules:
- Simulator (`/sim`): This module simulates drones, vehicles, parcels, hubs and orders.
- Optimization Engine (`/opt`): This module controls the routing of drones and vehicles.
- Visualization (`/viz`): This module shows the current status of the DLN in the browser.

Please refer to the `README.md` files in the respective sub-folder for instructions and documentation.

## Interaction and Communication
TODO: Describe Eventgrid and interaction between modules

---
TODO: Distribute content below over the three sub-projects (README files in folders `/opt`, `/viz` and `/sim`)

## Installation and usage
```
$ cd meh-node
$ npm install
$ npm run all // the commands 'npm run visualization' and 'npm run simulator' also work individually
```

## Overall network architecture
A Drone Logistics Network (DLN) is a model for the delivery of parcels using autonomous drones and transport vehicles. 

The participating entities are:
- Drones
- Vehicles
- Parcels
- Hubs
- Orders
- Control System

In the beginning, a number of drones, vehicles and hubs exist. Whenever an order is placed and the corresponding 
parcel is pushed to a hub, it is the task of the system to complete the order (i.e., deliver the parcel) in an optimal way.
To do so, the Control System analyzes the current system state and figures out the best strategy. It then gives the drones 
and vehicles directions according to the devised strategy. When the order is fulfilled, it is deleted from the order list, 
and the system waits for the next order. Of course, orders can occur in parallel, and the Control System is supposed to find 
an optimal way of handling all of them.

All entities communicate via MQTT. This allows for a very flexible addition of new components, e.g. visualization or logging.

## Project Structure
### Simulation
Node.js server with simulator modules `HubSimulator` `DroneSimulator`, `VehicleSimulator` and `ParcelSimulator`.

#### HubSimulator
...

#### DroneSimulator
...

#### VehicleSimulator
...

#### OrderSimulator
...


### Visualization
Vue.js client for the visualization of a running DLN.

#### Functionality
##### Display of system state from MQTT messages
The Visualization client shows on a map all entities from which it receives state updates via MQTT, as well as important events such as _Parcel delivered_ or _Order placed_.

##### Control of simulators
The simulators can be started, paused, resumed and stopped from the Visualization client. This is not part of the core functionality, but it is necessary for the project phase where all data is generated by a simulator rather than by real vehicles and customers.


## Entity models
### Drone
```
id: UUID,
position: {
    x: float,
    y: float,
    z: float
},
speed: float,
mission: {
    id: UUID,
    type: ['fly'|'drive'|'pickup'|'dropoff'],
    [transaction: { id: UUID, from: { type: EntityType, id: UUID }, to: { type: EntityType, id: 'd01' }, parcel: Parcel } | destination: Point],
    minimumDuration: float
}
```
...

## Communication
Communication between entities exclusively uses the public MQTT broker `broker.hivemq.com`. 

All topics start with `mobil-e-hub/v1/[from|to]/[entity]/[id]/`, and all messages are string representations of JSON objects.
Each entity publishes `{ topic: mobil-e-hub/v1/from/[entity]/[id]/connected, message: ''}` upon connection.

### Missions
Drones and Vehicles can be assigned a _mission_ by the Control System which consists of a list of tasks.

### Tasks
A task can either be going from one node of an edge to the other node, or picking up / dropping off a parcel.

### Transactions
A _transaction_ describes the passing of a parcel from one entity to another. The process of a transaction is as follows:
1. The receiver sends a `transaction/[id]/ready` message to the giver
2. The giver sends a `transaction/[id]/execute` message to the giver and sends a a `transfer` message to the parcel
3. The receiver sends a `transaction/[id]/complete` message to the giver and marks the transaction as complete
4. The giver marks the transaction as complete

Hubs can handle multiple transactions in parallel, while drones and vehicles process them one by one as tasks of their current mission.


## Workstream Alex/Tim
### Overview of Production Components
#### Control Center ("Mobilitätssystem")
- Written in Python
- Can send/receive messages to/from EventGrid
- Reacts to incoming status updates (of drones, cars, parcels, traffic, ...) with re-routing according to updated optimal delivery schedule
- Runs permanently on InES server

#### Visualization
- Written in Vue.js
- Is entirely independent from the rest of the system and runs as a static website (e.g. hosted on Github Pages)
- Can receive messages from EventGrid
- Shows current state of entire system (topology, drones, cars, hubs, parcels, ...) and KPIs (parcels delivered per hour, drone utilization, traffic jams, ...)


### Development / Simulation Components
#### Simulation of drones / cars / parcels
- Written in node.js
- Runs on InES machine


#### Simulation of shop (order management)
- Simple UI which allows a customer to place an order and to view updates on existing orders (can be an additional view in the Visualization)
- Endpoint to receive orders (can be part of the simulation server)


### TODO
- Set up Linux partition on InES machine
- Set up git and IDE (VS Code?), possibly set up CD/CI
- Create a Python web server (Flask/Django) which can send and receive messages to/from EventGrid and contains a function stub for handling incoming messages
- ...

#### Components from a technological perspective
##### node.js server
- Runs on InES machine
- Contains simulation of drones / cars / parcels and shop

##### Python server
- Runs on InES machine
- Contains the Control Center ("Mobilitätssystem")

##### Static Github Pages app
- Hosted as a Github repo
- Contains visualization and shop simulation frontend
