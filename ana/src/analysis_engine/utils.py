import base64
import pickle
from datetime import datetime
import time


def object_to_base_64(obj) -> str:
    pickled = pickle.dumps(obj)
    return base64.b64encode(pickled).decode('utf-8')


def base_64_to_object(b64str: str):
    decoded = base64.b64decode(b64str)
    return pickle.loads(decoded)


class Timer(object):

    def __init__(self):
        self.time_started = None
        self.time_paused = None
        self.paused = False

    def start(self):
        self.time_started = datetime.now()

    def pause(self):
        if self.time_started is None:
            raise ValueError("Timer not started")
        if self.paused:
            raise ValueError("Timer is already paused")
        self.time_paused = datetime.now()
        self.paused = True

    def resume(self):
        if self.time_started is None:
            raise ValueError("Timer not started")
        if not self.paused:
            raise ValueError("Timer is not paused")
        pause_time = datetime.now() - self.time_paused
        self.time_started = self.time_started + pause_time
        self.paused = False

    def get(self):
        if self.time_started is None:
            raise ValueError("Timer not started")
        if self.paused:
            return int((self.time_paused - self.time_started).total_seconds())
        else:
            return int((datetime.now() - self.time_started).total_seconds())
