# External modules
from flask import Flask, request
import os
from dotenv import load_dotenv

# Internal modules
from src.mqtt import MQTT
from src.optimization_engine.optimization_engine import OptimizationEngine
from src.event_grid import EventGrid

# Environment variables
load_dotenv()
port = int(os.environ.get('OPT_PORT', 3001))

# Setup
app = Flask(__name__)
event_grid = EventGrid()
mqtt = MQTT()
opt = OptimizationEngine(event_grid, mqtt)


# Endpoints
@app.route('/')
def base():
    return '''This is the base url of the optimization engine.
              <br>
              <br> <b>/ping:</b> Health-Check
              <br> <b>/ping/eventgrid:</b> Eventgrid Health-Check
              <br> <b>/ping/mqtt:</b> MQTT Health-Check
              <br> <b>/eventgrid:</b> Eventgrid interface'''


@app.route('/ping')
def ping():
    return {'opt': 'pong'}


@app.route('/ping/eventgrid')
def ping_eventgrid():
    event_grid.publish('pong', 'optimization-engine')
    return {'eventgrid': 'pong'}


@app.route('/ping/mqtt')
def ping_mqtt():
    mqtt.publish('pong', 'optimization-engine')
    return {'mqtt': 'pong'}


# Endpoint for incoming EventGrid messages (both validation and MEH events)
@app.route('/eventgrid', methods=['POST'])
def eventgrid():
    try:
        events = request.get_json()
        for event in events:
            if event['eventType'] == 'Microsoft.EventGrid.SubscriptionValidationEvent':
                validation_code = event['data']['validationCode']
                print("Got a SubscriptionValidation event, validation code is: {}".format(validation_code))
                return {
                    "validationResponse": validation_code}  # No events are handled after receiving a SubscriptionValidationEvent
            elif event['eventType'] == 'mobil-e-hub':
                event_grid.receive(event)
            elif event['eventType'] == 'Portal_Echo':
                print(f'> (opt) Echo received')
    except Exception as err:
        print(f'Invalid EventGrid message received: {err}')
    finally:
        return ''


app.run(port=port, use_reloader=True)
