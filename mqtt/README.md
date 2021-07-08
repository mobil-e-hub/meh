# meh-mqtt: Message forwarder (node.js server) for mobil-e-Hub
Authors:
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Description
This module simply connects Azure EventGrid and MQTT broker by forwarding messages to the other component. 

**Note that topics received from EventGrid cannot be subscribed to (otherwise, there will be an infinite forwarding loop)!**

## Message formats
### MQTT messages
An MQTT message consists of a topic and a message, both of which are strings.
#### Topic
The format of the topic is `[root]/[version]/[entity]/[id]/[...args]`, where the root is always `mobil-e-hub`.

#### Message
TODO


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
