# External modules
import os

from dotenv import load_dotenv
import paho.mqtt.client as mqtt

# Environment variables
load_dotenv()
mqtt_endpoint = os.environ.get('MQTT_ENDPOINT')
mqtt_endpoint_path = os.environ.get('MQTT_ENDPOINT_PATH')


class MQTT(object):

    def __init__(self):
        self.client = mqtt.Client('6a676c70-b563-11eb-8529-0242ac130003', transport='websockets')
        self.client.ws_set_options(path=mqtt_endpoint_path)
        self.client.tls_set()
        self.client.username_pw_set(username="roger", password="$6$clQ4Ocu312S0qWgl$Cv2wUxgEN73c6C6jlBkswqR4AkHsvDLWvtEXZZ8NpsBLgP1WAo/qA+WXcmEN/mjDNgdUwcxRAveqNMs2xUVQYA==")
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_log = self.on_log
        self.client.publish('pong', 'Hi')
        self.subscriptions = {}
        self.client.connect(mqtt_endpoint, port=443)
        self.client.loop_start()

    def on_connect(self, client, userdata, flags, rc):
        print('connected')

    def on_message(self, client, userdata, msg):
        # Decompose event
        topic = msg.topic
        message = str(msg.payload())
        entity, id, *args = topic.split('/')
        topic = {'entity': entity, 'id': id, 'args': args, 'rest': '/'.join(args), 'string': topic}

        print(f'> (opt) {topic["string"]}: {message}')

        # Call matching subscriptions
        for pattern, handlers in self.subscriptions.items():
            if match_topic(pattern, topic['string']):
                for handler in handlers:
                    handler(topic, message)

    def on_log(self, client, userdata, level, buf):
        print("log: ", buf)

    def publish(self, topic, message=''):
        try:
            print(f'mqtt.publish({topic}, {message})')
            self.client.publish(topic, message)
        except Exception as err:
            print(err)

    def subscribe(self, pattern, handler):
        self.client.subscribe(pattern)
        if pattern in self.subscriptions:
            self.subscriptions[pattern].append(handler)
        else:
            self.subscriptions[pattern] = [handler]

    def unsubscribe(self, pattern, handler):
        self.client.unsubscribe(pattern)
        if pattern in self.subscriptions:
            self.subscriptions[pattern].remove(handler)
            if len(self.subscriptions[pattern]) == 0:
                del self.subscriptions[pattern]


def match_topic(pattern, topic):
    pattern_list = pattern.split('/')
    topic_list = topic.split('/')

    for left, right in zip(pattern_list, topic_list):
        if left == '#':
            return len(topic_list) >= len(pattern_list) - 1
        elif left != '+' and left != right:
            return False

    return len(pattern_list) == len(topic_list)
