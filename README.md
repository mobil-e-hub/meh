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
Communication between the components is via MQTT over the private the private mosquitto MQTT broker `wss://ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt`.
For more details and a list of all topics currently used in this project look into the documentation of the MQTT Connector module [here](connector/README.md).




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
| `.../meh/wss/.*` | 3002 | Websocket  |  | |
| `.../meh/connector` | 3004 | Connector | js module mqtt: bridge mqtt - Eventgrid  | |
| `.../meh/viz/.*` | 8080 | vizualization | Vue app  |   |
| `.../meh/git` | 8081 | updater.js | Webhook for master branch |  |

<!-- TODO: analysis engine not deployed yet -->

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

The MQTT module forwards messages between the InES mqtt broker and the Azure Eventgrid. Its documentation can be found [here](connector/README.md)

### Monitoring 

The Monitoring page is an Angular App that regularly checks the accessibility of the other components and displays their state.
The monitored components are defined in the file `app.components.ts` in the Monitoring directory on the server.

---
## Workstream Alex/Tim
### Overview of Production Components
#### Control Center ("Mobilitätssystem")
- Written in Python
- Can send/receive messages to/from MQTT broker
- Reacts to incoming status updates (of drones, cars, parcels, traffic, ...) with re-routing according to updated optimal delivery schedule
- Runs permanently on InES server

#### Visualization
- Written in Vue.js
- Runs on InES machine (previously deployed as a static website on Github Pages)
- Can receive messages from MQTT broker
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
- Contains the Control Center ("Mobilitätssystem") (- TODO the _Optimization Engine??_)



## Interaction of Drones and Platforms with the MQTT Broker
Platforms are either stationary (in this case, the platform is called a `hub` in MQTT topics/messages) or attached to a vehicle (in this case, it is called a `car`). Drones are always called `drone`. In the following, drones and platforms are called "entities" if an interaction applies to both types.

### Message format
Each MQTT message consists of two strings: A _topic_ and a _payload_. The topic is expected to have the format `[project]/[version]/[entity]/[id]/[args]`, where `project` is always `mobil-e-hub`, and `version` is `v1`. `args` must be non-empty, but can contain forward slashes. The payload is expected to be in JSON format.

### Initial message upon connection
The entity connects to the MQTT broker using the respective credentials and an ID in the UUID v4 format. After the connection has been established, the entity must send a message with topic `[project]/[version]/[entity]/[id]/connected` and empty payload. This allows the optimization engine to add the entity to its registry, e.g., for mission planning.
TODO: Last will/`disconnect` message?

### Terminal message before disconnect - [WIP]
In the case of a disconnect - both deliberate or accidental -  a disconnect message with the topic `[project]/[version]/[entity]/[id]/disconnected` should be send by the entity.

In case of an accidental connection loss the _Last will_ MQTT feature can be used to ensure delivery of this message.
TODO: different messages for deliberate/ accidental disconnect ???


### Updates of entity state
Each entity is expected to send a message with topic `[project]/[version]/[entity]/[id]/state` and entity-specific payload whenever its state changes. During the execution of a mission, this should be a steady stream of messages for position updates, e.g., every 100 ms.
In the following the expected payload contents for the different entities are explained:

#### Drone state
- `id: string` 
- `pos: (number, number, number)` = ("lon", "lat", "alt")
- `speed: number`
- `parcel: object` = (parcel object - null if no parcel loaded) 
- `state: number`= [0-4], see DroneState description [here](./sim/README.md#EntityStates).

#### Car state
- `id: string` 
- `pos: (number, number, number)` = ("lon", "lat", "alt")
- `speed: number`
- `capacity: number`
- `parcel: array` = (parcel object - empty if no parcel loaded)
- `state: number`= [0-4], see CarState description [here](./sim/README.md#EntityStates).


#### Hub state
- `id: string` 
- `pos: string` = nodeID
- `capacity: number`
- `transactions: object` = (transaction objects - empty if no parcel loaded)
- `parcel: object` = (parcel objects - empty if no parcel loaded)




#### Parcel state
**--!! Send by current carrier!!--**
- `id: string` 
- `carrier: object` = some entity
- `destination: object` = some entity
- `state: number`= [0-7], see ParcelState description [here](./sim/README.md#EntityStates).


### Missions
Whenever a new parcel is placed, or a re-planning of an existing delivery is necessary, the optimization engine calculates the optimal route and sends out a `mission` to each entity which is part of the delivery, using the topic `[project]/[version]/[entity]/[id]/mission`. An entity which receives a mission replaces any existing mission, and immediately starts executing the new mission. Missions include movements and transactions. Note that the mission sent to an entity consists of _all_ deliveries that the entity is expected to participate in, as well as the movements in between (for cars and drones), and the return to a platform after the completion of all deliveries (for drones).

#### Mission format
A detailed description of the Mission format can be found in the [wiki of this repo](../../wiki/Missions-structure).
The optimization engine can send mock missions that can be triggered by a MQTT message with the topic `[project]/[version]/test/[1-3]` as explained [here](connector/README.md#Communication with MQTT).

### Messages on behalf of other entities
Since parcels do not have their own MQTT client, the entity which currently carries a parcel must also send and receive messages concerning the parcel. This means that, when receiving a parcel (either via a transaction or via manual placement, in case of a hub), the entity must send messages with the topic `[project]/[version]/parcel/[id]/#` at appropriate times.


### Topics to subscribe to
#### Permanent subscriptions
- `[project]/[version]/[entity]/[id]/mission`

#### Temporary subscriptions
- `[project]/[version]/[entity]/[id]/transaction/[id]/ready`
- `[project]/[version]/[entity]/[id]/transaction/[id]/unready`
- `[project]/[version]/[entity]/[id]/transaction/[id]/execute`
- `[project]/[version]/[entity]/[id]/transaction/[id]/complete`


### Topics to send
#### Permanently
- `[project]/[version]/[entity]/[id]/connected`
- `[project]/[version]/[entity]/[id]/state`
- `[project]/[version]/[entity]/[id]/mission/complete`
- `[project]/[version]/[entity]/[id]/mission/failed`
- `[project]/[version]/[entity]/[id]/error`

#### Temporarily
- `[project]/[version]/parcel/[id]/placed`
- `[project]/[version]/parcel/[id]/transfer`
- `[project]/[version]/parcel/[id]/delivered`
- `[project]/[version]/[entity]/[id]/transaction/[id]/ready`
- `[project]/[version]/[entity]/[id]/transaction/[id]/unready`
- `[project]/[version]/[entity]/[id]/transaction/[id]/execute`
- `[project]/[version]/[entity]/[id]/transaction/[id]/complete`



### TODOs

