import os
import time
import logging
import json

from dotenv import load_dotenv
import paho.mqtt.client as mqtt


# TODO:
#       -root + UUID!
#       -matchTopic
#       -destructor

class MQTTClient:
    """
        Wrapper class for Paho mqtt client encapsulates all MQTT for the Optimization Engine, except the on_message
        callbacks , start the client by calling begin_client(), end with terminate()
    """

    def __init__(self):
        load_dotenv()
        logging.basicConfig(level=os.environ.get("LOGGING_LVL", 'WARNING').upper())
        print(f"LOGGING_LEVEL SET TO: {logging.root.level}")

        self.MQTT_BROKER = os.environ.get("MQTT_BROKER_test")
        self.MQTT_PORT = int(os.environ.get("BROKER_PORT_test"))

        self.topic = "mobil-e-hub/v0/from/opt"  # TODO macht default topic überhaupt sinn?? --> als fallback
        self.root = "mobil-e-hub/v0/"    # TODO weg --> überschreibt das hier den in opt_engine gesetzten root??
        self.client_name = os.environ.get("CLIENT_ID")  # Root & id?

        self.subscriptions = {'mobil-e-hub/v0/#'}  # TODO remove

        self.client = mqtt.Client(self.client_name, transport='websockets')  # TODO bleibt websockets?
        logger = logging.getLogger(__name__)
        self.client.enable_logger(logger)

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

        # Register a default message handler
        self.client.on_message = self.on_message

    def begin_client(self):
        print(f" > {self.client_name}: Setting up connection - broker: {self.MQTT_BROKER} on port: {self.MQTT_PORT}.")
        self.client.connect(self.MQTT_BROKER, self.MQTT_PORT)

        # TODO how to do this?
        # self.client.loop_forever()  # on this thread -> blocked -> problem??
        self.client.loop_start()  # starts new thread -> while loop necessary to keep running -> TODO seems to work!!
        # # or:
        # while True:
        #     pass                      # server could do stuff here...
        # time.sleep(20)
        # print("LOOP started")     # option if many clients need to run in parallel -> call loop() often by hand
        # rc = 0
        # while rc == 0:
        #     rc = self.client.loop()
        # return rc

    def terminate(self):  # TODO when to call this one??
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

    # TODO are all published messages encoded to JSON? only missions? 2 different publish messages needed?
    def publish_json(self, topic, message='', sender=''):
        pass
        # self.mqtt_client.publish(f'{sender}/{topic}', message)
        # self.publish(f'{sender}/{topic}', message)

    # TODO ensure that project/version are beginning of topic
    def publish(self, topic, message=''):  # topic, message = ''
        # this.publishFrom(`${this.type}/${this.mqtt.id}`, topic, message);
        # sender = sender or f'optimization-engine/{self.id}'
        self.client.publish(topic, message)
        logging.debug(f"{self.client_name}: published message")

    def publish_from(self, sender, topic, message):
        if topic is None:
            topic = self.topic
        logging.debug(f"< [{self.client_name}] {self.root}/from/{sender}/{topic}: {message}")
        self.client.publish(f'{self.root}/from/{sender}/{topic}', json.dumps(message))

    def publish_to(self, receiver, topic, message):
        if topic is None:
            topic = self.topic
        logging.debug(f"< [{self.client_name}] {self.root}/to/{receiver}/{topic}: {message}")
        self.client.publish(f'{self.root}/to/{receiver}/{topic}', json.dumps(message))

    def receive(self, topic, message):
        logging.debug(f"> {self.client_name}: Msg received - [{topic}]: {message}")

    def on_message(self, client, userdata, msg):
        """default message callback, should only be triggered if topic is not matched by other callback
            --> only logs the incoming message"""
        topic = msg.topic
        logging.info(f"DEFAULT MSG_CALLBACK: Message received! -> Topic: {topic}:  {msg.payload}")
        # m_decode = str(msg.payload.decode("utf-8", "ignore"))
        # m_in = json.loads(m_decode)
        # print(f"< [{self.client_name}] {topic.direction}/{topic.entity}/{topic.id}/"
        #       f"{topic.rest}: {m_in}")

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

    # TODO remove
    def change_client_name(self, name):
        """ONLY used for testing in development: allows to start second parallel MQTT client on machine
        for testing pub/rec. To avoid conflict with loaded client name from .dotenv --> use this function"""
        self.client_name = name
        self.client = mqtt.Client(self.client_name, transport='websockets')
