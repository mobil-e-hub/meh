# External modules
import logging
from datetime import datetime

from logging.handlers import TimedRotatingFileHandler


# Internal modules

# TODO Steps:
#    save date: topic, message
#
#  - to json
#  - name file with date
#  - define basic format  - date -> topic -> msg/payload
#  - list of other desirable features, clarify next steps :)

# TODO:
# - save to json file
# - define format
# - instantiate in ana_engine
# - methods to call for ana_engine
# - from ENV


# TODO Design:
## - really necessary to have a custom logging module?
#      - logLevel not really necessary here??  --> vllt doch für state messages adden??, Missions -> Warn, Errors -> Error, debug -> state, info -> transactions
#       - use Json.dump in formatter or external module like JSON-log-formatter 0.4.0??

class JsonLogger:
    """Custom Logger classes for logging the state to a json file. Seperate Log stream than the one to stdout..."""

    def __init__(self, log_path, daily_interval, backup_count, level=logging.INFO):
        formatter = logging.Formatter('%(asctime)s: %(message)s')

        handler = TimedRotatingFileHandler(log_path, when="d", interval=daily_interval,
                                           backupCount=backup_count)
        handler.setFormatter(formatter)

        self.logger = logging.getLogger('json_logger')
        self.logger.setLevel(level)
        self.logger.addHandler(handler)

    def log_to_file(self, lvl, topic, message=''):
        self.logger.log(level=lvl, msg=f"{topic}: {message}")

    def change_level(self, lvl):
        self.logger.setLevel(lvl)
        self.log(lvl, 'JSON_LOGGER', f"Logging level set to {lvl}")
