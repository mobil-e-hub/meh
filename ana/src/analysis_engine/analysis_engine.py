from mqtt_client import MQTTClient
import json
import logging
import os
from dotenv import load_dotenv

from analysis_engine.database import Database
from analysis_engine.JSONLogger import JsonLogger

load_dotenv()
dialect = str(os.environ.get('DB_DIALECT', 'sqlite'))
host = str(os.environ.get('DB_HOST', 'data/database.db'))
root = str(os.environ.get('DB_HOST', 'data/database.db'))

log_lvl = os.environ.get('LOG_LVL', logging.INFO)
log_daily_interval = int(os.environ.get('LOG_INTERVAL', 1))
log_backup_count = os.environ.get('LOG_BACKUP', 14)


# TODO add reload handling to AnaEngine: --> Database --> session ids
class AnalysisEngine(MQTTClient):

    def __init__(self, path: str = 'data'):
        MQTTClient.__init__(self)
        self.database = Database(dialect=dialect,
                                 host=host)
        self.experiment = None
        self.json_logger = JsonLogger('logs/log', daily_interval=log_daily_interval,
                                      backup_count=log_backup_count, level=log_lvl)

    def begin_client(self):
        subscriptions = [
            ('#', self.json_log_callback),
            ('visualization/+/+', self.experiment_callback),
            ('+/+/mission', self.mission_callback),
            ('hub/+/state', self.hub_callback),
            ('drone/+/state', self.drone_callback),
            ('car/+/state', self.car_callback),
            ('bus/+/state', self.bus_callback)
            # TODO: subscribe --> Errors, Transactions, Order/parcel placed/delivered,
        ]
        super().begin_client(subscriptions)

        return self

    def json_log_callback(self, client, userdata, msg):
        pass
        # self.json_logger.log_to_file(logging.INFO, msg.topic, msg.payload)
        self.json_logger.log_json(msg.topic, json.loads(str(msg.payload.decode("utf-8", "ignore"))))

    def experiment_callback(self, client, userdata, msg):
        action = msg.topic.split('/')[-1]

        # if self.experiment is not None and action in ['pause', 'start']:
        #     self.database.pause_resume_experiment()
        #
        # if self.experiment is not None and action == 'stop':
        #     logging.info('Marked experiment as complete')
        #     self.database.complete_experiment(self.experiment.session)
        #     self.experiment = None
        #
        # if self.experiment is None and action == 'start':
        #     logging.info('Started a new experiment')
        #     self.experiment = self.database.create_experiment(session=msg.topic.split('/')[-2],
        #                                                       topology={})

    def mission_callback(self, client, userdata, msg):
        entity_type = msg.topic.split('/')[-3]
        vehicle_id = msg.topic.split('/')[-2]

        state = json.loads(str(msg.payload.decode("utf-8", "ignore")))
        #logging.info(state)

        # mission = self.database.create_mission(name=state['id'], vehicle_id=vehicle_id, type=entity_type,
        #                                        experiment_id=self.experiment.session, state='waiting')
        #
        # logging.info(f'Created mission {mission.name}')
        # for task in state['tasks']:
        #     if task['type'] == 'move':
        #         self.database.create_task(mission_id=mission.name, experiment_id=self.experiment.session,
        #                                   type='move', state=task['state'], destination_x=task['destination']['x'],
        #                                   destination_y=task['destination']['y'], transaction_id=None)

    def task_callback(self, client, userdata, msg):
        pass

    def hub_callback(self, client, userdata, msg):
        state = json.loads(str(msg.payload.decode("utf-8", "ignore")))
        #logging.info(state)

        try:
            self.database.create_hub(name=state['id'], experiment_id=self.experiment.session, position=state['position'])
        except:
            logging.error("error caught in Hub_callback...")


    def drone_callback(self, client, userdata, msg):
        state = json.loads(str(msg.payload.decode("utf-8", "ignore")))
        #logging.info(state)

        # drone = self.database.get_drone(drone_name=state['id'])
        # if drone is None:
        #     drone = self.database.create_drone(name=state['id'], experiment_id=self.experiment.session,
        #                                        speed=state['speed'])
        #
        # self.database.add_timestamp_to_drone(drone_name=drone.name, position_x=state['position']['x'],
        #                                      position_y=state['position']['y'],
        #                                      state=None, parcel_id=None, task_id=None)

    def car_callback(self, client, userdata, msg):
        state = json.loads(str(msg.payload.decode("utf-8", "ignore")))
        #logging.info(state)

        # car = self.database.get_car(car_name=state['id'])
        # if car is None:
        #     car = self.database.create_car(name=state['id'], experiment_id=self.experiment.session,
        #                                    speed=state['speed'])
        #
        # self.database.add_timestamp_to_car(car_name=car.name, position_x=state['position']['x'],
        #                                    position_y=state['position']['y'],
        #                                    state=None, parcel_id=None, task_id=None)

    def bus_callback(self, client, userdata, msg):
        pass

    def get_drone_data(self, experiment_id):
        return self.database.export_drone_data(experiment_id)
