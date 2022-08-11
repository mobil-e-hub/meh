# mobil-e-Hub: Monitoring
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

## Purpose of this module
The monitoring application allows to check if mobil-e-Hub components are reachable.

## Installation and usage
```shell script
meh % cd sim
monitoring % npm install
monitoring % npm run start:mac
```

Before running, the base-url has to be set in the [index.html](https://github.com/mobil-e-hub/meh/blob/master/monitoring/src/index.html) file.

The services which are monitored can be altered in the [configuration](https://github.com/mobil-e-hub/meh/blob/master/monitoring/src/assets/config.json).
