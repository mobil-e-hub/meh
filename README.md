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
- MQTT Connector (node.js server in `/connector`): This module forwards messages between the Azure EventGrid and the InES MQTT Broker.
- MQTT broker (Mosquitto in `/mqtt`): This module handles MQTT messages between clients.
- [WIP]Analysis Engine (Flask server in `/ana`): TODO

Please refer to the `README.md` files in the respective sub-folders for instructions and documentation.

## Installation and usage
To install the required packages and start all modules in parallel, run
```shell script
meh % npm run setup
meh % npm run start
```
The individual modules can also be started using the commands `npm run start:sim`, `npm run start:opt`, `npm run start:viz` and `npm run start:vue` etc..


## Interaction and Communication
Communication between the components is via MQTT.

### Communication with MQTT -
Communication between entities exclusively uses the private mosquitto MQTT broker `wss://ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt`.

All topics start with `mobil-e-hub/[version]/[entity]/[id]/`, and all messages are string representations of JSON objects.
For example each entity publishes `{ topic: mobil-e-hub/[version]/[entity]/[id]/connected, message: ''}` upon connection.

The following table lists all currently used topics in this project with short explanations on their usage

Entities comprise: *Hub, Drone, Car, Bus, Parcel, (Order)* - messages are sent by the corresponding simulators.
Other registered clients are the Vue.app `'visualization'` and the Optimization engine `'opt'`.


| Topic | Usage | Sender | Receiver | Payload (json) | Notes |
|---	|---	|--- |--- |--- |--- |
| `/[entity]/[id]/connected` | upon connection | Entity | all | | <!-- TODO double check: really used? or only state send? -->
| `/[entity]/[id]/state` | on state change | Entity | all | Entity Object |
| **Control:** | | | | |
| `/visualization/[id]/start` | when Start button is pressed in Viz | viz | all | - |
| `/visualization/[id]/pause` | when Pause button is pressed in Viz	| viz | all | - | 
| `/visualization/[id]/resume`  	| when Resume button is pressed in Viz 	| viz | all | - | 
| `/visualization/[id]/stop`	| when Stop button is pressed in Viz 	| viz | all | - |
| `/visualization/[id]/reset`	| when Reset button is pressed in Viz 	| viz | all | - |
| `/visualization/[id]/test`*	| used during DEV (Test Btn in Viz) | viz | all | - |
| **Orders / Parcels:**| | | | |
| `/visualization/[id]/place-order`  | WIP	| viz | ParcelSimulator | - | 
| `/order/[id]/placed`  | WIP	| ParcelSimulator | Entity, opt | - |
| `/visualization/[id]/place-parcel` | create new parcel  | viz | ParcelSimulator | Parcel Object | 
| `/parcel/[id]/placed` | parcel added to carrier (hub)  | ParcelSimulator | Entity, opt | Parcel Object |
| `/parcel/[id]/transfer` | when entities agreed on transaction | Entity | Parcel | Entity (Receiver) | success triggers `from/parcel/[id]/delivered` | 
| `/parcel/[id]/delivered` | parcel transfer success | Parcel | (Entity), opt | Parcel Object |  | <!-- TODO currently: only used by opt_engine--> 
| `/[parcel]/[id]/pickup` | DEPRECATED?	| Entity | Parcel | Entity Object (Carrier) |
| `/[parcel]/[id]/dropoff` | DEPRECATED? | Entity | Parcel | Entity Object (Carrier)  |
| **Transactions:** | | | | |
| `/[Entity]/[id]/transaction/[id]/ready`  	| Receiving Entity ready for transaction	| Entity (Receiver) | Entity (Giver)| - |
| `/[Entity]/[id]/transaction/[id]/unready`  	| Receiving Entity no longer ready for transaction | Entity (Receiver) | Entity (Giver), (Opt) | - |
| `/[Entity]/[id]/transaction/[id]/execute`  | Both ready, also sends `transfer` to parcel | Entity (Giver) | Entity (Receiver) | - | only send if `.../ready` was received |
| `/[Entity]/[id]/transaction/[id]/complete` | Transaction success | Entity (Receiver) | Entity (Giver) | - | |
| **Missions:** | | | | |
| `/[Entity]/[id]/mission` | assign new mission | opt | Entity | Mission Object | |
| `/[Entity]/[id]/mission/[id]/complete` | on mission success | Entity | all, opt | - | |
| `/[Entity]/[id]/mission/[id]/failed`	| WIP | Entity | all, opt| -  |  *not implemented yet* |
| **Error Handling:** | | | | |
| `/opt/error` | WIP: no route for parcel found | opt | viz | Parcel Object | |
| `/[Entity]/[id]/error/capacity/exceeded/[parcel]/[id]` | capacity full, could not receive new parcel | Entity | viz, opt | Entity Object | |
---


## Server Architecture
The following figure gives an overview of the components used:
<img src="https://i.ibb.co/FhrnpCM/structure-1.png" alt="Server Structure">
<!--- https://ibb.co/YNCbgwM --->

The Server URL is `https://ines-gpu-01.informatik.uni-mannheim.de`. 
All communication with the server uses SSL encryption over an NGINX proxy (Port 443).

In order to keep all modules up to date, GitHub performs a WebHook after every push to the master branch that is being forwarded to the 
updater service. This Node.js component then updates the project. A monitoring page (Angular) serves as a routing fallback and 
keeps track of the health of the individual service.

The latest version of the visualization can be found on [GitHub Pages](https://mobil-e-hub.github.io/meh/) which is 
linked to the _gh-pages_ branch. 
An [Action](https://github.com/mobil-e-hub/meh/actions/workflows/github-pages.yml) keeps it up to date.


### NGINX

An Nginx server forwards all requests from port 443 to the respective localhost ports that are listed here:

| request | port  | module | notes  |  |
|---|---|---|---|---|
| `.../meh/mqtt`  | 9001  | MQTT broker (mosquitto)  |  websocket |  |
| % | 1883  | MQTT broker (mosquitto)  | plain mqtt | not forwarded by nginx (9001 used instead) |
| `.../monitoring` | 4200 | Monitoring | Angular app  |   |
| `^~ /sockjs-node` | 4200 | SockJs Node | direct all remaining (not specified) locations to `/monitoring`  | |
| `.../meh/sim/.*` | 3000 | Simulation |  |   |
| `.../meh/opt/.*` | 3001 | Optimization engine |   |   |
| `.../meh/wss/.*` | 3002 | Websocket (?) | was genau macht der?  | TODO |
| `.../meh/connector` | 3004 | Connector | js module mqtt: bridge mqtt - Eventgrid  | TODO test |
| `.../meh/viz/.*` | 8080 | vizualization | Vue app  |   |
| `.../meh/git` | 8081 | updater.js | Webhook for master branch |  |

TODO: analysis engine not deployed yet?

### Mosquitto Broker

<!-- TODO -> how to see if it is running -->

#### Settings
The Mosquitto broker can be reached under `.../meh/mqtt` and the requests are forwarded by nginx 
over a websocket connection to localhost on 9001. 
The mosquitto installation can be found in the directory `C:\Program Files\mosquitto`, which also includes the configuration file `mosquitto.conf`.
The broker has an additional listener for pure mqtt protocol on port 1883. 

Clients need to authenticate themselves on connection with username and password. 
Valid username/password combinations are stored in the file `C:\Program Files\mosquitto\password_file`. 
The broker is configured to run as a background service, which ensures its automated launch at system startup. 
If a manual restart of the service is necessary this can be done with the command `net start mosquitto` from any directory, only the command prompt needs to be run as admin.
For debugging with console output it is also possible to stop this service with the command `net stop mosquitto` and start the broker with `mosquitto -v`. 

#### Testing

For a smoke test the broker installation comes with the mosquitto_pub and mosquitto_sub client utilities.  
To publish a message use the command `mosquitto_pub -h localhost -p [port] -u [username] -P [password] -t [topic] -m "[message]"`.
The subscriptions can be tested with the command `mosquitto_sub -h localhost -p [port] -t \[topic] -d`. In both cases the debug flag `-d` enable detailed logging. 

Testing the broker is also possible with an online MQTT client, e.g. [this one](http://www.hivemq.com/demos/websocket-client/).
To connect set host to `ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt` and port to `443`. After also entering username and password and checking the `SSL` checkbox, a click on the connect button will start the connection. 
The two panels below for publishing messages and subscription to topics can now be used for testing the broker, also from multiple webclients.

#### MQTT <> Eventgrid Message Forwarder

The MQTT module forwards messages between the InES mqtt broker and the Azure Eventgrid. Its documentation can be found [here](./mqtt/README.md)

### Monitoring 

The Monitoring page is an Angular App that regularly checks the accessibility of the other components and displays their state.
The monitored components are defined in the file `app.components.ts` in the Monitoring directory on the server.

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

### TODO
- Rename connector module from `mqtt` to `connector` (folder, monitoring, console logs, ...)
- Add JSON schema for input validation of MQTT/EventGrid messages
  Suggested schema:
  ```{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "type": "array",
  "items": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "eventType": {
            "type": "string",
            "const": "Microsoft.EventGrid.SubscriptionValidationEvent"
          },
          "topic": {
            "type": "string"
          },
          "data": {
            "type": "object",
            "properties": {
              "validationCode": {
                "type": "string"
              }
            },
            "required": [
              "validationCode"
            ]
          }
        },
        "required": [
          "eventType",
          "data"
        ]
      },
      {
        "type": "object",
        "properties": {
          "eventType": {
            "type": "string",
            "const": "Portal_Echo"
          }
        },
        "required": [
          "eventType"
        ]
      },
      {
        "type": "object",
        "properties": {
          "eventType": {
            "type": "string",
            "const": "mobil-e-hub"
          },
          "dataVersion": {
            "type": "string",
            "enum": ["v1"]
          },
          "subject": {
            "type": "string"
          },
          "data": {}
        },
        "required": [
          "eventType",
          "dataVersion",
          "subject",
          "data"
        ],
        "additionalProperties": false
      }
    ]
  }
}
```
- Rename connector module from `mqtt` to `connector` (folder, monitoring, console logs, ...)
- Clean up README files (top-level and modules)
- Merge or delete old branches
