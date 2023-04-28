# mobil-e-Hub: Intelligent Drone Logistics Network
## Showcase: Complete MQTT Communication (WIP)
### Task Description
#### Task
The Parcel is manually placed on the Car, then picked up by the Drone and dropped off to the Hub.

#### Involved Entities
- Hub `aef6d0fd-d150-4435-9c73-3b3339b77582`, placed at node `n00`
- Drone `52715405-c8a0-4f53-8fb5-ffd54696200c`, starting at (0.5, 0, 0)
- Car `3406a877-6f20-4d27-bac5-08b62a44326a`, starting at node (1.5, 0, 0)
- Parcel `a64bcadb-6967-4407-ba06-8abf2182a1d0`, to be placed at the hub

#### Illustration
![meh-scenario-1 drawio (1)](https://user-images.githubusercontent.com/71136528/172798485-28dc5ee6-1548-4608-98ce-282d7fbb2f9d.png)

### Topology
In production, nodes and egdes will also have UUIDs!
```
{
  'topology': {
    'nodes': {
      'n00': { 'id': 'n00', 'position': { 'lat': 0.0, 'long': 0.0, 'alt': 0.0 }, 'type': 'air' },
      'n01': { 'id': 'n01', 'position': { 'lat': 1.0, 'long': 0.0, 'alt': 0.0 }, 'type': 'parking' },
      'n02': { 'id': 'n02', 'position': { 'lat': 2.0, 'long': 0.0, 'alt': 0.0 }, 'type': 'parking' },
      'n03': { 'id': 'n03', 'position': { 'lat': 2.0, 'long': 1.0, 'alt': 0.0 }, 'type': 'parking' },
      'n04': { 'id': 'n04', 'position': { 'lat': 1.0, 'long': 1.0, 'alt': 0.0 }, 'type': 'parking' }
     },
    'edges': {
      'e00': { 'id': 'e00', 'from': 'n00', 'to': 'n01', 'type': 'air', 'distance': 1.0 },
      'e01': { 'id': 'e01', 'from': 'n01', 'to': 'n00', 'type': 'air', 'distance': 1.0 },
      'e02': { 'id': 'e02', 'from': 'n01', 'to': 'n02', 'type': 'air', 'distance': 1.0 },
      'e03': { 'id': 'e03', 'from': 'n02', 'to': 'n03', 'type': 'air', 'distance': 1.0 },
      'e04': { 'id': 'e04', 'from': 'n03', 'to': 'n04', 'type': 'air', 'distance': 1.0 },
      'e05': { 'id': 'e05', 'from': 'n04', 'to': 'n01', 'type': 'air', 'distance': 1.0 },
      'e06': { 'id': 'e06', 'from': 'n01', 'to': 'n04', 'type': 'air', 'distance': 1.0 }
    }
  },
  'addresses': {
    '2a277e9d-aa5a-4fc2-a119-5e749c184a59': { 'id': '2a277e9d-aa5a-4fc2-a119-5e749c184a59', 'position': { 'lat': 0.0, 'long': 0.0, 'alt': 0.0 }, 'name': 'Hubstr. 1' }
  },
  'customers': {
    '338f36e9-bfbf-448e-9518-7acc20baf9e3': { 'id': '338f36e9-bfbf-448e-9518-7acc20baf9e3', 'name': 'Sample Customer', 'address': '2a277e9d-aa5a-4fc2-a119-5e749c184a59' }
  },
  'entities': {
    'hubs': {
      'aef6d0fd-d150-4435-9c73-3b3339b77582': { 'id': 'aef6d0fd-d150-4435-9c73-3b3339b77582', 'position': 'n00' }
    },
    'drones': {
      '52715405-c8a0-4f53-8fb5-ffd54696200c': { 'id': '52715405-c8a0-4f53-8fb5-ffd54696200c', 'position': { 'lat': 1.0, 'long': 0.0, 'alt': 0.0 } }
    },
    'cars': {
      '3406a877-6f20-4d27-bac5-08b62a44326a': { 'id': '3406a877-6f20-4d27-bac5-08b62a44326a', 'position': { 'lat': 2.0, 'long': 0.0, 'alt': 0.0 } }
    }
  }
```

### Communication
#### Order Placement (sent from Orchestrator)
As soon as a customer completes an order in the shop system, the shop notifies the orchestrator which then sends an orderPlaced message:
##### HTTP call from Orchestrator to MQTT Connector
`POST https://ines-gpu-01.informatik.uni-mannheim.de/meh/connector`
```json
{
    "boxId": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
    "transportId": "1922193319441955",
    "partnerId": "d4c84cbb-4a3b-41f7-9079-5bf678198336",
    "timestamp": "2022-01-27T19:00:00Z",
    "startLocation": {
        "platformId": "aef6d0fd-d150-4435-9c73-3b3339b77582"
    },
    "destinationLocation": {
        "platformId": "aef6d0fd-d150-4435-9c73-3b3339b77582"
    }
}
```

This message is converted into an MQTT message and sent to the broker:
##### MQTT message from MQTT Connector 
`mobil-e-hub/v1/order/1922193319441955/placed`
```json
{
    "id": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
    "orderId": "1922193319441955",
    "carrier": null,
    "destination": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" }
}
```
This means that the order is in the system, and we're now waiting for the corresponding box to be placed in a hub.

As soon as the hub detects a box, it sends a message:
#### Parcel Placement (sent from Hub)
`mobil-e-hub/v1/hub/aef6d0fd-d150-4435-9c73-3b3339b77582/parcel/a64bcadb-6967-4407-ba06-8abf2182a1d0/placed` (no content)

This message is converted by the connector into an HTTP message for the orchestrator

`POST orchstreator.url`
```json
{
  "boxId": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "transportId": "123456789123456789",
  "location": { "platformId": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
  "state": "WaitingForTransport"
}
```

The optimization engine receives the parcelPlaced message, looks up the box ID in the list of orders and creates missions:
#### Missions (sent from Optimization Engine)
##### Hub mission
`mobil-e-hub/v1/hub/aef6d0fd-d150-4435-9c73-3b3339b77582/mission`
```json
{
  "id": "209ce34a-8187-4cf6-b22c-5f0a8cff9c0f",
  "tasks": [
    { 
      "type": "dropoff", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "646068b9-7814-4e08-a05e-752581b374a6",
        "from": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
        "to": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    },
    { 
      "type": "pickup", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "54e08383-2fff-485b-b7d8-f4b444383d89",
        "from": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "to": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    }
  ]
}
```

##### Drone mission
`mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/mission`
```json
{
  "id": "2dc1eda2-2c81-4ea3-b187-a19a3d6d0aa1",
  "tasks": [
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 0.0, "long": 0.0, "alt": 0.0 },
      "minimumDuration": 10
    },
    { 
      "type": "pickup", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "646068b9-7814-4e08-a05e-752581b374a6",
        "from": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
        "to": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 1.0, "long": 0.0, "alt": 0.0 },
      "minimumDuration": 10
    },
    { 
      "type": "dropoff", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "e786533c-9b72-4dfe-81ed-f1a80f2ed42e",
        "from": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "to": { "type": "car", "id": "3406a877-6f20-4d27-bac5-08b62a44326a" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 1.0, "long": 1.0, "alt": 0.0 },
      "minimumDuration": 10
    },
    { 
      "type": "pickup", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "e474e964-d5f1-4e73-b256-6e59eb4bda78",
        "from": { "type": "car", "id": "3406a877-6f20-4d27-bac5-08b62a44326a" },
        "to": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 1.0, "long": 0.0, "alt": 0.0 },
      "minimumDuration": 10
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 0.0, "long": 0.0, "alt": 0.0 },
      "minimumDuration": 10
    },
    { 
      "type": "dropoff", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "54e08383-2fff-485b-b7d8-f4b444383d89",
        "from": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "to": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    }
  ]
}
```

##### Car mission
`mobil-e-hub/v1/car/3406a877-6f20-4d27-bac5-08b62a44326a/mission`
```json
{
  "id": "fc0adcef-a123-417b-b61c-0a99f4789aee",
  "tasks": [
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 1.0, "long": 0.0, "alt": 0.0 },
      "minimumDuration": 10
    },
    { 
      "type": "pickup", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "e786533c-9b72-4dfe-81ed-f1a80f2ed42e",
        "from": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "to": { "type": "car", "id": "3406a877-6f20-4d27-bac5-08b62a44326a" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 2.0, "long": 0.0, "alt": 0.0 },
      "minimumDuration": 3
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 2.0, "long": 1.0, "alt": 0.0 },
      "minimumDuration": 3
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 2.0, "long": 0.0, "alt": 0.0 },
      "minimumDuration": 3
    },
    { 
      "type": "dropoff", 
      "state": "TaskState.notStarted",
      "transaction": {
        "id": "e474e964-d5f1-4e73-b256-6e59eb4bda78",
        "from": { "type": "car", "id": "3406a877-6f20-4d27-bac5-08b62a44326a" },
        "to": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
        "parcel": "a64bcadb-6967-4407-ba06-8abf2182a1d0"
      }
    },
    {
      "type": "move",
      "state": "TaskState.notStarted",
      "destination": { "lat": 2.0, "long": 1.0, "alt": 0.0 },
      "minimumDuration": 0
    }
  ]
}
```

#### Entity State Updates (sent from respective entities)
##### Drone state update
`mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/status`
```json
{
  "id": "52715405-c8a0-4f53-8fb5-ffd54696200c",
  "position": {
    "lat": 1.0,
    "lon": 0.0,
    "alt": 0.0
  },
  "speed": 10,
  "parcel": null,
  "state": "0"
}
```
These messages are sent continuously while the drone moves.

##### Car state update 
`mobil-e-hub/v1/car/3406a877-6f20-4d27-bac5-08b62a44326a/status`
```json
{
  "id": "3406a877-6f20-4d27-bac5-08b62a44326a",
  "position": {
    "lat": 2.0,
    "lon": 0.0,
    "alt": 0.0
  },
  "speed": 10,
  "parcel": null,
  "capacity": 1, 
  "state": "0"
}
```
These messages are sent continuously while the car moves.

#### First Transaction (from hub to drone)
- `mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/transaction/646068b9-7814-4e08-a05e-752581b374a6/ready` (no content)
- `mobil-e-hub/v1/hub/aef6d0fd-d150-4435-9c73-3b3339b77582/transaction/646068b9-7814-4e08-a05e-752581b374a6/execute` (no content)
- `mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/transaction/646068b9-7814-4e08-a05e-752581b374a6/complete` (no content)

After the transaction is complete, the receiving entity (drone) updates the `carrier` property of the parcel and sends a parcelTransfer message:
`mobil-e-hub/v1/parcel/a64bcadb-6967-4407-ba06-8abf2182a1d0/transfer`
```json
{
  "id": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "orderId": "1922193319441955",
  "carrier": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
  "destination": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" }
}
```

This message is converted by the connector into an HTTP message for the orchestrator

`POST orchstreator.url`
```json
{
  "boxId": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "transportId": "1922193319441955",
  "location": { "platformId": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
  "state": "InTransportInAir"
}
```

Moreover, the drone checks if the current carrier of the parcel is the same as its destination. If so, it sends a parcelDelivered message (see below).

#### Second Transaction (from drone to car)
- `mobil-e-hub/v1/car/3406a877-6f20-4d27-bac5-08b62a44326a/transaction/e786533c-9b72-4dfe-81ed-f1a80f2ed42e/ready` (no content)
- `mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/transaction/e786533c-9b72-4dfe-81ed-f1a80f2ed42e/execute` (no content)
- `mobil-e-hub/v1/car/3406a877-6f20-4d27-bac5-08b62a44326a/transaction/e786533c-9b72-4dfe-81ed-f1a80f2ed42e/complete` (no content)

After the transaction is complete, the receiving entity (car) updates the `carrier` property of the parcel and sends a parcelTransfer message:
`mobil-e-hub/v1/parcel/a64bcadb-6967-4407-ba06-8abf2182a1d0/transfer`
```json
{
  "id": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "orderId": "1922193319441955",
  "carrier": { "type": "car", "id": "3406a877-6f20-4d27-bac5-08b62a44326a" },
  "destination": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" }
}
```

This message is converted by the connector into an HTTP message for the orchestrator

`POST orchstreator.url`
```json
{
  "boxId": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "transportId": "1922193319441955",
  "location": { "platformId": "3406a877-6f20-4d27-bac5-08b62a44326a" },
  "state": "InTransport"
}
```

#### Third Transaction (from car to drone)
- `mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/transaction/e474e964-d5f1-4e73-b256-6e59eb4bda78/ready` (no content)
- `mobil-e-hub/v1/car/3406a877-6f20-4d27-bac5-08b62a44326a/transaction/e474e964-d5f1-4e73-b256-6e59eb4bda78/execute` (no content)
- `mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/transaction/e474e964-d5f1-4e73-b256-6e59eb4bda78/complete` (no content)

After the transaction is complete, the receiving entity (drone) updates the `carrier` property of the parcel and sends a parcelTransfer message:
`mobil-e-hub/v1/parcel/a64bcadb-6967-4407-ba06-8abf2182a1d0/transfer`
```json
{
  "id": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "orderId": "1922193319441955",
  "carrier": { "type": "drone", "id": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
  "destination": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" }
}
```

This message is converted by the connector into an HTTP message for the orchestrator

`POST orchstreator.url`
```json
{
  "boxId": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "transportId": "1922193319441955",
  "location": { "platformId": "52715405-c8a0-4f53-8fb5-ffd54696200c" },
  "state": "InTransportInAir"
}
```

#### Fourth Transaction (from drone to hub)
- `mobil-e-hub/v1/hub/aef6d0fd-d150-4435-9c73-3b3339b77582/transaction/54e08383-2fff-485b-b7d8-f4b444383d89/ready` (no content)
- `mobil-e-hub/v1/drone/52715405-c8a0-4f53-8fb5-ffd54696200c/transaction/54e08383-2fff-485b-b7d8-f4b444383d89/execute` (no content)
- `mobil-e-hub/v1/hub/aef6d0fd-d150-4435-9c73-3b3339b77582/transaction/54e08383-2fff-485b-b7d8-f4b444383d89/complete` (no content)

After the transaction is complete, the receiving entity (hub) updates the `carrier` property of the parcel and sends a parcelTransfer message:
`mobil-e-hub/v1/parcel/a64bcadb-6967-4407-ba06-8abf2182a1d0/transfer`
```json
{
  "id": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "orderId": "1922193319441955",
  "carrier": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
  "destination": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" }
}
```

Afterwards, the hub checks if the current carrier of the parcel is the same as its destination. If so, it sends a parcelDelivered message:
`mobil-e-hub/v1/parcel/a64bcadb-6967-4407-ba06-8abf2182a1d0/delivered`
```json
{
  "id": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "orderId": "1922193319441955",
  "carrier": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
  "destination": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" }
}
```

This message is converted by the connector into an HTTP message for the orchestrator

`POST orchstreator.url`
```json
{
  "boxId": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "transportId": "1922193319441955",
  "location": { "platformId": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
  "state": "Delivered"
}
```

#### Pick-up from the hub
When the customer picks the parcel up at the hub (i.e., physically removes the parcel from the hub), the hub sends a parcelCollected message:
`mobil-e-hub/v1/parcel/a64bcadb-6967-4407-ba06-8abf2182a1d0/collected`
```json
{
  "id": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "orderId": "1922193319441955",
  "carrier": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
  "destination": { "type": "hub", "id": "aef6d0fd-d150-4435-9c73-3b3339b77582" }
}
```

This message is converted by the connector into an HTTP message for the orchestrator

`POST orchstreator.url`
```json
{
  "boxId": "a64bcadb-6967-4407-ba06-8abf2182a1d0",
  "transportId": "1922193319441955",
  "location": { "platformId": "aef6d0fd-d150-4435-9c73-3b3339b77582" },
  "state": "Completed"
}
```
