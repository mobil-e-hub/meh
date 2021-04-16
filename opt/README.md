# mobil-e-Hub: Optimization Engine
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

Language: Python

## Purpose of this module
The Optimization Engine controls the routing of drones, parcels and cars in the mobil-e-Hub setup.

## Installation and usage
To install the required packages and create a virtual environment for the Flask server, run
```shell script
opt % npm run install
```

Afterwards, you can start the server by running
```shell script
opt % npm run opt
```

## Architecture
### Endpoints
#### `GET /ping`
Returns `{ "opt": "pong" }`.

#### `GET /ping/eventgrid`
Returns `{ "eventgrid": "pong" }` and publishes an EventGrid message with topic _pong_ and message _optimization-engine_.

#### `POST /eventgrid`
Receives messages from EventGrid. The following `eventType`s are supported:
- __Subscription Validation__ (`Microsoft.EventGrid.SubscriptionValidationEvent`)  
  Returns the code found in `data.validationCode` as a JSON object.
  
- __Portal Echo__ (`Portal_Echo`)  
  Prints a simple acknowledgement message to the console.
  
- __mobil-e-Hub__ (`mobil-e-hub`)  
  Calls `event_grid.receive(event)` for handling the message.


## Interaction with other modules
