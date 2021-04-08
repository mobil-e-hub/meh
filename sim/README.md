# meh-sim: Simulator (node.js server) for mobil-e-Hub
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Installation and usage
```shell script
meh % cd sim
sim % npm install
sim % npm run sim
```

## Communication with Azure Event Grid
This server receives Event Grid messages on the endpoint `POST /eventgrid`.
