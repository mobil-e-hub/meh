import time

from optimization_engine.optimization_engine import OptimizationEngine
from mqtt_client import MQTTClient


print("START CLIENT 2")

# second client to check receive / publish of OptEngine
bar = MQTTClient()
bar.change_client_name("toest-client")
bar.begin_client()
bar.subscribe('mission')




print("quick nap before publishing:")
time.sleep(8)

bar.publish('mobil-e-hub/sim/to/hub/test',  'init')
time.sleep(8)

bar.publish('mobil-e-hub/v0/to/drone/42/state', 'BOOM')