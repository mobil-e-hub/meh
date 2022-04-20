# Connector: Message forwarder (node.js server) for mobil-e-Hub
Authors:
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Description
This module simply connects Azure EventGrid and MQTT broker by forwarding messages to the other component. 

**Note that topics received from EventGrid must not be subscribed to (otherwise, there will be an infinite forwarding loop)!**

## Communication with MQTT -
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


### EventGrid message
An EventGrid message is the body of a POST request and therefore in JSON format. Its schema is:

```json
[
  {
    "eventType": "[root]",
    "dataVersion": "[version]",
    "subject": "[entity]/[id]/[...args]",
    "data": "[arbitrary JSON data]"
  }
]
```

## Testing

This module can be manually tested with any mqtt client (e.g. [this one](http://www.hivemq.com/demos/websocket-client/)), and the api testing tool [Postman](https://www.postman.com).
The MQTT to EventGrid direction can be tested in [this](../README.md#Testing) way. 

For the other direction send an HTTP Post Request via Postman to the EventGrid Endpoint as described [here](https://social.technet.microsoft.com/wiki/contents/articles/53692.azure-eventgrid-submitting-from-postman-to-custom-topic.aspx). 
If the EventGrid cannot be accessed the messages can also be send directly to the connector at ``https://ines-gpu-01.informatik.uni-mannheim.de/meh/connector``. 
For the body format select the *raw* checkbox and pick JSON.
Then the body content needs to follow the schema described in the paragraph [above](./README.md#EventGrid message), with at least the four keys that can be seen there.
