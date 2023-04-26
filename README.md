# mobil-e-Hub: Intelligent Drone Logistics Network
Authors: 
- Michael Oesterle (michael.oesterle@uni-mannheim.de)
- Alexander Becker
- Tim Grams
- Johannes Pernpeintner


## Purpose of this project
This project allows for the simulation, control and visualization of a Drone Logistics Network (DLN). It consists of the following modules:
- Simulator (node.js server in `/sim`): This module simulates drones, vehicles, parcels, hubs and orders.
- Optimization Engine (Flask server in `/opt`): This module controls the routing of drones and vehicles.
- Visualization (Vue app in `/viz`): This module shows the current status of the DLN in the browser.
- MQTT broker (installed on the server): This module handles MQTT messages between clients.
- ~~Analysis Engine (Flask server in `/ana`): TODO~~

Please refer to the `README.md` files in the respective sub-folders for instructions and documentation.

## Access
The modules are running at https://ines-gpu-01.informatik.uni-mannheim.de/meh.

## Setup and Continuous Deployment
See [here](docs/setup.md).

## MQTT Communication
See [here](docs/mqtt.md).

## Messages for a full dellivery
See [here](docs/showcase.md).