# Connector: Message forwarder (node.js server) for mobil-e-Hub
Authors:
- Michael Oesterle (michael.oesterle@uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Description
This module connects Orchstrator and MQTT broker by forwarding messages to the other component. 

**Note that topics received from the Orchestrator must not be subscribed to (otherwise, there will be an infinite forwarding loop)!**

## Communication with MQTT
Communication between entities exclusively uses the private mosquitto MQTT broker `wss://ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt`.

All topics start with `mobil-e-hub/[version]/[entity]/[id]/`, and all messages are string representations of JSON objects.
For example each entity publishes `{ topic: mobil-e-hub/[version]/[entity]/[id]/connected, message: ''}` upon connection.

The following table lists all currently used topics in this project with short explanations on their usage

Entities comprise: Hub, Drone, Car, Parcel, and Order.
Other registered clients are the Vue app `viz` and the Optimization engine `opt`.


| Topic | Usage | Sender | Intended Receiver | Payload (JSON) | Notes |
|---	|---	|--- |--- |--- |--- |
| `/[entity]/[id]/connected` | upon connection | Entity | all | - | 
| `/[entity]/[id]/state` | on state change | Entity | all | Entity Object |
| **Control:** | | | | |
| `/viz/[id]/start` | when Start button is pressed in Viz | viz | all | - |
| `/viz/[id]/pause` | when Pause button is pressed in Viz	| viz | all | - | 
| `/viz/[id]/resume`  	| when Resume button is pressed in Viz 	| viz | all | - | 
| `/viz/[id]/stop`	| when Stop button is pressed in Viz 	| viz | all | - |
| `/viz/[id]/reset`	| when Reset button is pressed in Viz 	| viz | all | - |
| `/viz/[id]/test`*	| used during DEV (Test Btn in Viz) | viz | all | - |
| **Orders / Parcels:**| | | | |
| `/order/[id]/placed`  | when order is placed in the shop system | Orchestrator | Entity, opt | - |
| `/hub/[id]/parcel/[id]/placed` | parcel physically placed in hub | Hub | opt | Parcel Object |
| `/parcel/[id]/transfer` | when entities completed a transaction | Entity | opt, Orchestrator | Parcel object |
| `/parcel/[id]/delivered` | when parcel has reached its destination hub | Entity | opt, Orchestrator | Parcel Object |
| **Transactions:** | | | | |
| `/[Entity]/[id]/transaction/[id]/ready` | Receiving Entity ready for transaction	| Entity (Receiver) | Entity (Giver)| - |
| `/[Entity]/[id]/transaction/[id]/unready` | Receiving Entity no longer ready for transaction | Entity (Receiver) | Entity (Giver), (Opt) | - |
| `/[Entity]/[id]/transaction/[id]/execute` | Both ready, also sends `transfer` to parcel | Entity (Giver) | Entity (Receiver) | - | only send if `.../ready` was received |
| `/[Entity]/[id]/transaction/[id]/complete` | Transaction success | Entity (Receiver) | Entity (Giver) | - | |
| **Missions:** | | | | |
| `/[Entity]/[id]/mission` | assign new mission | opt | Entity | Mission Object | |
| `/[Entity]/[id]/mission/[id]/complete` | on mission success | Entity | all, opt | - | |
| `/[Entity]/[id]/mission/[id]/failed`	| WIP | Entity | all, opt| -  |  *not implemented yet* |
| **Error Handling:** | | | | |
| `/opt/error` | WIP: no route for parcel found | opt | viz | Parcel Object | |
| `/[Entity]/[id]/error/capacity/exceeded/[parcel]/[id]` | capacity full, could not receive new parcel | Entity | viz, opt | Entity Object | |
| **Testing** | | | | |
| `/test/1` | Mirror test mission | Entity | opt | JSON Mission | mirrors the mission in payload under the topic `drone/d01/mission` |
| `/test/2` | request fix test mission - only move tasks | Entity | opt | - | mission send under topic under the topic `drone/d01/mission`|
| `/test/3` | request fix test mission - all tasks | Entity | opt | - | mission send under topic under the topic `drone/d01/mission`|
---


## Message formats
### MQTT messages
An MQTT message consists of a topic and a message, both of which are strings.
#### Topic
The format of the topic is `[root]/[version]/[entity]/[id]/[...args]`, where the root is always `mobil-e-hub`.

#### Message
The message can be arbitrary JSON data, serialized as a string. It is parsed back to JSON before forwarding, which means that an invalid format will cause an error in `JSON.parse()` and therefore prevent forwarding.


### Orchestrator messages
An Orchestrator message is the body of a POST request and therefore in JSON format. There are currently two types of messages:
- Order placed: sent as `POST .../connector?topic=order-placed` with a payload which satisfies the `orderPlacedSchema`
- Order cancelled: sent as `POST .../connector?topic=order-cancelled` with a payload which satisfies the `statusUpdateSchema`

## Testing

This module can be manually tested with any mqtt client (e.g. [this one](http://www.hivemq.com/demos/websocket-client/)), and the api testing tool [Postman](https://www.postman.com).
The MQTT to Orchestrator direction can be tested in [this](../README.md#Testing) way. 

For the other direction send an HTTP Post Request via Postman to the connector at ``https://ines-gpu-01.informatik.uni-mannheim.de/meh/connector``. 
For the body format select the *raw* checkbox and pick JSON.
