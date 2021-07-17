from mqtt_client import MQTTClient
import json
import logging
import os
from dotenv import load_dotenv

from analysis_engine.database import Database

load_dotenv()
dialect = str(os.environ.get('DB_DIALECT', 'sqlite'))
host = str(os.environ.get('DB_HOST', 'data/database.db'))


class AnalysisEngine(MQTTClient):

    def __init__(self, path: str = 'data'):
        MQTTClient.__init__(self)
        self.database = Database(dialect=dialect,
                                 host=host)
        self.experiment = None

    def begin_client(self):
        subscriptions = [
            ('mobil-e-hub/v0/from/visualization/+/+', self.experiment_callback),
            ('mobil-e-hub/v0/to/+/+/mission', self.new_mission)
        ]
        super().begin_client(subscriptions)

    def experiment_callback(self, client, userdata, msg):
        action = msg.topic.split('/')[-1]
        if self.experiment is not None and action in ['pause', 'start']:
            self.database.pause_resume_experiment()

        if self.experiment is not None and action == 'stop':
            logging.info('Marked experiment as complete')
            self.database.complete_experiment(self.experiment.id)
            self.experiment = None

        if self.experiment is None and action == 'start':
            logging.info('Started a new experiment')
            self.experiment = self.database.create_experiment(session=msg.topic.split('/')[-2],
                                                              topology={})

    def new_mission(self, client, userdata, msg):
        pass
