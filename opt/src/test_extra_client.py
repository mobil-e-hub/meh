import time

from optimization_engine.optimization_engine import OptimizationEngine
from mqtt_client import MQTTClient

# second client to check receive / publish of OptEngine
bar = MQTTClient()
bar.change_client_name("toest-client")
bar.begin_client()
bar.subscribe('mission')

print("START CLIENT 2")

# start Optimization Engine
foo = OptimizationEngine()
foo.begin_client()

print("quick nap before publishing:")
time.sleep(8)

bar.publish_to('drone/d00', 'foo/töst/', 'init')
time.sleep(8)

bar.publish('toest', 'BOOM')


