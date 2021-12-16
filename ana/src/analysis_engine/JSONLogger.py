# External modules
import json
import logging
from logging.handlers import TimedRotatingFileHandler

# Internal modules


# TODO Design: - logLevel not really necessary here??
#  --> vllt doch für state messages adden??, Missions -> Warn, Errors -> Error, debug -> state, info -> transactions

class JsonLogger:
    """Custom Logger classes for logging the state to a json file. Seperate Log stream than the one to stdout..."""

    def __init__(self, log_path, daily_interval, backup_count, level=logging.INFO):

        self.logger = logging.getLogger('JSON_LOGGER')
        self.logger.propagate = False
        # formatter = logging.Formatter('%(asctime)s: %(message)s')
        formatter_json = logging.Formatter(json.dumps({'timestamp': '%(asctime)s', 'topic': '%(topic)s',
                                                       'msg_type': '%(msg_type)s', 'entity': '%(entity)s',
                                                       'payload': '%(payload)s'}))
        #
        # handler = TimedRotatingFileHandler(log_path, when="midnight", interval=daily_interval,
        #                                    backupCount=backup_count)
        # handler.setFormatter(formatter)
        # handler.setLevel(logging.ERROR)
        # handler.suffix = "%Y-%m-%d"
        handler_json = TimedRotatingFileHandler(log_path + '_json', when="midnight", interval=daily_interval,
                                                backupCount=backup_count)
        handler_json.setFormatter(formatter_json)
        handler_json.setLevel(level)
        handler_json.suffix = "%Y-%m-%d"

        console = logging.StreamHandler()
        console.setLevel(logging.CRITICAL)

        # self.logger.addHandler(console)
        self.logger.addHandler(handler_json)

    def log_json(self, topic, message, lvl=logging.INFO):
        topic_split = topic.split('/')
        log_data = {
            'topic': topic,
            'msg_type': topic_split[4],
            'entity': f"{topic_split[2]}/{topic_split[3]}",
            'payload': message,
        }
        self.logger.info(msg='', extra=log_data)

    def change_level(self, lvl):
        self.logger.setLevel(lvl)
        self.logger.log(lvl, 'JSON_LOGGER', f"Logging level set to {lvl}")
