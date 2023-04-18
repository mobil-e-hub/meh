import json
from uuid import uuid4
import logging


class OptimizationEngine:
	def __init__(self, mqtt_client):
		self.client = mqtt_client
		self.callbacks = {
			'+/+/status': self.on_message_status,
			'order/+/placed': self.on_message_order_placed,
			'hub/+/parcel/+/placed': self.on_message_parcel_placed,
			'parcel/+/delivered': self.on_message_parcel_delivered
		}

		self.hubs = {}
		self.cars = {}
		self.drones = {}
		self.orders = {}

	def on_message_status(self, client, userdata, msg):
		try:
			project, version, entity, id_, *args = str(msg.topic).split('/')
			status = json.loads(msg.payload)

			if entity == 'hub':
				self.hubs[id_] = status
			elif entity == 'drone':
				self.drones[id_] = status
			elif entity == 'car':
				self.cars[id_] = status
		except BaseException as e:
			logging.warn(f'Could not update entity status ({repr(e)})!')
			self.publish(f'opt/{self.client.id}/error', repr(e))

	def on_message_order_placed(self, client, userdata, msg):
		try:
			project, version, entity, id_, *args = str(msg.topic).split('/')
			order = json.loads(msg.payload)

			self.orders[id_] = order

			logging.debug(f'Order placed!')
			logging.debug(f'self.orders = {self.orders}')
		except BaseException as e:
			logging.warn(f'Could not store order ({repr(e)})!')
			self.publish(f'opt/{self.client.id}/error', repr(e))

	def on_message_parcel_placed(self, client, userdata, msg):
		try:
			project, version, _, car_id, entity, parcel_id, *args = str(msg.topic).split('/')
			logging.debug(f'Received parcel/placed message. Current orders: {self.orders}')
			parcel = next(filter(lambda order: order['id'] == parcel_id, self.orders.values()))
			parcel['carrier'] = { 'type': 'car', 'id': car_id }

			logging.debug(f'Parcel placed ({parcel})!')
			self.publish(f'parcel/{parcel_id}/transfer', parcel)

			self.send_missions(parcel)
		except StopIteration as e:
			logging.warn(f'Placed parcel not found in orders!')
			self.publish(f'opt/{self.client.id}/error', f'Placed parcel not found in orders!')
		except BaseException as e:
			logging.warn(f'Could not send missions ({repr(e)})!')
			self.publish(f'opt/{self.client.id}/error', repr(e))

	def on_message_parcel_delivered(self, client, userdata, msg):
		try:
			project, version, entity, id_, *args = str(msg.topic).split('/')
			parcel = json.loads(msg.payload)

			logging.debug(parcel)

			del self.orders[parcel['orderId']]
			logging.debug(f'Parcel delivered ({id_})!')
		except BaseException as e:
			logging.warn(f'Error: {e}!')
			self.publish(f'opt/{self.client.id}/error', repr(e))


#	def on_message_clear_entities(self, client, userdata, msg):
#		self.hubs = {}
#		self.drones = {}
#		self.cars = {}


	def publish(self, topic, message):
		self.client.publish(topic, message)


class OptimizationEngineTest0(OptimizationEngine):
	def __init__(self, mqtt_client):
		super().__init__(mqtt_client)
		self.callbacks = {
			'+/+/status': self.on_message_status
		}

	def on_message_status(self, client, userdata, msg):
		print(f'OptimizationEngineTest0 received status message {msg}!')


class OptimizationEngineShowcase0(OptimizationEngine):

	def send_missions(self, parcel):
		assert len(self.hubs) == 1, 'There has to be exactly one hub.'
		assert len(self.cars) == 1, 'There has to be exactly one car.'
		assert len(self.drones) == 1, 'There has to be exactly one drone.'

		hub, car, drone = list(self.hubs.values())[0], list(self.cars.values())[0], list(self.drones.values())[0]

		transaction_1 = {
			"id": str(uuid4()),
			"from": {"type": "car", "id": car['id']},
			"to": {"type": "drone", "id": drone['id']},
			"parcel": parcel
		}

		transaction_2 = {
			"id": str(uuid4()),
			"from": {"type": "drone", "id": drone['id']},
			"to": {"type": "hub", "id": hub['id']},
			"parcel": parcel
		}

		position_1 = {"lat": 0.0, "long": 0.0, "alt": 0.0}
		position_2 = {"lat": 1.0, "long": 0.0, "alt": 0.0}
		position_3 = {"lat": 0.0, "long": 1.0, "alt": 0.0}
		position_4 = {"lat": 1.0, "long": 1.0, "alt": 0.0}

		hub_mission = {
			"id": str(uuid4()),
			"tasks": [
				{
					"type": "pickup",
					"state": "TaskState.notStarted",
					"transaction": transaction_2
				}
			]
		}

		car_mission = {
			"id": str(uuid4()),
			"tasks": [
				{
					"type": "dropoff",
					"state": "TaskState.notStarted",
					"transaction": transaction_1
				}
			]
		}

		drone_mission = {
			"id": str(uuid4()),
			"tasks": [
				{
					"type": "move",
					"state": "TaskState.notStarted",
					"destination": position_2,
					"minimumDuration": 10
				},
				{
					"type": "pickup",
					"state": "TaskState.notStarted",
					"transaction": transaction_1
				},
				{
					"type": "move",
					"state": "TaskState.notStarted",
					"destination": position_3,
					"minimumDuration": 10
				},
				{
					"type": "dropoff",
					"state": "TaskState.notStarted",
					"transaction": transaction_2
				},
				{
					"type": "move",
					"state": "TaskState.notStarted",
					"destination": position_4,
					"minimumDuration": 10
				}
			]
		}

		self.publish(f'hub/{hub["id"]}/mission', hub_mission)
		self.publish(f'car/{car["id"]}/mission', car_mission)
		self.publish(f'drone/{drone["id"]}/mission', drone_mission)

#	def on_message_add_dummy_entities(self, client, userdata, msg):
#		if not self.hubs:
#			hub_id = uuid4()
#			self.hubs = { hub_id: { 'id': hub_id } }
#		if not self.drones:
#			drone_id = uuid4()
#			self.drones = { drone_id: { 'id': drone_id } }
#		if not self.cars:
#			car_id = uuid4()
#			self.cars = { car_id: {'id': car_id } }
#