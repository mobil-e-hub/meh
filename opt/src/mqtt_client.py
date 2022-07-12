import os
import time
import logging
from uuid import uuid4
import json

from dotenv import load_dotenv
import paho.mqtt.client as mqtt


from optimization_engine.optimization_engine import OptimizationEngineTest0, OptimizationEngineShowcase0


engines = {
    ('test', '0'): OptimizationEngineTest0,
    ('showcase', '0'): OptimizationEngineShowcase0,
    ('none', '0'): None
}


class OptimizationEngineMQTTClient:
    """
        Wrapper class for Paho mqtt client encapsulates all MQTT for the Optimization Engine, except the on_message
        callbacks , start the client by calling begin_client(), end with terminate()
    """

    def __init__(self, mode=None):
        # Load connection data
        load_dotenv()
        logging.basicConfig(level=os.environ.get("LOGGING_LVL", 'WARNING').upper())
        print(f"LOGGING_LEVEL SET TO: {logging.root.level}")

        self.MQTT_BROKER = os.environ.get("MQTT_BROKER_INES")
        self.MQTT_PORT = int(os.environ.get("MQTT_BROKER_PORT_INES"))
        self.MQTT_USERNAME = os.environ.get("MQTT_BROKER_USERNAME_INES")
        self.MQTT_PASSWORD = os.environ.get("MQTT_BROKER_PASSWORD_INES")

        self.project = os.environ.get("MQTT_ROOT")
        self.version = os.environ.get("MQTT_VERSION")
        self.root = f"{self.project}/{self.version}"
        self.id = str(uuid4())[:4]
        self.logging_name = f'opt'

        # Add callbacks
        self.callbacks = {
            f'+/+/mode/+/+': self.on_message_mode
        }

        self.client_name = os.environ.get("CLIENT_ID")  # used for Client creation and logging?
        self.client = mqtt.Client(self.client_name, transport='websockets')

        if self.MQTT_BROKER.startswith('ines'):
            self.MQTT_PATH = os.environ.get("MQTT_BROKER_PATH_INES")
            logging.debug(f" > opt_engine: INES MQTT broker selected, use  TLS and path: {self.MQTT_PATH}")
            self.client.ws_set_options(path=self.MQTT_PATH)  # only needed to specify path to INES broker

            # only use TLS if INES Broker is used!
            self.client.tls_set()
            self.client.username_pw_set(username=self.MQTT_USERNAME, password=self.MQTT_PASSWORD)

        logger = logging.getLogger(__name__)
        # self.client.enable_logger(logger)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        # Register a default message handler
        self.client.on_message = self.on_message

        # Start client
        self.begin_client()

        # Set up engine for current mode
        self.mode = self.engine = None

        if mode is not None:
            self.set_engine(mode)

    def begin_client(self):
        logging.warn(f" > {self.logging_name}: Setting up connection - broker: {self.MQTT_BROKER} on port: {self.MQTT_PORT}.")
        self.client.connect(self.MQTT_BROKER, self.MQTT_PORT)

        self.client.loop_start()  # starts new thread

    def terminate(self):
        time.sleep(1)
        logging.info('f"< [{self.logging_name}] - Terminating Connection to Broker')
        self.client.loop_stop()
        self.client.disconnect()

    def publish(self, topic, message):
        logging.debug(f"< [opt_engine] {self.root}/{topic}: {message}")
        self.client.publish(f'{self.root}/{topic}', json.dumps(message))

    def receive(self, topic, message):
        logging.debug(f"> {self.logging_name}: Msg received - [{topic}]: {message}")

    def on_message(self, client, userdata, msg):
        """default message callback, should only be triggered if topic is not matched by other callback
            --> only logs the incoming message"""
        topic = msg.topic

        # TODO: Delete
        if 'status' in topic:
            return
        else:
            logging.info(f"> [opt_engine] default msg_callback {topic}:  {msg.payload}")

    def on_connect(self, client, userdata, flags, rx):
        if rx == 0:
            logging.debug(f"[{self.logging_name}] - Connected to broker: {self.MQTT_BROKER} - Port: {self.MQTT_PORT}")
            self.publish('connected', '')
            for topic, callback in self.callbacks.items():
                self.client.subscribe(f'{self.root}/{topic}')
                self.client.message_callback_add(f'{self.root}/{topic}', callback)
        else:
            logging.warn(f"[{self.logging_name}] - Bad connection: Returned code=", rx)

    def on_disconnect(self, client, userdata, rc=0):
        logging.warn(f"[{self.logging_name}] - Disconnected from Broker: result code " + str(rc))
        if rc == 0:
            client.loop_stop()

    def on_subscribe(self):
        logging.debug(f"[{self.logging_name}] -Subscription successful")

    def on_unsubscribe(self):
        logging.debug(f"[{self.logging_name}] - Unsubscription successful")

    def on_message_mode(self, client, userdata, msg):
        try:
            [_, _, entity, id_, _, *mode] = msg.topic.split('/')
            mode = tuple(mode)

            if mode in engines.keys():
                self.set_engine(tuple(mode))
                logging.debug(f"[{self.logging_name}] - Execution mode changed to {mode}")
            else:
                logging.debug(f"[{self.logging_name}] - Execution mode could not be changed (Invalid mode {mode})")
        except BaseException as e:
            logging.debug(f"[{self.logging_name}] - Execution mode could not be changed ({e})")

    def set_engine(self, mode):
        if self.mode == mode:
            return

        if self.engine is not None:
            for topic, callback in self.engine.callbacks.items():
                self.unsubscribe_and_remove_callback(topic)

        self.mode = mode
        self.engine = engines[mode](self)

        if self.engine is not None:
            for topic, callback in self.engine.callbacks.items():
                self.subscribe_and_add_callback(topic, callback)

    def subscribe_and_add_callback(self, topic, callback):
        self.callbacks[topic] = callback
        self.client.subscribe(f'{self.root}/{topic}')
        self.client.message_callback_add(f'{self.root}/{topic}', callback)
        logging.debug(f'Subscribed to {self.root}/{topic}.')

    def unsubscribe_and_remove_callback(self, topic):
        del self.callbacks[topic]
        self.client.unsubscribe(f'{self.root}/{topic}')
        self.client.message_callback_remove(f'{self.root}/{topic}')


class OldMQTTClient:
    """
        Wrapper class for Paho mqtt client encapsulates all MQTT for the Optimization Engine, except the on_message
        callbacks , start the client by calling begin_client(), end with terminate()
    """

    def __init__(self):
        load_dotenv()
        logging.basicConfig(level=os.environ.get("LOGGING_LVL", 'WARNING').upper())
        print(f"LOGGING_LEVEL SET TO: {logging.root.level}")

        self.MQTT_BROKER = os.environ.get("MQTT_BROKER_INES")
        self.MQTT_PORT = int(os.environ.get("MQTT_BROKER_PORT_INES"))
        self.MQTT_USERNAME = os.environ.get("MQTT_BROKER_USERNAME_INES")
        self.MQTT_PASSWORD = os.environ.get("MQTT_BROKER_PASSWORD_INES")

        self.project = os.environ.get("MQTT_ROOT")
        self.version = os.environ.get("MQTT_VERSION")
        self.root = f"{self.project}/{self.version}"
        self.id = str(uuid4())[:4]

        # self.subscriptions = {
        #     f'mobil-e-hub/{self.version}/#'
        # }
        self.client_name = os.environ.get("CLIENT_ID")  # used for Client creation and logging?
        self.topic = "opt"

        self.client = mqtt.Client(self.client_name, transport='websockets')

        if self.MQTT_BROKER.startswith('ines'):
            self.MQTT_PATH = os.environ.get("MQTT_BROKER_PATH_INES")
            logging.debug(f" > opt_engine: INES MQTT broker selected, use  TLS and path: {self.MQTT_PATH}")
            self.client.ws_set_options(path=self.MQTT_PATH)  # only needed to specify path to INES broker

            # only use TLS if INES Broker is used!
            self.client.tls_set()
            self.client.username_pw_set(username=self.MQTT_USERNAME, password=self.MQTT_PASSWORD)

        logger = logging.getLogger(__name__)
        # self.client.enable_logger(logger)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        # Register a default message handler
        self.client.on_message = self.on_message

    def begin_client(self):
        logging.warn(f" > {self.logging_name}: Setting up connection - broker: {self.MQTT_BROKER} on port: {self.MQTT_PORT}.")
        self.client.connect(self.MQTT_BROKER, self.MQTT_PORT)

        self.client.loop_start()  # starts new thread

    def terminate(self):
        time.sleep(1)
        logging.info('f"< [{self.logging_name}] - Terminating Connection to Broker')
        self.client.loop_stop()
        self.client.disconnect()

    def subscribe(self, topic):
        logging.debug(f"< [{self.logging_name}] - SUBSCRIBING for topic: {topic}")
        self.client.subscribe(topic)
        self.subscriptions.add(topic)

    def unsubscribe(self, topic):
        logging.debug(f"< [{self.logging_name}] - UNSUBSCRIBING from topic: {topic}")
        self.client.unsubscribe(topic)
        self.subscriptions.discard(topic)

    def publish(self, topic, message, sender= ''):
        sender = f'opt/{self.id}' if not sender else sender
        logging.debug(f"< [opt_engine] {self.root}/{sender}/{topic}: {message}")
        self.client.publish(f'{self.root}/{sender}/{topic}', json.dumps(message))

    def receive(self, topic, message):
        logging.debug(f"> {self.logging_name}: Msg received - [{topic}]: {message}")

    def on_message(self, client, userdata, msg):
        """default message callback, should only be triggered if topic is not matched by other callback
            --> only logs the incoming message"""
        topic = msg.topic

        # TODO: Delete
        if 'status' in topic:
            return
        else:
            logging.info(f"> [opt_engine] default msg_callback {topic}:  {msg.payload}")

    def on_connect(self, client, userdata, flags, rx):
        if rx == 0:
            logging.debug(f"[{self.logging_name}] - Connected to broker: {self.MQTT_BROKER} - Port: {self.MQTT_PORT}")
            self.publish('connected', '')
            for topic in self.subscriptions:
                self.subscribe(topic)
        else:
            logging.warn(f"[{self.logging_name}] - Bad connection: Returned code=", rx)

    def on_disconnect(self, client, userdata, rc=0):
        logging.warn(f"[{self.logging_name}] - Disconnected from Broker: result code " + str(rc))
        if rc == 0:
            client.loop_stop()

    def on_subscribe(self):
        logging.debug(f"[{self.logging_name}] -Subscription successful")

    def on_unsubscribe(self):
        logging.debug(f"[{self.logging_name}] - Unsubscription successful")
