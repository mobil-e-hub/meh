# meh-sim: Visualization (Vue web app) for mobil-e-Hub
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Installation and usage
```shell script
meh % cd viz/vue
vue % npm install
vue % npm run vue
```

## Communication with EventGrid
Since EventGrid can only publish messages to an HTTP endpoint, communication with EventGrid is asymmetric: Messages can be directly sent via axios, but incoming messages are received over a web socket. Both directions are provided to Vue through the eventgrid wrapper plugin.

### Publishing messages to EventGrid
From a Vue component, call 
```javascript
this.$eventgrid.publish(topic, message='', sender='visualization/<id>');
```

### Receiving messages from EventGrid
In the `created()` lifecycle function, subscribe to topics using 
```javascript
this.$eventgrid.subscribe(pattern, handler);
```
