from optimization_engine.optimization_engine import OptimizationEngine
from mqtt_client import MQTTClient


# TODO browser based client for sending MQTT-msgs: http://www.hivemq.com/demos/websocket-client/

# bar = MQTTClient()
foo = OptimizationEngine()

foo.begin_client()

# bar.begin_client()
# bar.terminate()
