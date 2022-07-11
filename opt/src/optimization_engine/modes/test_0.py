def activate(opt):
    print('Mode (test, 0) activated!')


def deactivate(opt):
    print('Mode (test, 0) deactivated!')


def on_message_status(client, userdata, msg):
    print(f'Status message received!')


subscriptions = {
    '+/+/status': on_message_status
}

# parameters for scripted mission for the MeH-testrun (June2022)
# coordinates for move tasks are set in the json file with the corresponding mission
# self.testrun_hub_id = 'aef6d0fd-d150-4435-9c73-3b3339b77582'
# self.testrun_drone_id = '52715405-c8a0-4f53-8fb5-ffd54696200c'
# self.testrun_car_id = '3406a877-6f20-4d27-bac5-08b62a44326a'
# self.testrun_parcel_id = 'a64bcadb-6967-4407-ba06-8abf2182a1d0'
#
# # TODO revert to 1, 0 solely for faster testing
# self.expected_number_hubs = 0
# self.expected_number_cars = 0
# self.expected_number_drones = 0

#         self.FLAG_SCRIPTED = True
#         self.g_topo = load_topology('assets/testrun/testrun_topology.json')
#         self.mapping = load_mapping('assets/testrun/testrun_topology.json')  # hub_id <-> node_id
#         self.pred, self.dist = nx.floyd_warshall_predecessor_and_distance(self.g_topo)
#
#         self.hubs = {}
#         self.drones = {}
#         self.cars = {}
#         self.buses = {}
#         self.parcels = {}
#         self.orders = {}
#         # addresses / customers
#
#         # Subscribe to all topics which are needed for optimization and administration
#         self.add_message_callbacks()
#
#         # parameters for the test_missions send in response to mqtt-topic: /test/[1-3]
#         self.test_mission_positions = [
#             Position(51.25673, 9.54357, 0),
#             Position(51.25680, 9.54393, 0),
#             Position(51.25703, 9.54386, 0),
#             Position(51.25696, 9.54351, 0),
#             Position(51.25673, 9.54357, 0),
#             Position(51.25661523618747, 9.543280467304413, 0),
#             # Position (51.25699626809572, 9.54323274214318) # Punkt I
#         ]
#         self.test_mission_parcel = 'p01'
#         self.test_mission_drone = 'd01'
#         self.test_mission_hub1 = 'h01'
#         self.test_mission_hub2 = 'h02'