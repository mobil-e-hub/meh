# meh-sim: Simulator (node.js server) for mobil-e-Hub
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Installation and usage
```shell script
meh % cd sim
sim % npm install
sim % npm run sim
```

## Communication with Azure Event Grid
This server receives Event Grid messages on the endpoint `POST /eventgrid`.


---
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

All entities communicate via the Azure EventGrid or MQTT (deprecated!). This allows for a very flexible addition of new components, e.g. visualization or logging.

---
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