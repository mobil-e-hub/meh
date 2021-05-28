from optimization_engine.optimization_engine import OptimizationEngine
from mqtt_client import MQTTClient


bar = MQTTClient()
foo = OptimizationEngine(bar)

bar.begin()
bar.terminate()
