# mobil-e-Hub: Intelligent Drone Logistics Network
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

[![github pages](https://github.com/mobil-e-hub/meh/actions/workflows/github-pages.yml/badge.svg)](https://github.com/mobil-e-hub/meh/actions/workflows/github-pages.yml)

## Purpose of this project
This project allows for the simulation, control and visualization of a Drone Logistics Network (DLN). It consists of three modules:
- Simulator (node.js server in `/sim`): This module simulates drones, vehicles, parcels, hubs and orders.
- Optimization Engine (Flask server in `/opt`): This module controls the routing of drones and vehicles.
- Visualization (Vue app in `/viz`): This module shows the current status of the DLN in the browser.
- MQTT (node.js server in `/mqtt`): This module forwards messages between the MQTT broker and the Azure EventGrid. 

Please refer to the `README.md` files in the respective sub-folders for instructions and documentation.

## Installation and usage
To install the required packages and start all modules in parallel, run
```shell script
meh % npm run setup
meh % npm run start
```
The individual modules can also be started using the commands `npm run start:sim`, `npm run start:opt`, `npm run start:viz` and `npm run start:vue`.


## Interaction and Communication
Communication between the components is via MQTT.

### Communication with MQTT -
Communication between entities exclusively uses the private mosquitto MQTT broker `wss://ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt`.

All topics start with `mobil-e-hub/v1/[from|to]/[entity]/[id]/`, and all messages are string representations of JSON objects.
Each entity publishes `{ topic: mobil-e-hub/v1/from/[entity]/[id]/connected, message: ''}` upon connection.

The following table lists all currently used topics in this project with short explanations on their usage

Entities comprise: *Hub, Drone, Car, Bus, Parcel, (Order)* - messages are sent by the corresponding simulators.
Other registered clients are the Vue.app `'visualization'` and the Optimization engine `'opt'`.


| Topic | Usage | Sender | Receiver | Payload (json) | Notes |
|---	|---	|--- |--- |--- |--- |
| `/from/[entity]/[id]/connected` | upon connection | Entity | all | | <!-- TODO double check: really used? or only state send? -->
| `/from/[entity]/[id]/state` | on state change | Entity | all | Entity Object |
| **Control:** | | | | |
| `/from/visualization/[id]/start` | when Start button is pressed in Viz | viz | all | - |
| `from/visualization/[id]/pause` | when Pause button is pressed in Viz	| viz | all | - | 
| `from/visualization/[id]/resume`  	| when Resume button is pressed in Viz 	| viz | all | - | 
| `from/visualization/[id]/stop`	| when Stop button is pressed in Viz 	| viz | all | - |
| `from/visualization/[id]/reset`	| when Reset button is pressed in Viz 	| viz | all | - |
| `from/visualization/[id]/test`*	| used during DEV (Test Btn in Viz) | viz | all | - |
| **Orders / Parcels:**| | | | |
| `from/visualization/[id]/place-order`  | WIP	| viz | ParcelSimulator | - | 
| `from/order/[id]/placed`  | WIP	| ParcelSimulator | Entity, opt | - |
| `from/?/[id]/place-parcel` | create new parcel  | TODO - viz? | ParcelSimulator | Parcel Object | 
| `from/parcel/[id]/placed` | parcel added to carrier (hub)  | ParcelSimulator | Entity, opt | Parcel Object |
| `to/parcel/[id]/transfer` | when entities agreed on transaction | Entity | Parcel | Entity (Receiver) | success triggers `from/parcel/[id]/delivered` | 
| `from/parcel/[id]/delivered` | parcel transfer success | Parcel | (Entity), opt | Parcel Object |  | <!-- TODO currently: only used by opt_engine--> 
| `from/[parcel]/[id]/pickup` | DEPRECATED?	| Entity | Parcel | Entity Object (Carrier) |
| `from/[parcel]/[id]/dropoff` | DEPRECATED? | Entity | Parcel | Entity Object (Carrier)  |
| **Transactions:** | | | | |
| `to/[Entity]/[id]/transaction/[id]/ready`  	| Receiving Entity ready for transaction	| Entity (Receiver) | Entity (Giver)| - |
| `to/[Entity]/[id]/transaction/[id]/unready`  	| Receiving Entity no longer ready for transaction | Entity (Receiver) | Entity (Giver), (Opt) | - |
| `to/[Entity]/[id]/transaction/[id]/execute`  | Both ready, also sends `transfer` to parcel | Entity (Giver) | Entity (Receiver) | - | only send if `.../ready` was received |
| `to/[Entity]/[id]/transaction/[id]/complete` | Transaction success | Entity (Receiver) | Entity (Giver) | - | |
| **Missions:** | | | | |
| `to/[Entity]/[id]/mission` | assign new mission | opt | Entity | Mission Object | |
| `from/[Entity]/[id]/mission/[id]/complete` | on mission success | Entity | all, opt | - | |
| `from/[Entity]/[id]/mission/[id]/failed`	| WIP | Entity | all, opt| -  |  *not implemented yet* |
| **Error Handling:** | | | | |
| `from/opt_engine/error` | WIP: no route for parcel found | opt | all | Parcel Object | |
---



## Server Architecture
The following figure gives an overview of the components used:
<img src="https://i.ibb.co/FhrnpCM/structure-1.png" alt="Server Structure">
<!--- https://ibb.co/YNCbgwM --->

NGINX forwards the client's paths _.../meh/sim_ and _.../meh/opt_ to the simulator's and optimization engine's ports. 
In order to stay up to date, GitHub performs a WebHook after every push to the master branch that is being forwarded to the 
updater service. This Node.js component then updates the project. A monitoring page serves as a routing fallback and 
keeps track of services' health.

The latest version of the visualization can be found on [GitHub Pages](https://mobil-e-hub.github.io/meh/) which is 
linked to the _gh-pages_ branch. 
An [Action](https://github.com/mobil-e-hub/meh/actions/workflows/github-pages.yml) keeps it up to date.

---
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
