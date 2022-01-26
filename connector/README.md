# Connector: Message forwarder (node.js server) for mobil-e-Hub
Authors:
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Description
This module simply connects Azure EventGrid and MQTT broker by forwarding messages to the other component. 

**Note that topics received from EventGrid must not be subscribed to (otherwise, there will be an infinite forwarding loop)!**

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
