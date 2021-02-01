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
                        <b-button variant="link" :title="state === 'running' ? 'Pause simulation' : 'Start simulation'" @click="clickStartSimulationButton">
                            <b-icon :icon="state === 'running' ? 'pause-fill' : 'play-fill'" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Stop simulation" @click="clickStopSimulationButton" :disabled="state === 'stopped'">
                            <b-icon icon="stop-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Place order" @click="clickPlaceOrderButton" :disabled="state === 'stopped'">
                            <b-icon icon="bag-plus-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Zoom in" @click="clickZoomInButton">
                            <b-icon icon="zoom-in" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-nav-text style="min-width: 50px; text-align: center">{{ Math.round(map.zoom * 100) }}%</b-nav-text>

                        <b-button variant="link" title="Zoom out" @click="clickZoomOutButton">
                            <b-icon icon="zoom-out" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Run test function" @click="clickTestButton">
                            <b-icon icon="braces" aria-hidden="true"></b-icon>
                        </b-button>
                    </b-button-toolbar>
                </b-nav-form>
            </b-navbar-nav>
        </b-navbar>

        <b-container fluid class="my-5">
            <b-row class="pt-4">
                <b-col cols="12">
                    <div v-if="view === 'simulation'">
                        <svg ref="svg" width="100%" height="85vh" xmlns="http://www.w3.org/2000/svg" @wheel.prevent="onMouseWheelMap" @mousedown.prevent="onMouseDownMap" @mousemove.prevent="onMouseMoveMap" @mouseup.prevent="onMouseUpMap">
                            <g :transform="`translate(${map.origin.x}, ${map.origin.y}) scale(${map.zoom}, -${map.zoom}) translate(${map.offset.x}, ${map.offset.y})`">
                                <circle v-for="(node, id) in map.topology.nodes" :key="id" :r="2" :cx="node.position.x" :cy="node.position.y" fill="lightgray" />
                                <line v-for="(edge, id) in map.topology.edges" :key="id" :x1="getX(edge.from)" :y1="getY(edge.from)" :x2="getX(edge.to)" :y2="getY(edge.to)" stroke="lightgray" :stroke-width="1" />

                                <template v-if="state !== 'stopped'">
                                    <line :x1="-30 / map.zoom" y1="0" :x2="30 / map.zoom" y2="0" stroke="gray" :stroke-width="1 / map.zoom" />
                                    <line x1="0" :y1="-30 / map.zoom" x2="0" :y2="30 / map.zoom" stroke="gray" :stroke-width="1 / map.zoom" />

                                    <circle v-for="(hub, id) in entities.hubs" :key="id" :r="entitySize.hub" :cx="getX(hub.position)" :cy="getY(hub.position)" fill="gray">
                                        <title>Hub {{ hub.id }} ({{ hub.parcels.length }} parcels)</title>
                                    </circle>

                                    <circle v-for="(car, id) in entities.cars" :key="id" :r="entitySize.car" :cx="car.position.x" :cy="car.position.y" fill="blue">
                                        <title>Car {{ car.id }} ({{ car.state }})</title>
                                    </circle>

                                    <circle v-for="(drone, id) in entities.drones" :key="id" :r="entitySize.drone" :cx="drone.position.x" :cy="drone.position.y" fill="red">
                                        <title>Drone {{ drone.id }} ({{ drone.state }})</title>
                                    </circle>

                                    <circle v-for="(parcel, id) in entities.parcels" :key="id" :r="entitySize.parcel" :cx="parcelPosition(parcel).x" :cy="parcelPosition(parcel).y" fill="green">
                                        <title>Parcel {{ parcel.id }} ({{ parcel.state }})</title>
                                    </circle>
                                </template>
                            </g>
                        </svg>
                    </div>
                    <div v-else-if="view === 'messages'">
                        <h4 class="mb-5">Messages</h4>
                        <pre style="max-height: 70vh; overflow-y: scroll; white-space: pre-wrap; word-break: keep-all;">{{ receivedMessages.slice(0, 100).join('\n\n') }}</pre>
                    </div>
                    <div v-else-if="view === 'entities'">
                        <h4 class="mb-5">Entities</h4>
                        <b-container fluid>
                            <b-row>
                                <b-col>
                                    <h4>Hubs</h4>
                                    <b-list-group>
                                        <b-list-group-item v-for="(hub, id) in entities.hubs" :key="id">{{ id }}</b-list-group-item>
                                    </b-list-group>
                                </b-col>
                                <b-col>
                                    <h4>Drones</h4>
                                    <b-list-group>
                                        <b-list-group-item v-for="(drone, id) in entities.drones" :key="id">{{ id }}</b-list-group-item>
                                    </b-list-group>
                                </b-col>
                                <b-col>
                                    <h4>Cars</h4>
                                    <b-list-group>
                                        <b-list-group-item v-for="(car, id) in entities.cars" :key="id">{{ id }}</b-list-group-item>
                                    </b-list-group>
                                </b-col>
                                <b-col>
                                    <h4>Parcels</h4>
                                    <b-list-group>
                                        <b-list-group-item v-for="(parcel, id) in entities.parcels" :key="id">{{ id }}</b-list-group-item>
                                    </b-list-group>
                                </b-col>
                            </b-row>
                        </b-container>
                    </div>
                </b-col>
            </b-row>
        </b-container>

        <b-navbar fixed="bottom" variant="light">
            <b-navbar-nav class="mx-auto">
                <template v-if="state !== 'stopped'">
                    <b-nav-text class="mx-2" title="Number of hubs">
                        <font-awesome-icon icon="warehouse" style="color: gray" />: {{Object.keys(entities.hubs).length }}
                    </b-nav-text>

                    <b-nav-text class="mx-3" title="Number of drones">
                        <font-awesome-icon icon="plane" style="color: red" />: {{Object.keys(entities.drones).length }}
                    </b-nav-text>

                    <b-nav-text class="mx-3" title="Number of cars">
                        <font-awesome-icon icon="car" style="color: blue" />: {{Object.keys(entities.cars).length }}
                    </b-nav-text>

                    <b-nav-text class="mx-3" title="Number of parcels">
                        <font-awesome-icon icon="archive" style="color: green" />: {{Object.keys(entities.parcels).length }}
                    </b-nav-text>
                </template>
                <template v-else>
                    <b-nav-text class="mx-3">
                        Click <b-icon icon="play-fill" aria-hidden="true"></b-icon> to start a simulation
                    </b-nav-text>
                </template>
            </b-navbar-nav>
        </b-navbar>

        <b-button class="floating" :variant="view === 'simulation' ? 'primary' : ''" style="bottom: 160px" @click="setView('simulation')">
            <b-icon icon="map" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'messages' ? 'primary' : ''" style="bottom: 100px" @click="setView('messages')">
            <b-icon icon="chat-left-text" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'entities' ? 'primary' : ''" style="bottom: 40px" @click="setView('entities')">
            <b-icon icon="clipboard-data" aria-hidden="true"></b-icon>
        </b-button>
    </div>
</template>

<script>
    const mqtt = require('mqtt');
    const uuid = require('../simulator/helpers').uuid;
    const mqttMatch = require('mqtt-match');

    const topology = require('../topology');

    export default {
        data: function () {
            return {
                state: 'stopped',
                view: 'simulation',
                receivedMessages: [],
                mqtt: {
                    client: null,
                    id: uuid(),
                    root: 'mobil-e-hub/v1'
                },
                entities: {
                    drones: { },
                    cars: { },
                    parcels: { },
                    hubs: { }
                },
                map: {
                    origin: { x: 500, y: 400 },
                    offset: { x: 0, y: 0 },
                    zoom: 4,
                    drag: {
                        isDragging: false,
                        x: 0,
                        y: 0
                    },
                    topology: topology
                },
                display: {
                    sizes: {
                        hub: 8,
                        drone: 4,
                        car: 6,
                        parcel: 2
                    },
                    zoomEntities: false
                }
            }
        },
        created: function() {

        },
        mounted: function() {
            try {
                this.mqtt.client = mqtt.connect('ws://broker.hivemq.com:8000/mqtt');
                this.mqtt.client.on('connect', () => {
                    this.mqtt.client.subscribe(this.mqtt.root + '/#');
                });
                this.mqtt.client.on('message', (topic, message) => {
                    let [project, version, direction, entity, id, ...args] = topic.split('/');
                    this.receive({ version, direction, entity, id, args, rest: args.join('/'), string: { long: topic, short: `${direction}/${entity}/${id}/${args.join('/')}` } }, JSON.parse(message.toString()));
                    this.receivedMessages.unshift(`${topic}: ${message.toString()}`);
                });
            }
            catch (err) {
                this.receivedMessages.unshift(err.toString());
            }

            this.$set(this.map, 'origin', { x: this.$refs.svg.clientWidth / 2, y:this.$refs.svg.clientHeight / 2 });
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
                        this.$set(this.map, 'origin', { x: this.$refs.svg.clientWidth / 2, y:this.$refs.svg.clientHeight / 2 });
                        break;
                }
            },
            clickStopSimulationButton: function() {
                this.publish('stop');
                this.state = 'stopped';
                this.$set(this.entities, 'drones', { });
                this.$set(this.entities, 'cars', { });
                this.$set(this.entities, 'hubs', { });
                this.$set(this.entities, 'parcels', { });
            },
            clickPlaceOrderButton: function() {
                this.publish('place-order');
            },
            clickZoomInButton: function() {
                this.map.zoom *= 1.25;
            },
            clickZoomOutButton: function() {
                this.map.zoom *= 0.8;
            },
            setView: function(view) {
                this.view = view;
            },
            onMouseWheelMap: function(event) {
                this.map.zoom *= event.deltaY > 0 ? 1 / 1.05 : 1.05;
            },
            onMouseDownMap: function(event) {
                this.map.drag.x = event.offsetX;
                this.map.drag.y = event.offsetY;
                this.map.drag.isDragging = true;
            },
            onMouseMoveMap: function(event) {
                if (this.map.drag.isDragging) {
                    this.map.origin.x += event.offsetX - this.map.drag.x;
                    this.map.origin.y += event.offsetY - this.map.drag.y;
                    this.map.drag.x = event.offsetX;
                    this.map.drag.y = event.offsetY;
                }
            },
            onMouseUpMap: function(event) {
                this.map.origin.x += event.offsetX - this.map.drag.x;
                this.map.origin.y += event.offsetY - this.map.drag.y;
                this.map.drag.x = event.offsetX;
                this.map.drag.y = event.offsetY;
                this.map.drag.isDragging = false;
            },
            publish: function(topic, message = '') {
                this.mqtt.client.publish(`${this.mqtt.root}/from/visualization/${this.mqtt.id}/${topic}`, JSON.stringify(message));
            },
            receive: function(topic, message) {
                if (['running', 'paused'].includes(this.state)) {
                    if (this.matchTopic(topic, 'from/+/+/state')) {
                        this.$set(this.entities[`${topic.entity}s`], [topic.id], message);
                    }
                }
                if (this.matchTopic(topic, 'to/drone/+/tasks')) {
                    this.showToast('Task assigned', `Drone ${topic.id} has been assigned a new task.`);
                }
                else if (this.matchTopic(topic, 'from/parcel/+/placed')) {
                    this.showToast('Order placed', `Parcel ${topic.id} has been placed at hub ${message.destination.id}.`);
                }
                else if (this.matchTopic(topic, 'from/control-system/+/route-update')) {
                    this.showToast('Route update', `Control System ${topic.id} has updated the routes.`);
                }
                else if (this.matchTopic(topic, 'from/car/+/arrived')) {
                    this.showToast('Car arrived', `Car ${topic.id} has arrived at node ${message}.`);
                }
                else if (this.matchTopic(topic, 'from/+/+/mission/+/complete')) {
                    this.showToast('Mission complete', `${topic.entity} ${topic.id} has completed mission ${topic.args[1]}.`);
                }
                else if (this.matchTopic(topic, 'from/+/+/transaction/+/complete')) {
                    this.showToast('Transaction complete', `${topic.entity} ${topic.id} has completed transaction ${topic.args[1]}.`);
                }
                else if (this.matchTopic(topic, 'from/parcel/+/delivered')) {
                    this.showToast('Parcel delivered', `Parcel ${topic.id} has reached its destination (${message.destination.type} ${message.destination.id}).`);
                }
            },
            showToast: function(title, message) {
                this.$bvToast.toast(message, { title: title, autoHideDelay: 3000, toaster: 'b-toaster-bottom-left' });
            },
            matchTopic: function(topic, pattern) {
                return mqttMatch(pattern, topic.string.short);
            },
            getX: function(node) {
                return this.map.topology.nodes[node].position.x;
            },
            getY: function(node) {
                return this.map.topology.nodes[node].position.y;
            },
            clickTestButton: function() {
                this.publish('test');
                this.state = 'running';
            }
        },
        computed: {
            entitySize: function() {
                return {
                    hub: this.display.sizes.hub / (this.zoomEntities ? 1 : this.map.zoom),
                    drone: this.display.sizes.drone / (this.zoomEntities ? 1 : this.map.zoom),
                    car: this.display.sizes.car / (this.zoomEntities ? 1 : this.map.zoom),
                    parcel: this.display.sizes.parcel / (this.zoomEntities ? 1 : this.map.zoom)
                }
            },
            parcelPosition: function() {
                return (parcel) => (parcel.carrier.type === 'hub' ? this.map.topology.nodes[this.entities.hubs[parcel.carrier.id].position].position : this.entities[`${parcel.carrier.type}s`][parcel.carrier.id].position);
            }
        }
    }
</script>

<style>
    .btn.floating{
        position: fixed;
        width: 50px;
        height: 50px;
        right: 30px;
        text-align: center;
        border-radius: 50px;
        box-shadow: 2px 2px 3px #999;
        overflow: hidden;
        perspective: 1px;
        z-index: 10000;
    }
</style>
