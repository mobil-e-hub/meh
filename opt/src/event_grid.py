# External modules
import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.eventgrid import EventGridPublisherClient, EventGridEvent

# Internal modules


# Environment variables
load_dotenv()
event_grid_endpoint = os.environ.get('EVENT_GRID_ENDPOINT')
event_grid_key = os.environ.get('EVENT_GRID_KEY')


# EventGrid singleton
class EventGrid:
    def __init__(self):
        self.subscriptions = {}
        self.client = EventGridPublisherClient(event_grid_endpoint, AzureKeyCredential(event_grid_key))

    def publish(self, topic, message=''):
       try:
            print(f'event_grid.publish({topic}, {message})')
            event = EventGridEvent(data=message, subject=topic, event_type="mobil-e-hub", data_version="1.0")
            self.client.send(event)
       except Error as err:
            print(err)

    def receive(self, event):
        # Decompose event
        topic = event['subject']
        message = event['data']
        entity, id, *args = topic.split('/')
        topic = { 'entity': entity, 'id': id, 'args': args, 'rest': '/'.join(args), 'string': topic }

        print(f'> {topic["string"]}: {message}')

        # Call matching subscriptions
        for pattern, handlers in self.subscriptions.items():
            if match_topic(pattern, topic['string']):
                for handler in handlers:
                    handler(topic, message)

    def subscribe(self, pattern, handler):
        if pattern in self.subscriptions:
            self.subscriptions[pattern].append(handler)
        else:
            self.subscriptions[pattern] = [handler]

    def unsubscribe(self, pattern, handler):
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
            return false

    return len(pattern_list) == len(topic_list)
