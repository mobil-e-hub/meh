# External modules
from flask import Flask
import os
import logging
from dotenv import load_dotenv

# Internal modules
from optimization_engine.optimization_engine import OptimizationEngine

from mqtt_client import MQTTClient

# TODO add logging
#       Reihenfolge? -> erst server -> opt_engine -> start Mqtt Loop

# Environment variables
load_dotenv()
port = int(os.environ.get('OPT_PORT', 3001))

# Setup
app = Flask(__name__)

opt = OptimizationEngine()  # inherits from MQTTClient
opt.begin_client()

# Endpoints
@app.route('/ping')
def ping():
    return {'opt': 'pong'}


# Endpoints
@app.route('/')
def base():
    return '''This is the base url of the optimization engine.
              <br>
              <br> <b>/ping:</b> Health-Check
              <br> <b>/ping/mqtt:</b> MQTT Health-Check'''


@app.route('/ping/mqtt')
def ping_mqtt():
    opt.publish('pong', 'optimization-engine')
    return {'mqtt': 'pong'}


app.run(port=port, debug=True)
logging.info(f"< Server listening at http://localhost:${port}.")


def receive():
    # trigger opt.create_delivery_route()  on topic: 'from/parcel/+/placed'
    # trigger opt.find_route()             on topic: 'from/order/+/placed'
    pass
