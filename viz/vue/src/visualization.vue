<template>
    <div id="app">
        <b-navbar fixed="top" variant="light">

            <!--          Burger Menu to toggle Sidebar Menu-->
            <template>
                <div id="burger" :class="{ 'active' : this.display.isSidebarVisible }" @click.prevent="toggleSidebar">
                    <slot>
                        <button type="button" class="burger-button" title="Menu">
                            <span class="hidden">Toggle menu</span>
                            <span class="burger-bar burger-bar--1"></span>
                            <span class="burger-bar burger-bar--2"></span>
                            <span class="burger-bar burger-bar--3"></span>
                        </button>
                    </slot>
                </div>
            </template>

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
                        <!--Start/stop listening to messages-->
                        <b-button variant="link" :title="listening ? 'Stop listening' : 'Start listening'" @click="listening = !listening">
                            <b-icon icon="record-circle-fill" :variant="listening ? 'danger' : 'secondary'" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Start simulation" @click="$eventGrid.publish('start')">
                            <b-icon icon="play-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Stop simulation" @click="$eventGrid.publish('stop')">
                            <b-icon icon="stop-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Reset simulation" @click="$eventGrid.publish('reset')">
                            <b-icon icon="arrow-counterclockwise" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Zoom in" @click="$store.commit('mapZoom', { factor: 1.25 })">
                            <b-icon icon="zoom-in" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-nav-text style="min-width: 50px; text-align: center">{{ Math.round($store.state.settings.map.zoom.factor * 100) }}%</b-nav-text>

                        <b-button variant="link" title="Zoom out" @click="$store.commit('mapZoom', { factor: 0.8 })">
                            <b-icon icon="zoom-out" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Run test function" @click="clickTestButton">
                            <b-icon icon="braces" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button v-b-modal.modal-send-message variant="link" title="Send message">
                            <b-icon icon="terminal-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-modal id="modal-send-message" title="Send message" @ok="clickSendButton">
                            <b-form-group label="Sender" label-for="input-message-sender">
                                <b-form-input id="input-message-sender" v-model="command.message.sender" placeholder="from/visualization/..."></b-form-input>
                            </b-form-group>

                            <b-form-group label="Topic" label-for="input-message-topic">
                                <b-form-input id="input-message-topic" v-model="command.message.topic" placeholder="status" required></b-form-input>
                            </b-form-group>

                            <b-form-group label="Message" label-for="input-message-message">
                                <b-form-input id="input-message-message" v-model="command.message.message" placeholder="{ data: 'Hello World' }" required></b-form-input>
                            </b-form-group>
                        </b-modal>

                        <b-button v-b-modal.modal-place-order variant="link" title="Place order">
                            <b-icon icon="bag-plus-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-modal id="modal-place-order" title="Place order" @ok="clickPlaceOrderButton">
<!--                            <b-form-group label="Vendor" label-for="input-order-vendor">-->
<!--                                <b-form-select id="input-order-vendor" v-model="command.order.vendor" :options="Object.values(map.topology.customers).map(c => ({ value: c.id, text: `${c.name} (${map.topology.addresses[c.address].name})` }))" required></b-form-select>-->
<!--                            </b-form-group>-->

<!--                            <b-form-group label="Customer" label-for="input-order-customer">-->
<!--                                <b-form-select id="input-order-customer" v-model="command.order.customer" :options="Object.values(map.topology.customers).map(c => ({ value: c.id, text: `${c.name} (${map.topology.addresses[c.address].name})` }))" required></b-form-select>-->
<!--                            </b-form-group>-->

<!--                            <b-form-group label="Pick-up time" label-for="input-order-pickup">-->
<!--                                <b-form-select id="input-order-pickup" v-model="command.order.pickup" :options="Array.from({length: 24}, (x, h) => ({ value: h, text: `${h}:00` }))" required></b-form-select>-->
<!--                            </b-form-group>-->

<!--                            <b-form-group label="Drop-off time" label-for="input-order-dropoff">-->
<!--                                <b-form-select id="input-order-dropoff" v-model="command.order.dropoff" :options="Array.from({length: 24}, (x, h) => ({ value: h, text: `${h}:00` }))" required></b-form-select>-->
<!--                            </b-form-group>-->
                        </b-modal>
                    </b-button-toolbar>
                </b-nav-form>
            </b-navbar-nav>
        </b-navbar>

        <b-container fluid class="my-5">
            <b-row class="pt-4">
                <b-col cols="12">
                    <div v-if="view === 'simulation'">
                        <!-- Sidebar Menu-->
                        <template>
                            <div class="sidebar">
                                <div class="sidebar-backdrop" @click="toggleSidebar" v-if="this.display.isSidebarVisible"></div>
                                <transition name="slide">
                                    <div v-if="this.display.isSidebarVisible" class="sidebar-panel mt-lg-4">
                                        <label class="mt-md-2 mb-auto" > <u> Settings: </u> </label>
                                        <ul>
                                            <li>
                                                <!-- ToggleButton - Stats Table-->
                                                <template>
                                                    <label for="toggle_stats_btn" :class="{'active': this.display.statsTableVisible}" class="toggle__button">

                                                        <span  class="toggle__label"> Stats:   </span>

                                                        <input type="checkbox"  id="toggle_stats_btn"  v-model="toggleStatsTable">
                                                        <span class="mr-auto toggle__switch"></span>
                                                    </label>
                                                </template>
                                            </li>
                                            <li>
                                                <!-- ToggleButton Toasts-->
                                                <template>
                                                    <label for="toggle_toast_btn" :class="{'active': this.display.areToastsEnabled}" class="toggle__button">

                                                        <span  class="toggle__label"> Toasts: </span>
                                                        <input type="checkbox"  id="toggle_toast_btn"  v-model="toggleToasts">
                                                        <span class="ml-auto toggle__switch"></span>
                                                    </label>
                                                </template>
                                                <ul>
                                                    <li>
                                                        <label for="checkbox_status" >Status  </label>
                                                        <input class="float-right" type="checkbox" id="checkbox_status" value="status" :disabled="!this.display.areToastsEnabled" v-model="this.display.enabledToastTypes">                                                    </li>
                                                    <li>
                                                        <label for="checkbox_routing" >Routing</label>
                                                        <input class="float-right" type="checkbox" id="checkbox_routing" value="routing" :disabled="!this.display.areToastsEnabled" v-model="this.display.enabledToastTypes">
                                                    </li>
                                                    <li>
                                                        <label for="checkbox_mission" >Missions</label>
                                                        <input class="float-right" type="checkbox" id="checkbox_mission" value="mission" :disabled="!this.display.areToastsEnabled" v-model="this.display.enabledToastTypes">
                                                    </li>
                                                </ul>

<!--                                                <label>{{ this.display.enabledToastTypes}}"</label>-->
<!--                                                <ul id="example-1">-->
<!--                                                    <li v-for="item in this.display.enabledToastTypes" :key="item.message">-->
<!--                                                        {{ item }}-->
<!--                                                    </li>-->
<!--                                                </ul>-->

                                            </li>
                                        </ul>

                                    </div>
                                </transition>
                            </div>
                        </template>

                        <b-container fluid>
                            <b-row>
                                <!-- Map-->
                                <b-col cols="9">
                                    <svg ref="svg" width="100%" height="85vh" xmlns="http://www.w3.org/2000/svg" @wheel.prevent="onMouseWheelMap" @mousedown.prevent="onMouseDownMap" @mousemove.prevent="onMouseMoveMap" @mouseup.prevent="onMouseUpMap">
                                        <!--Topology (nodes, edges)-->
                                        <node v-for="(node, id) in $store.state.topology.nodes" :key="id" :id="id" />
                                        <edge v-for="(edge, id) in $store.state.topology.edges" :key="id" :id="id" />

                                        <!--Content-->
                                        <!--Static content (hubs, addresses)-->
                                        <hub v-for="(hub, id) in $store.state.entities.hubs" :key="id" :id="id"></hub>

<!--                                        <use v-for="(address, id) in map.topology.addresses" :key="id" :x="address.position.x - entitySize.car" :y="-address.position.y - entitySize.car" :width="2 * entitySize.car" :height="2 * entitySize.car" :href="require('../../assets/entities.svg') + '#address-symbol'" fill="purple" transform="scale(1, -1)">-->
<!--                                            <title>Address {{ address.id }} ({{ address.name }})</title>-->
<!--                                        </use>-->

                                        <!--Dynamic content (cars, drones, parcels-->
                                        <use v-for="(car, id) in entities.cars"
                                             :key="id"
                                             :x="car.cx - car.width / 2"
                                             :y="car.cy - car.height / 2"
                                             :width="car.width"
                                             :height="car.height"
                                             :fill="car.fill"
                                             :href="require('../assets/entities.svg') + '#car-symbol'"
                                             transform="scale(1, -1)"
                                        >
                                            <title>Car {{ id }} ({{ car.state }})</title>
                                        </use>


                                        <use v-for="(bus, id) in entities.buss" :key="id" :x="bus.position.x -  entitySize.bus + 2" :y="-bus.position.y - entitySize.bus + 3" :width="2 * entitySize.bus" :height="2 * entitySize.bus" :href="require('../assets/entities.svg') + '#bus-symbol'" fill="blue" transform="scale(1, -1)">
<!--                                                    TODO add loaded parcels / capacity?-->
                                            <title>Bus {{ bus.id }} ({{ bus.state }})</title>
                                        </use>

                                        <drone v-for="(drone, id) in $store.state.entities.drones" :key="id" :id="id" />

                                        <use v-for="(parcel, id) in lodash.pickBy(entities.parcels, (p, key) => p.cx !== null)"
                                             :key="id"
                                             :x="parcel.cx - parcel.width / 2"
                                             :y="parcel.cy - parcel.height / 2"
                                             :width="parcel.width"
                                             :height="parcel.height"
                                             :fill="parcel.fill"
                                             :href="require('../assets/entities.svg') + '#parcel-symbol'"
                                             transform="scale(1, -1)"
                                             v-b-popover.hover.right="`Parcel ${id} (Source: ${parcel.carrier.id}, Destination: ${parcel.destination.id})`"
                                             title="Parcel details">
                                        </use>
                                    </svg>
                                </b-col>

                                <b-col cols="3">
                                    <template v-if="display.statsTableVisible">
                                        <div class="card" style="width: 22rem;">
                                            <div class="card-header">
                                                <b>Statistics (Dummy)</b>
                                            </div>
                                            <table class="card-table table">
                                                <thead>
                                                <tr>
                                                    <th scope="col">Entity</th>
                                                    <th scope="col">Engaged</th>
                                                    <th scope="col">Avg. wait (?)</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                <tr>
                                                    <td>Drones</td>
                                                    <td> _x / {{Object.keys(entities.drones).length }}</td>
                                                    <td>_10 min</td>
                                                </tr>
                                                <tr>
                                                    <td>Cars</td>
                                                    <td> _x / {{Object.keys(entities.cars).length }}</td>
                                                    <td>_20 min</td>
                                                </tr>
                                                <tr>
                                                    <td>Buses</td>
                                                    <td> _x / {{ Object.keys(entities.buss).length }}</td>
                                                    <td>_50 min</td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        Parcel
                                                        <b-badge variant="info" class="badge-circle badge-md badge-floating border-white">transit</b-badge>
                                                    </td>
                                                    <td> _{{Object.keys(entities.parcels).length }} </td>
                                                    <td>_42 min</td>
                                                </tr>
                                                <tr>
                                                    <td>Parcel
                                                        <b-badge variant="success" class="badge-circle badge-md badge-floating border-white">done</b-badge>
                                                    </td>
                                                    <td> _{{Object.keys(entities.parcels).length }} </td>
                                                    <td>_2 h</td>
                                                </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </template>
                                </b-col>
                            </b-row>
                        </b-container>
                    </div>
                    <messages v-else-if="view === 'messages'" :messages="messages.messages"></messages>
                    <entities v-else-if="view === 'entities'"></entities>
                    <settings v-else-if="view === 'settings'"></settings>
                </b-col>
            </b-row>
        </b-container>

        <b-navbar fixed="bottom" variant="light">
            <b-navbar-nav class="mx-auto">
                <b-nav-text v-if="listening" class="mx-3">{{incomingMessageCounter}}</b-nav-text>

                <b-nav-text class="mx-2" title="Number of hubs">
                    <font-awesome-icon icon="warehouse" style="color: gray" />: {{Object.keys(entities.hubs).length }}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of drones">
                    <font-awesome-icon icon="plane" style="color: red" />: {{Object.keys(entities.drones).length }}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of cars">
                    <font-awesome-icon icon="car" style="color: blue" />: {{Object.keys(entities.cars).length }}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of busses">
                    <font-awesome-icon icon="bus" style="color: blue" />: {{ Object.keys(entities.buss).length }}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of parcels">
                    <font-awesome-icon icon="archive" style="color: green" />: {{Object.keys(entities.parcels).length }}
                </b-nav-text>
            </b-navbar-nav>
        </b-navbar>

        <b-button class="floating" :variant="view === 'simulation' ? 'primary' : ''" style="bottom: 220px" title="Map View" @click="view = 'simulation'">
            <b-icon icon="map" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'messages' ? 'primary' : ''" style="bottom: 160px" title="Messages View" @click="view = 'messages'">
            <b-icon icon="chat-left-text" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'entities' ? 'primary' : ''" style="bottom: 100px" title="Entities View" @click="view = 'entities'">
            <b-icon icon="clipboard-data" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'settings' ? 'primary' : ''" style="bottom: 40px" title="Settings View" @click="view = 'settings'">
            <b-icon icon="gear-fill" aria-hidden="true"></b-icon>
        </b-button>
    </div>
</template>

<script>
const _ = require('lodash');

import Messages from './components/Messages';
import Entities from './components/Entities';
import Settings from './components/Settings';

import Node from './components/Node';
import Edge from './components/Edge';
import Hub from './components/Hub';
import Drone from './components/Drone';
import Car from './components/Car';
import Bus from './components/Bus';
import Address from './components/Address';

export default {
    data: function () {
        return {
            lodash: _,
            listening: true,
            view: 'simulation',
            messages: {
                messages: [],
                counterInterval: 10
            },
            entities: {
                raw: {
                    drones: { },
                    cars: { },
                    parcels: { },
                    hubs: { }
                },
                drones: { },
                cars: { },
                buss: {},   //plural busses breaks mqtt topic matching TODO
                parcels: { },
                hubs: { }
            },
            map: {
                drag: {
                    isDragging: false,
                    x: 0,
                    y: 0
                },
            },
            display: {
                isSidebarVisible: false,
                areToastsEnabled: true,
                enabledToastTypes: ['status'],
                statsTableVisible: false
            },
            stats: {
                waitingDrones:0,
                avgDroneWaitTime:0,
                waitingCars: 0,
            },
            command: {
                message: {
                    topic: null,
                    message: null,
                    sender: null
                },
                order: {
                    vendor: null,
                    customer: null,
                    pickup: null,
                    dropoff: null
                }
            },
            currentTime: Date.now()
        }
    },
    components: {
        Messages,
        Entities,
        Settings,
        Node,
        Edge,
        Hub,
        Drone,
        // Car,
        // Bus,
        // Address
    },
    created: function() {
        // Subscribe to all relevant topics
        this.$eventGrid.subscribe('#', (topic, message, metadata) => this.messages.messages.unshift({ topic, message, timestamp: metadata.timestamp }));
        this.$eventGrid.subscribe('from/+/+/state', (topic, message) => this.$store.commit('updateEntityState', { type: topic.entity, id: topic.id, payload: message }));
        this.$eventGrid.subscribe('to/drone/+/tasks', (topic, message) => this.showToastRouting('Task assigned', `Drone ${topic.id} has been assigned a new task.`));
        this.$eventGrid.subscribe('from/parcel/+/placed', (topic, message) => this.showToastStatus('Order placed', `Parcel ${topic.id} has been placed at hub ${message.carrier.id} with destination ${message.destination.id}.`));
        this.$eventGrid.subscribe('from/control-system/+/route-update', (topic, message) => this.showToastRouting('Route update', `Control System ${topic.id} has updated the routes.`));
        this.$eventGrid.subscribe('from/car/+/arrived', (topic, message) => this.showToastStatus('Car arrived', `Car ${topic.id} has arrived at node ${message}.`));
        this.$eventGrid.subscribe('from/+/+/mission/+/complete', (topic, message) => this.showToastStatus('Mission complete', `${topic.entity} ${topic.id} has completed mission ${topic.args[1]}.`));
        this.$eventGrid.subscribe('from/+/+/transaction/+/complete', (topic, message) => this.showToastStatus('Transaction complete', `${topic.entity} ${topic.id} has completed transaction ${topic.args[1]}.`));
        this.$eventGrid.subscribe('from/parcel/+/delivered', (topic, message) => this.showToastStatus('Parcel delivered', `Parcel ${topic.id} has reached its destination ${message.destination.id}.`));
        this.$eventGrid.subscribe('to/visualization/#', (topic, message) => this.showToastStatus('Message received', `${topic.string.short}: ${JSON.stringify(message)}`));
    },
    mounted: function() {
        // Update incoming message counter regularly
        setInterval(() => { this.currentTime = Date.now(); }, 1000);

        // Set map origin to center of viewport
        this.$store.commit('mapSetOrigin', { x: this.$refs.svg.clientWidth / 2, y:this.$refs.svg.clientHeight / 2 });
    },
    methods: {
        onMouseWheelMap: function(event) {
            this.$store.commit('mapZoom', { factor: event.deltaY > 0 ? 1 / 1.05 : 1.05 });
        },
        onMouseDownMap: function(event) {
            this.map.drag.x = event.offsetX;
            this.map.drag.y = event.offsetY;
            this.map.drag.isDragging = true;
        },
        onMouseMoveMap: function(event) {
            if (this.map.drag.isDragging) {
                this.$store.commit('mapMove', { offsetX: event.offsetX - this.map.drag.x, offsetY: event.offsetY - this.map.drag.y });
                this.map.drag.x = event.offsetX;
                this.map.drag.y = event.offsetY;
            }
        },
        onMouseUpMap: function(event) {
            this.$store.commit('mapMove', { offsetX: event.offsetX - this.map.drag.x, offsetY: event.offsetY - this.map.drag.y });
            this.map.drag.isDragging = false;
        },
        showToastStatus: function(title, message) {
            if (this.display.enabledToastTypes.includes('status')){
                this.showToast(title, message)
            }
        },
        showToastRouting: function(title, message) {
            if (this.display.enabledToastTypes.includes('routing')){
                this.showToast(title, message)
            }
        },
        // TODO debug showToastType --> freezes (?)
        showToast: function(title, message) {
            if (this.display.areToastsEnabled) {
                this.$bvToast.toast(message, {title: title, autoHideDelay: 3000, toaster: 'b-toaster-bottom-left'});
            }
        },
        clickSendButton: function() {
            this.$eventGrid.publish(this.command.message.topic, JSON.stringify(this.command.message.message), this.command.message.sender);
        },
        clickTestButton: function() {
            this.$eventGrid.publish('bla', 'hello');
        },
        clickPlaceOrderButton: function() {
            this.$eventGrid.publish('place-order', {
                id: this.$uuid(),
                vendor: { type: 'customer', id: this.command.order.vendor },
                customer: { type: 'customer', id: this.command.order.customer },
                pickup: this.command.order.pickup,
                dropoff: this.command.order.dropoff
            });
        },
        toggleSidebar: function() {
            this.display.isSidebarVisible = !this.display.isSidebarVisible
        },
    },
    computed: {
        toggleStatsTable: {
            get() {
                return this.display.statsTableVisible;
            },
            set(newValue) {
                this.display.statsTableVisible = newValue;
                this.$emit('change', newValue);
            }
        },
        toggleToasts: {
            get() {
                return this.display.areToastsEnabled;
            },
            set(newValue) {
                this.display.areToastsEnabled = newValue;
                this.$emit('change', newValue);
            }
        },
        incomingMessageCounter: function() {
            const count = this.messages.messages.reduce(((n, m) => n + (this.currentTime - m.timestamp <= this.messages.counterInterval * 1000 ? 1 : 0)), 0);
            return count > 0 ? `${count / this.messages.counterInterval} messages per second` : 'No messages incoming';
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

.card.floating{
    position: fixed;
    /*width: 50px;*/
    /*height: 50px;*/
    right: 30px;
    /*text-align: center;*/
    /*border-radius: 50px;*/
    /*box-shadow: 2px 2px 3px #999;*/
    overflow: hidden;
    perspective: 1px;
    z-index: 10;
}

/*!*    Burger Menu for Sidebar*!*/
.hidden {
    visibility: hidden;
}
/*button {*/
/*  cursor: pointer;*/
/*}*/
/* remove blue outline */
button:focus {
    outline: 0;
}
.burger-button {
    position: relative;
    height: 30px;
    width: 32px;
    display: block;
    z-index: 999;
    border: 0;
    border-radius: 0;
    background-color: transparent;
    pointer-events: all;
    transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.burger-bar {
    background-color: #130f40;
    position: absolute;
    top: 50%;
    right: 6px;
    left: 6px;
    height: 2px;
    width: auto;
    margin-top: -1px;
    transition: transform 0.6s cubic-bezier(0.165, 0.84, 0.44, 1),
    opacity 0.3s cubic-bezier(0.165, 0.84, 0.44, 1),
    background-color 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
}
.burger-bar--1 {
    -webkit-transform: translateY(-6px);
    transform: translateY(-6px);
}
.burger-bar--2 {
    transform-origin: 100% 50%;
    transform: scaleX(0.8);
}
.burger-button:hover .burger-bar--2 {
    transform: scaleX(1);
}
.no-touchevents .burger-bar--2:hover {
    transform: scaleX(1);
}
.burger-bar--3 {
    transform: translateY(6px);
}
#burger.active .burger-button {
    transform: rotate(-180deg);
}
#burger.active .burger-bar {
    background-color: #130f40;
}
#burger.active .burger-bar--1 {
    transform: rotate(45deg);
}
#burger.active .burger-bar--2 {
    opacity: 0;
}
#burger.active .burger-bar--3 {
    transform: rotate(-45deg);
}

/*    Sidebar_Menu*/

.slide-enter-active,
.slide-leave-active
{
    transition: transform 0.2s ease;
}
.slide-enter,
.slide-leave-to {
    transform: translateX(-100%);
    transition: all 150ms ease-in 0s
}
.sidebar-backdrop {
    background-color: rgba(19, 15, 64, 0.4);
    width: 100vw;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    cursor: pointer;
    z-index: 899;
}
.sidebar-panel {
    overflow-y: auto;
    background-color: #f8f9fa;
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    z-index: 999;
    padding: 3rem 20px 2rem 20px;
    width: 200px;
}

/*    Toggle Button in Sidemenu*/
.toggle__button {
    vertical-align: middle;
    user-select: none;
    cursor: pointer;
}
.toggle__button input[type="checkbox"] {
    opacity: 0;
    position: absolute;
    width: 1px;
    height: 1px;
}
.toggle__button .toggle__switch {
    display:inline-block;
    height:12px;
    border-radius:6px;
    width:40px;
    background: #BFCBD9;
    box-shadow: inset 0 0 1px #BFCBD9;
    position:relative;
    margin-left: 10px;
    transition: all .25s;
}
.toggle__button .toggle__switch::after,
.toggle__button .toggle__switch::before {
    content: "";
    position: absolute;
    display: block;
    height: 18px;
    width: 18px;
    border-radius: 50%;
    left: 0;
    top: -3px;
    transform: translateX(0);
    transition: all .25s cubic-bezier(.5, -.6, .5, 1.6);
}
.toggle__button .toggle__switch::after {
    background: #4D4D4D;
    box-shadow: 0 0 1px #666;
}
.toggle__button .toggle__switch::before {
    background: #4D4D4D;
    box-shadow: 0 0 0 3px rgba(0,0,0,0.1);
    opacity:0;
}
.active .toggle__switch {
    background: #adedcb;
    box-shadow: inset 0 0 1px #adedcb;
}
.active .toggle__switch::after,
.active .toggle__switch::before{
    transform:translateX(22px);
}
.active .toggle__switch::after {
    /*left: 23px;*/
    background: #53B883;
    box-shadow: 0 0 1px #53B883;
}


/*.SVGBadge-svg {*/
/*     font-size: 30px;*/
/*     position: absolute;*/
/*     bottom: 100%;*/
/*     left: 100%;*/
/*     width: 1em;*/
/*     height: 1em;*/
/*     margin-left: -0.6em;*/
/*     margin-bottom: -0.6em;*/
/* }*/

.SVGBadge {
    /*transform-origin: center;*/
    /*transform-box: fill-box;*/
}

.SVGBadge-svgBackground {
    fill: forestgreen;
    fill-opacity: 0.4;
    z-index: 5;
}

.SVGBadge-number {
    /*transform-origin: center center;*/

    fill: purple;
    font-family: sans-serif;
    font-size: 5px;
    letter-spacing: -1px;
    z-index: 5;
}

</style>

<!-- TODO elements ideas: add clock-->
