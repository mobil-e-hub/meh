import os
import time
import logging
import json
from dotenv import load_dotenv
import paho.mqtt.client as mqtt


class MQTTClient:
    """
        Wrapper class for Paho mqtt client encapsulates all MQTT for the Analysis Engine, except the on_message
        callbacks , start the client by calling begin_client(), end with terminate()
    """

    def __init__(self):
        load_dotenv()
        logging.basicConfig(level=os.environ.get("LOGGING_LVL", 'INFO').upper())
        print(f"LOGGING_LEVEL SET TO: {logging.root.level}")

        # MQTT Configuration
        self.MQTT_BROKER = os.environ.get("MQTT_BROKER")
        self.MQTT_PORT = int(os.environ.get("MQTT_BROKER_PORT"))
        self.MQTT_PATH = os.environ.get("MQTT_BROKER_PATH")
        self.MQTT_USERNAME = os.environ.get("MQTT_BROKER_USERNAME")
        self.MQTT_PASSWORD = os.environ.get("MQTT_BROKER_PASSWORD")

        self.ROOT = os.environ.get("ROOT")
        self.VERSION = os.environ.get("VERSION")

        # Client Configuration
        self.topic = f"{self.ROOT}/{self.VERSION}/from/opt"
        self.root = f"{self.ROOT}/{self.VERSION}"
        self.client_name = os.environ.get("CLIENT_ID")  # Root & id?

        # MQTT Setup
        self.client = mqtt.Client(self.client_name, transport='websockets')  # TODO bleibt websockets?
        self.client.ws_set_options(path=self.MQTT_PATH)
        self.client.tls_set()
        self.client.username_pw_set(username=self.MQTT_USERNAME, password=self.MQTT_PASSWORD)
        logger = logging.getLogger(__name__)
        self.client.enable_logger(logger)

        # Default Callbacks
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_subscribe = self.on_subscribe
        self.client.on_unsubscribe = self.on_unsubscribe
        self.client.on_message = self.on_message

    def begin_client(self, subscriptions: list = []):
        print(f" > {self.client_name}: Setting up connection - broker: {self.MQTT_BROKER} on port: {self.MQTT_PORT}.")
        self.client.connect(self.MQTT_BROKER, self.MQTT_PORT)

        self.client.loop_start()
        for subscription in subscriptions:
            self.subscribe(f"{self.root}/{subscription[0]}", subscription[1])

    def terminate(self):
        time.sleep(1)
        logging.info('f"< [{self.client_name}] - Terminating Connection to Broker')
        self.client.loop_stop()
        self.client.disconnect()

    def subscribe(self, topic, callback=None):
        logging.debug(f"< [{self.client_name}] - SUBSCRIBING for topic: {topic}")
        self.client.subscribe(topic)
        if callback is not None:
            self.client.message_callback_add(topic, callback)

    def unsubscribe(self, topic):
        logging.debug(f"< [{self.client_name}] - UNSUBSCRIBING from topic: {topic}")
        self.client.unsubscribe(topic)

    def on_message(self, client, userdata, msg):
        """default message callback, should only be triggered if topic is not matched by other callback
            --> only logs the incoming message"""
        topic = msg.topic
        logging.info(f"DEFAULT MSG_CALLBACK: Message received! -> Topic: {topic}:  {msg.payload}")

    def on_connect(self, client, userdata, flags, rx):
        if rx == 0:
            logging.debug(f"[{self.client_name}] - Connected to broker: {self.MQTT_BROKER} - Port: {self.MQTT_PORT}")
        else:
            logging.warn(f"[{self.client_name}] - Bad connection: Returned code=", rx)

    def on_disconnect(self, client, userdata, rc=0):
        logging.debug(f"[{self.client_name}] - Disconnected from Broker: result code " + str(rc))
        client.loop_stop()

    def on_subscribe(self, client, userdata, mid, granted_qos):
        logging.debug(f"[{self.client_name}] -Subscription successful")

    def on_unsubscribe(self, client, userdata, mid):
        logging.debug(f"[{self.client_name}] - Unsubscription successful")
