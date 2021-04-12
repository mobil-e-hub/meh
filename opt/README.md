# mobil-e-Hub: Optimization Engine
Authors: 
- Michael Pernpeintner (pernpeintner@es.uni-mannheim.de)
- Alexander Becker
- Tim Grams

Language: Python

## Purpose of this module
The Optimization Engine controls the routing of drones, parcels and cars in the mobil-e-Hub setup.

## Installation and usage
Create a virtual environment in the folder `/opt` and install the required packages before running the module:
```shell script
meh % cd opt
opt % python3 -m venv venv
opt % . venv/bin/activate
(venv) opt % pip install -r requirements.txt
(venv) opt % export FLASK_APP=src/server.py && export FLASK_ENV=development && flask run -p 3001
```

## Architecture


## Interaction with other modules
