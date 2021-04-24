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

Please refer to the `README.md` files in the respective sub-folders for instructions and documentation.

## Installation and usage
To install the required packages and start all modules in parallel, run
```shell script
meh % npm run setup
meh % npm run start
```
The individual modules can also be started using the commands `npm run start:sim`, `npm run start:opt`, `npm run start:viz` and `npm run start:vue`.


## Interaction and Communication
TODO: Describe Event Grid and interaction between modules

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
