from uuid import uuid4

class OptimizationEngine:
    def __init__(self, event_grid):
        self.id = str(uuid4())[0:8]
        self.event_grid = event_grid

        # Subscribe to relevant events
        self.event_grid.subscribe('parcel/+/placed', self.run)

    def run(self, topic, message):
        print('opt_engine.run()')
        self.publish('completed', { 'drones': [{ 'id': 'd00' }, { 'id': 'd01' }] })

    def publish(self, topic, message='', sender=''):
        sender = sender or f'optimization-engine/{self.id}'
        self.event_grid.publish(f'{sender}/{topic}', message)
