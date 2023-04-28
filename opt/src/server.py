# External modules
from flask import Flask
import os
import logging
from dotenv import load_dotenv

# Internal modules
from mqtt_client import OptimizationEngineMQTTClient

# Environment variables
load_dotenv()
port = int(os.environ.get('OPT_PORT', 3001))

# Setup
app = Flask(__name__)

if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
    opt = OptimizationEngineMQTTClient(mode=('testworld', '0'))  # inherits from MQTTClient

# Endpoints
@app.route('/')
def base():
    return '''This is the base url of the optimization engine.
              <br>
              <br> <b>/ping:</b> Health-Check
              <br> <b>/ping/mqtt:</b> MQTT Health-Check'''


@app.route('/ping')
def ping():
    return {'opt': 'pong', 'version': 4}


@app.route('/ping/mqtt')
def ping_mqtt():
    opt.publish('pong', 'optimization-engine')
    return {'mqtt': 'pong'}


# Startup
app.run(port=port, use_reloader=True)
logging.info(f"< Server listening at http://localhost:${port}.")
