# External modules
from flask import Flask, request
import os
from dotenv import load_dotenv

# Internal modules
from optimization_engine.optimization_engine import OptimizationEngine
from event_grid import EventGrid

# Environment variables
load_dotenv()
port = int(os.environ.get('OPT_PORT', 3001))

# Setup
app = Flask(__name__)
event_grid = EventGrid()
opt = OptimizationEngine(event_grid)


# Endpoints
@app.route('/ping')
def ping():
    return {'opt': 'pong'}


@app.route('/ping/eventgrid')
def ping_eventgrid():
    event_grid.publish('pong', 'optimization-engine')
    return {'eventgrid': 'pong'}


# Endpoint for incoming EventGrid messages (both validation and MEH events)
@app.route('/eventgrid', methods=['POST'])
def eventgrid():
    try:
        events = request.get_json()
        for event in events:
            if event['eventType'] == 'Microsoft.EventGrid.SubscriptionValidationEvent':
                validation_code = event['data']['validationCode']
                print("Got a SubscriptionValidation event, validation code is: {}".format(validation_code))
                return {"validationResponse": validation_code}  # No events are handled after receiving a # SubscriptionValidationEvent
            elif event['eventType'] == 'mobil-e-hub':
                event_grid.receive(event)
            elif event['eventType'] == 'Portal_Echo':
                print(f'> (opt) Echo received')
    except Error as err:
        print(f'Invalid EventGrid message received: {err}')
    finally:
        return ''


app.run(port=port)


def receive():
    # trigger opt.create_delivery_route()  on topic: 'from/parcel/+/placed'
    # trigger opt.find_route()             on topic: 'from/order/+/placed'
    pass
