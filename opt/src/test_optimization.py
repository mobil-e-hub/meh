from optimization_engine.optimization_engine import OptimizationEngine
# TODO - browser based client for sending MQTT-msgs: http://www.hivemq.com/demos/websocket-client/
#      - following currently not working: DEBUG!!
#           - other testing option: run script test_extra_client in parallel
#             --> pycharm: edit run configs --> check allow parallel run


# start Optimization Engine
foo = OptimizationEngine()
foo.begin_client()

# TODO not reached after
foo.subscribe("bar_test")



