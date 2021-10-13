import os
import time
import logging
from uuid import uuid4
import json

from dotenv import load_dotenv
import paho.mqtt.client as mqtt


class MQTTClient:
    """
        Wrapper class for Paho mqtt client encapsulates all MQTT for the Optimization Engine, except the on_message
        callbacks , start the client by calling begin_client(), end with terminate()
    """

    def __init__(self):
        load_dotenv()
        logging.basicConfig(level=os.environ.get("LOGGING_LVL", 'WARNING').upper())
        print(f"LOGGING_LEVEL SET TO: {logging.root.level}")

        self.MQTT_BROKER = os.environ.get("MQTT_BROKER")
        self.MQTT_PORT = int(os.environ.get("MQTT_BROKER_PORT"))
        self.MQTT_PATH = os.environ.get("MQTT_BROKER_PATH")
        self.MQTT_USERNAME = os.environ.get("MQTT_BROKER_USERNAME")
        self.MQTT_PASSWORD = os.environ.get("MQTT_BROKER_PASSWORD")

        self.root = "mobil-e-hub/vX"    # TODO weg --> überschreibt das hier den in opt_engine gesetzten root??
        self.client_name = os.environ.get("CLIENT_ID")  # used for Client creation and logging?
        self.id = str(uuid4())[0:8]

        self.subscriptions = {'mobil-e-hub/vX/#'}  # TODO remove

        self.client = mqtt.Client(self.client_name, transport='websockets')
        self.client.ws_set_options(path=self.MQTT_PATH)
        self.client.tls_set()
        # TODO HOTFIX: remove ASAP
        self.client.tls_insecure_set(True)

        self.client.username_pw_set(username=self.MQTT_USERNAME, password=self.MQTT_PASSWORD)
        logger = logging.getLogger(__name__)
        self.client.enable_logger(logger)

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

        # Register a default message handler
        self.client.on_message = self.on_message

    def begin_client(self):
        print(f" > {self.client_name}: Setting up connection - broker: {self.MQTT_BROKER} on port: {self.MQTT_PORT}.")
        self.client.connect(self.MQTT_BROKER, self.MQTT_PORT)

        self.client.loop_start()  # starts new thread

    def terminate(self):
        time.sleep(1)
        logging.info('f"< [{self.client_name}] - Terminating Connection to Broker')
        self.client.loop_stop()
        self.client.disconnect()

    def subscribe(self, topic):
        logging.debug(f"< [{self.client_name}] - SUBSCRIBING for topic: {topic}")
        self.client.subscribe(topic)
        self.subscriptions.add(topic)

    def unsubscribe(self, topic):
        logging.debug(f"< [{self.client_name}] - UNSUBSCRIBING from topic: {topic}")
        self.client.unsubscribe(topic)
        self.subscriptions.discard(topic)

    def publish(self, topic, message, sender='opt'):

        logging.debug(f"< [opt_engine] {self.root}/{sender}/{topic}: {message}")
        self.client.publish(f'{self.root}/{sender}/{topic}', json.dumps(message))

    def receive(self, topic, message):
        logging.debug(f"> {self.client_name}: Msg received - [{topic}]: {message}")

    def on_message(self, client, userdata, msg):
        """default message callback, should only be triggered if topic is not matched by other callback
            --> only logs the incoming message"""
        topic = msg.topic
        logging.info(f"> [opt_engine] default msg_callback {topic}:  {msg.payload}")

    def on_connect(self, client, userdata, flags, rx):
        if rx == 0:
            logging.debug(f"[{self.client_name}] - Connected to broker: {self.MQTT_BROKER} - Port: {self.MQTT_PORT}")
            for topic in self.subscriptions:
                self.subscribe(topic)
        else:
            logging.warn(f"[{self.client_name}] - Bad connection: Returned code=", rx)

    def on_disconnect(self, client, userdata, rc=0):
        logging.debug(f"[{self.client_name}] - Disconnected from Broker: result code " + str(rc))
        client.loop_stop()

    def on_subscribe(self):
        logging.debug(f"[{self.client_name}] -Subscription successful")

    def on_unsubscribe(self):
        logging.debug(f"[{self.client_name}] - Unsubscription successful")

