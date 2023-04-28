## Interaction and Communication
Communication between the components is via MQTT over the private mosquitto MQTT broker `wss://ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt`.
For more details and a list of all topics currently used in this project look into the documentation of the MQTT Connector module [here](connector/README.md).




## Server Architecture
The Server URL is `https://ines-gpu-01.informatik.uni-mannheim.de`. 
All communication with the server uses SSL encryption over an NGINX proxy (Port 443).

In order to keep all modules up to date, GitHub performs a WebHook after every push to the master branch that is being forwarded to the 
updater service. This Node.js component then updates the project. A monitoring page (Angular) serves as a routing fallback and 
keeps track of the health of the individual service.


### NGINX
An nginx server forwards all requests from port 443 to the respective localhost ports that are listed here:

| Request URL | Forwarding Port  | Module | Notes  |
|---|---|---|---|
| `/meh/sim` | 3000 | Simulation |  | 
| `/meh/opt` | 3001 | Optimization engine |   |
| `/meh/connector` | 3004 | Connector | js module mqtt: bridge MQTT <-> HTTP  |
| `/meh/monitoring` | 4200 | Monitoring | Angular app  | 
| `/meh/viz` | 8080 | vizualization | Vue app  | 
| `/meh/git` | 8081 | updater.js | Webhook for master branch | 
| `/meh/mqtt`  | 9001  | MQTT broker (mosquitto)  |  websocket |

### Mosquitto Broker
TODO: Add monitoring

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
#### Optimization Engine
- Written in Python
- Can send/receive messages to/from MQTT broker
- Reacts to incoming status updates (of drones, cars, parcels, traffic, ...) with re-routing according to updated optimal delivery schedule
- Runs permanently on InES server

#### Visualization
- Written in Vue.js
- Runs on InES machine
- Can receive messages from MQTT broker
- Shows current state of entire system (topology, drones, cars, hubs, parcels, ...) and KPIs (parcels delivered per hour, drone utilization, traffic jams, ...)

#### Connector
- Written in node.js
- Runs on InES machine
- Forwards messages from HTTP to MQTT and vice versa

### Development / Simulation Components
#### Simulation of drones / cars / parcels
- Written in node.js
- Runs on InES machine

#### Simulation of shop (order management)
- Simple UI which allows a customer to place an order and to view updates on existing orders (as an additional view in the Visualization)


