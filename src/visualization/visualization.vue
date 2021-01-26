<template>
    <div id="app">
        <b-navbar fixed="top" variant="light">
            <b-navbar-brand>
                mobil-e-Hub
            </b-navbar-brand>
            <b-navbar-nav>
                <b-nav-text>
                    Visualization Dashboard
                </b-nav-text>
            </b-navbar-nav>

            <b-navbar-nav class="ml-auto">
                <b-nav-form>
                    <b-button-toolbar>
                        <b-button class="mx-1" variant="link" :title="state === 'running' ? 'Pause simulation' : 'Start simulation'" @click="clickStartSimulationButton">
                            <b-icon :icon="state === 'running' ? 'pause-fill' : 'play-fill'" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button class="ml-1" variant="link" title="Stop simulation" @click="clickStopSimulationButton" :disabled="state === 'stopped'">
                            <b-icon icon="stop-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button class="mx-1" variant="link" title="Place order" @click="clickPlaceOrderButton">
                            <b-icon icon="bag-plus-fill" aria-hidden="true"></b-icon>
                        </b-button>
                    </b-button-toolbar>
                </b-nav-form>
            </b-navbar-nav>
        </b-navbar>

        <b-container fluid class="my-5">
            <b-row class="pt-4">
                <b-col cols="12">
                    <b-card no-body>
                        <b-tabs card>
                            <b-tab title="Simulation" active>
                                <svg ref="svg" style="width: 100%; height: 400px">
                                    <template v-if="state !== 'stopped'">
                                        <circle v-for="hub in displayedHubs" :key="hub.id" r="20" :cx="hub.x" :cy="hub.y" fill="gray"></circle>
                                        <circle v-for="vehicle in displayedVehicles" :key="vehicle.id" r="10" :cx="vehicle.x" :cy="vehicle.y" fill="blue"></circle>
                                        <circle v-for="drone in displayedDrones" :key="drone.id" r="5" :cx="drone.x" :cy="drone.y" fill="red"></circle>
                                        <circle v-for="parcel in displayedParcels" :key="parcel.id" r="3" :cx="parcel.x" :cy="parcel.y" fill="green"></circle>
                                    </template>
                                </svg>
                            </b-tab>

                            <b-tab title="Messages">
                                <pre style="max-height: 400px; overflow: scroll">{{ receivedMessages.slice(0, 100).join('\n\n') }}</pre>
                            </b-tab>

                            <b-tab title="Entities">
                                <b-container fluid>
                                    <b-row>
                                        <b-col cols="4">
                                            <h4>Drones</h4>
                                            <b-list-group>
                                                <b-list-group-item v-for="(drone, id) in entities.drones" :key="id">{{ id }}</b-list-group-item>
                                            </b-list-group>
                                        </b-col>
                                        <b-col cols="4">
                                            <h4>Vehicles</h4>
                                            <b-list-group>
                                                <b-list-group-item v-for="(vehicle, id) in entities.vehicles" :key="id">{{ id }}</b-list-group-item>
                                            </b-list-group>
                                        </b-col>
                                        <b-col cols="4">
                                            <h4>Parcels</h4>
                                            <b-list-group>
                                                <b-list-group-item v-for="(parcel, id) in entities.parcels" :key="id">{{ id }}</b-list-group-item>
                                            </b-list-group>
                                        </b-col>
                                    </b-row>
                                </b-container>
                            </b-tab>

                            <b-tab title="Raw values">
<!--                                <pre style="max-height: 400px; overflow: scroll">{{ { displayedDrones, displayedVehicles, displayedHubs, displayedParcels, entities } }}</pre>-->
                            </b-tab>
                        </b-tabs>
                        <b-card-footer>
                            Currently active entities:
                            <span v-b-popover.hover.top="displayedHubs.map(hub => hub.id).join('\n')" title="Hubs">{{`${Object.keys(entities.hubs).length} hubs`}}</span>,
                            <span v-b-popover.hover.top="displayedDrones.map(drone => drone.id).join('\n')" title="Drones">{{`${Object.keys(entities.drones).length} drones`}}</span>,
                            <span v-b-popover.hover.top="displayedVehicles.map(vehicle => vehicle.id).join('\n')" title="Vehicles">{{`${Object.keys(entities.vehicles).length} vehicles`}}</span>,
                            <span v-b-popover.hover.top="displayedParcels.map(parcel => parcel.id).join('\n')" title="Parcels">{{`${Object.keys(entities.parcels).length} parcels`}}</span>
                        </b-card-footer>
                    </b-card>
                </b-col>
            </b-row>
        </b-container>
    </div>
</template>

<script>
    let mqtt = require('mqtt');

    export default {
        data: function () {
            return {
                state: 'stopped',
                receivedMessages: [],
                mqtt: {
                    client: null,
                    id: 'qdslgkjhqlsk34li3ug3',
                    root: 'mobil-e-hub/v1'
                },
                entities: {
                    drones: { },
                    vehicles: { },
                    parcels: { },
                    hubs: { }
                }
            }
        },
        mounted: function() {
            try {
                this.mqtt.client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt');
                this.mqtt.client.on('connect', () => {
                    this.mqtt.client.subscribe(this.mqtt.root + '/#');
                    this.publish('connected');
                    this.receivedMessages.unshift('Connected!');
                });
                this.mqtt.client.on('message', (topic, message) => {
                    message = JSON.parse(message.toString());
                    this.receivedMessages.unshift(topic + ': ' + JSON.stringify(message));

                    topic = topic.split('/');

                    if (this.state === 'running') {
                        if (topic[2] === 'from' && topic[3] === 'drone' && topic[5] === 'state') {
                            this.$set(this.entities.drones, [topic[4]], message);
                        }
                        else if (topic[2] === 'from' && topic[3] === 'vehicle' && topic[5] === 'state') {
                            this.$set(this.entities.vehicles, [topic[4]], message);
                        }
                        else if (topic[2] === 'from' && topic[3] === 'parcel' && topic[5] === 'state') {
                            this.$set(this.entities.parcels, [topic[4]], message);
                        }
                        else if (topic[2] === 'from' && topic[3] === 'hub' && topic[5] === 'state') {
                            this.$set(this.entities.hubs, [topic[4]], message);
                        }
                    }
                });
            }
            catch (err) {
                this.receivedMessages.unshift(err.toString());
            }
        },
        methods: {
            clickStartSimulationButton: function() {
                switch (this.state) {
                    case 'running':
                        this.publish('pause');
                        this.state = 'paused';
                        break;
                    case 'paused':
                        this.publish('resume');
                        this.state = 'running';
                        break;
                    case 'stopped':
                        this.publish('start');
                        this.state = 'running';
                        break;
                }
            },
            clickStopSimulationButton: function() {
                this.publish('stop');
                this.state = 'stopped';
                this.$set(this.entities, 'drones', { });
                this.$set(this.entities, 'vehicles', { });
                this.$set(this.entities, 'hubs', { });
                this.$set(this.entities, 'parcels', { });
            },
            clickPlaceOrderButton: function() {
                this.publish('place-order');
            },
            publish(topic, message = '') {
                this.mqtt.client.publish(`${this.mqtt.root}/from/visualization/${this.mqtt.id}/${topic}`, JSON.stringify(message));
            }
        },
        computed: {
            displayedDrones: function() {
                return Object.entries(this.entities.drones).map(([id, drone]) => ({ id: id, x: this.$refs.svg.clientWidth / 2 + 10 * drone.position.x, y: this.$refs.svg.clientHeight / 2 + 10 * drone.position.y }));
            },
            displayedVehicles: function() {
                return Object.entries(this.entities.vehicles).map(([id, vehicle]) => ({ id: id, x: this.$refs.svg.clientWidth / 2 + 10 * vehicle.x, y: this.$refs.svg.clientHeight / 2 + 10 * vehicle.y }));
            },
            displayedParcels: function() {
                return Object.entries(this.entities.parcels).map(([id, parcel]) => ({ id: id, x: this.$refs.svg.clientWidth / 2 + 10 * this.entities.hubs[parcel.position].x, y: this.$refs.svg.clientHeight / 2 + 10 * this.entities.hubs[parcel.position].y }));
            },
            displayedHubs: function() {
                return Object.entries(this.entities.hubs).map(([id, hub]) => ({ id: id, x: this.$refs.svg.clientWidth / 2 + 10 * hub.x, y: this.$refs.svg.clientHeight / 2 + 10 * hub.y }));
            }
        }
    }
</script>
