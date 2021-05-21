from dotenv import load_dotenv
import paho.mqtt.client as mqtt

import os
import time
import logging
import json


# NExt TODOs: - debug connect : run loop from class / send MQTT / tim schreiben /

# TODO:
#       -root + UUID!
#       -matchTopic
#       -destructor
#       - inheritance from mqtt.Cient:
#                               --> https://github.com/eclipse/paho.mqtt.python/blob/master/examples/client_sub-class.py


class MQTTClient:
    """Singleton wrapper for mqtt client"""

    def __init__(self):
        load_dotenv()
        self.MQTT_BROKER = os.environ.get("MQTT_BROKER_test")
        self.MQTT_PORT = int(os.environ.get("BROKER_PORT_test"))

        logging.basicConfig(level=logging.DEBUG)  # TODO move to dotenv

        self.topic = "foo/bar"
        self.root = "opt_engine"
        self.client_name = os.environ.get("CLIENT_ID")  # Root & id?

        self.subscriptions = {}  # TODO topic strings

        self.entities = {}  # save all state updates here

        self.client = mqtt.Client(self.client_name, transport='websockets')  # , transport='websockets'
        logger = logging.getLogger(__name__)
        self.client.enable_logger(logger)

        # self.client.subscribe("topic") # TODO move where?
        # self.client.loop_forever()

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

        self.client.message_callback_add("foo/test/#", self.on_message_foo)
        self.client.message_callback_add("bar/test/#", self.on_message_bar)
        self.client.on_message = self.on_message
        # time.sleep(5)
        # print("Client: End Loop")
        # self.client.loop_stop()

    def subscribe(self, topic):
        self.client.subscribe(topic)
        pass

    def unsubscribe(self, topic):
        self.client.unsubscribe(topic)
        pass

    def publish(self, topic=None, message=''):  # topic, message = ''
        # this.publishFrom(`${this.type}/${this.mqtt.id}`, topic, message);

        self.client.publish(topic, message)
        # log

    def publish_from(self, sender, topic, message):
        if topic is None:
            topic = self.topic
        print(f"< [{self.client_name}] {self.root}/from/{sender}/{topic}: {message}")
        self.client.publish(f'{self.root}/from/{sender}/{topic}', json.dumps(message))

    def publish_to(self, receiver, topic, message):
        if topic is None:
            topic = self.topic
        print(f"< [{self.client_name}] {self.root}/to/{receiver}/{topic}: {message}")
        self.client.publish(f'{self.root}/to/{receiver}/{topic}', json.dumps(message))

    def receive(self, topic, message):
        # TODO log properly ->
        pass

    def on_message(self, client, userdata, msg):
        topic = msg.topic
        print("Message received:")
        print(f"Topic: {topic}:  {msg.payload}")
        # m_decode = str(msg.payload.decode("utf-8", "ignore"))
        # m_in = json.loads(m_decode)
        # print(f"< [{self.client_name}] {topic.direction}/{topic.entity}/{topic.id}/"
        #       f"{topic.rest}: {m_in}")

    def on_message_foo(self, client, userdata, msg):
        topic = msg.topic
        print("Message received: -foo")
        print(f"Topic: {topic}:  {msg.payload}")

    def on_message_bar(self, client, userdata, msg):
        topic = msg.topic
        print("Message received: -bar")
        print(f"Topic: {topic}:  {msg.payload}")

    def on_connect(self, client, userdata, flags, rx):
        print(f"Connecting to broker: {self.MQTT_BROKER} - Port: {self.MQTT_PORT}")
        if rx == 0:
            print("MQTT Connection Established")
            self.subscribe(self.topic)
            self.client.subscribe("bar/test")
            time.sleep(5)
            self.publish("foo/test", "tested/bar")
            time.sleep(5)
            self.publish("bar/test", "tested/bar")
            time.sleep(10)
            self.client.unsubscribe("foo/test")
        else:
            print("Bad connection: Returned code=", rx)

    def on_disconnect(self, client, userdata, rc=0):
        logging.debug("DisConnected result code " + str(rc))
        client.loop_stop()

    def on_subscribe(self):
        pass

    def on_unsubscribe(self):
        pass

    def terminate(self):  # TODO when to call this one??
        time.sleep(1)
        print('Terminating Connection')
        self.client.loop_stop()
        self.client.disconnect()

    def begin(self):
        print("Setting up connection")
        self.client.connect(self.MQTT_BROKER, self.MQTT_PORT)
        self.client.loop_forever()
