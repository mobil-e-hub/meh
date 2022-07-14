<template>
    <div id="app" class="bg-light">
        <b-navbar fixed="top" variant="light">

            <!--          Burger Menu to toggle Sidebar Menu-->
            <template>
<!--              -->
                <div id="burger" :class="{ 'active' : $store.state.settings.sideMenuVisible }" @click.prevent="toggleSidebar">
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
                        <b-button variant="link" :title="true ? 'Stop listening' : 'Start listening'" @click="">
                            <b-icon icon="record-circle-fill" :variant="true ? 'danger' : 'secondary'" aria-hidden="true"></b-icon>
                        </b-button>


                        <b-button variant="link" title="Zoom in" @click="$store.commit('mapZoom', { factor: 1.25 })">
                            <b-icon icon="zoom-in" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-nav-text style="min-width: 50px; text-align: center">{{ Math.round($store.state.settings.map.zoom.factor * 100) }}%</b-nav-text>

                        <b-button variant="link" title="Zoom out" @click="$store.commit('mapZoom', { factor: 0.8 })">
                            <b-icon icon="zoom-out" aria-hidden="true"></b-icon>
                        </b-button>

                    </b-button-toolbar>
                </b-nav-form>
            </b-navbar-nav>
        </b-navbar>

        <b-container fluid class="my-5">
            <b-row class="pt-4">
                <!--Map view-->
                <b-col :cols="view === 'none' ? 12 : 9" class="bg-white">


                        <!-- Sidebar Menu-->
                        <SideMenu v-if="$store.state.settings.sideMenuVisible"></SideMenu>


<!--                        <b-container fluid>-->
<!--                            <b-row>-->
<!--                                &lt;!&ndash; Map&ndash;&gt;-->
<!--                                <b-col :cols="view === 'none' ? 12 : 9">-->
                                    <svg ref="svg" width="100%" height="85vh" xmlns="http://www.w3.org/2000/svg" @wheel.prevent="onMouseWheelMap" @mousedown.prevent="onMouseDownMap" @mousemove.prevent="onMouseMoveMap" @mouseup.prevent="onMouseUpMap">
                                        <!--Topology (nodes, edges)-->
                                        <node v-for="(node, id) in $store.state.topology.nodes" :key="id" :id="id" />
                                        <edge v-for="(edge, id) in $store.state.topology.edges" :key="id" :id="id" />

                                        <!--Content-->
                                        <!--Static content (hubs, addresses)-->
                                        <hub v-for="(hub, id) in this.$store.state.entities.hubs" :key="id" :id="id"></hub>
                                        <address v-for="(address, id) in this.$store.state.entities.addresses" :key="id" :id="id"></address>
<!--                                        <use v-for="(address, id) in map.topology.addresses" :key="id" :x="address.position.x - entitySize.car" :y="-address.position.y - entitySize.car" :width="2 * entitySize.car" :height="2 * entitySize.car" :href="require('../../assets/entities.svg') + '#address-symbol'" fill="purple" transform="scale(1, -1)">-->
<!--                                            <title>Address {{ address.id }} ({{ address.name }})</title>-->
<!--                                        </use>-->

                                        <!--Dynamic content (cars, drones, parcels-->
                                        <drone v-for="(drone, id) in this.$store.state.entities.drones" :key="id" :id="id" />

                                        <car v-for="(car, id) in this.$store.state.entities.cars" :key="id" :id="id" />

                                        <bus v-for="(bus, id) in this.$store.state.entities.buses" :key="id" :id="id" >
                                          <title>Bus {{id}}</title>
                                        </bus>
                                    </svg>
<!--                                </b-col>-->

<!--                                <b-col cols="3">-->
<!--                                </b-col>-->
<!--                            </b-row>-->
<!--                        </b-container>-->
<!--                    </div>-->
                </b-col>

                <!--Side Panel-->
                <b-col v-if="view !== 'none'" cols="3">
                  <messages v-if="view === 'messages'" :messages="messages.messages"></messages>
                  <entities v-else-if="view === 'entities'"></entities>
                  <settings v-else-if="view === 'settings'"></settings>
                  <simulation v-else-if="view === 'simulation'"></simulation>
                </b-col>
            </b-row>
        </b-container>

        <b-navbar fixed="bottom" variant="light">
            <b-navbar-nav>
              <b-nav-item href="https://www.institute-for-enterprise-systems.de/">
                © 2021 InES
              </b-nav-item>
            </b-navbar-nav>

            <b-navbar-nav class="mx-auto" align-v="center" >
                <b-nav-text v-if="listening" class="mx-3 pr-5" >{{incomingMessageCounter}}      </b-nav-text>

                <b-nav-text class="mx-2 pl-2" title="Number of hubs">
                  <vue-material-icon class="mt-4" name="home"  :size="24" />
<!--                    <font-awesome-icon icon="warehouse" style="color: gray" />:-->
                   : {{numberOfHubs}}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of drones">
                    <vue-material-icon class="red-text" name="flight" :size="24" style="color: red" />
<!--                    <font-awesome-icon icon="plane" style="color: red" />-->
                  : {{numberOfDrones}}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of cars">
                  <vue-material-icon name="directions_car"  :size="24" />
<!--                    <font-awesome-icon icon="car" style="color: blue" />-->
                  : {{numberOfCars}}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of busses">

                  <vue-material-icon name="directions_bus"  :size="24" />
<!--                    <font-awesome-icon class="icon-red" icon="bus" style="color: blue" />-->
                  : {{numberOfBuses}}
                </b-nav-text>

                <b-nav-text class="mx-3" title="Number of parcels">
                  <!--                  // better: inventory_2 (parcel box)  &ndash;&gt; didn't  work-->
                  <vue-material-icon name="crop_square"  :size="24" />
<!--                    <font-awesome-icon icon="archive" style="color: green" />-->
                  : {{numberOfParcels}}
                </b-nav-text>
            </b-navbar-nav>

            <b-navbar-nav>
              <b-nav-item href="https://github.com/mobil-e-hub/meh">
                <b-icon class="mr-2" icon="github" aria-hidden="true"></b-icon>View on Github
              </b-nav-item>
            </b-navbar-nav>
        </b-navbar>

        <b-button class="floating" :variant="view === 'simulation' ? 'primary' : 'secondary'" style="bottom: 230px" title="Simulation View" @click="onClickView('simulation')">
          <b-icon icon="collection-play-fill" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'entities' ? 'primary' : 'secondary'" style="bottom: 170px" title="Entities View" @click="onClickView('entities')">
          <b-icon icon="clipboard-data" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'messages' ? 'primary' : 'secondary'" style="bottom: 110px" title="Messages View" @click="onClickView('messages')">
            <b-icon icon="chat-left-text" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'settings' ? 'primary' : 'secondary'" style="bottom: 50px" title="Settings View" @click="onClickView('settings')">
          <b-icon icon="gear-fill" aria-hidden="true"></b-icon>
        </b-button>

    </div>
</template>

<script>
const _ = require('lodash');

import { mapGetters } from 'vuex'

import Messages from './components/Messages';
import Entities from './components/Entities';
import Settings from './components/Settings';
import Simulation from './components/Simulation';

import SideMenu from './components/SideMenu';

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
            view: 'simulation',
            messages: {
                messages: [],
                counterInterval: 10
            },
            map: {
                drag: {
                    isDragging: false,
                    x: 0,
                    y: 0
                },
            },
            display: {
                areToastsEnabled: true,
                enabledToastTypes: ['status', 'routing', 'errors'],
            },
            stats: {
                waitingDrones:0,
                avgDroneWaitTime:0,
                waitingCars: 0,
            },
            currentTime: Date.now()
        }
    },
    components: {
        SideMenu,
        Messages,
        Entities,
        Settings,
        Simulation,
        Node,
        Edge,
        Hub,
        Drone,
        Car,
        Bus,
        // Address
    },
    created: function() {
        // Subscribe to all relevant topics
        console.log("Subscribing to topics - VUE_CREATED ")
        this.$mqtt.subscribe('#', (topic, message, metadata) => this.messages.messages.unshift({ topic, message, timestamp: metadata.timestamp }));
        this.$mqtt.subscribe('+/+/state', (topic, message) => this.$store.commit('updateEntityState', { type: topic.entity, id: topic.id, payload: message }));
        this.$mqtt.subscribe('+/+/reset', (topic, message) => this.$store.commit('resetEntityState'));
        this.$mqtt.subscribe('+/+/stop', (topic, message) => this.$store.commit('stopEntityState'));
        this.$mqtt.subscribe('order/+/placed', (topic, message) => this.showToastStatus('Order placed', `Order ${topic.id} for parcel ${message.id} has been placed with destination ${message.destination.id}.`));
        this.$mqtt.subscribe('+/+/parcel/+/placed', (topic, message) => this.showToastStatus('Parcel placed', `Parcel ${topic.id} has been placed at hub ${message.carrier.id} with destination ${message.destination.id}.`));
        this.$mqtt.subscribe('+/+/mission/+/complete', (topic, message) => this.showToastStatus('Mission complete', `${topic.entity} ${topic.id} has completed mission ${topic.args[1]}.`));
        this.$mqtt.subscribe('+/+/transaction/+/complete', (topic, message) => this.showToastStatus('Transaction complete', `${topic.entity} ${topic.id} has completed transaction ${topic.args[1]}.`));
        this.$mqtt.subscribe('parcel/+/delivered', (topic, message) => this.showToastStatus('Parcel delivered', `Parcel ${topic.id} has reached its destination ${message.destination.id}.`));
        this.$mqtt.subscribe('parcel/+/transfer', (topic, message) => this.showToastStatus('Parcel transferred', `Parcel ${topic.id} has been transferred to ${message.carrier.type} ${message.carrier.id}.`));
        this.$mqtt.subscribe('+/error/#', (topic, message) => this.showToastError(`Error ${topic.string.short}`, `${JSON.stringify(message)}`));
        this.$mqtt.subscribe('+/+/error/#', (topic, message) => this.showToastError(`Error ${topic.string.short}`, `${JSON.stringify(message)}`));
        this.$mqtt.subscribe('visualization/#', (topic, message) => this.showToastStatus('Message received', `${topic.string.short}: ${JSON.stringify(message)}`));
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
        onClickView: function(view) {
            this.view = (this.view === view) ? 'none' : view;
        },
        showToastStatus: function(title, message) {
            if (this.display.enabledToastTypes.includes('status')){
                this.showToast(title, message)
            }
        },
        showToastError: function(title, message) {
            if (this.display.enabledToastTypes.includes('errors')){
                this.showToast(title, `ERROR: ${message}`, 'danger')
            }
        },
        showToastRouting: function(title, message) {
            if (this.display.enabledToastTypes.includes('routing')){
                this.showToast(title, message)
            }
        },
        showToast: function(title, message, variant='default') {
            if (this.display.areToastsEnabled) {
                this.$bvToast.toast(message, {title: title, autoHideDelay: 3000, toaster: 'b-toaster-bottom-left', variant: variant});
            }
        },
        toggleSidebar: function() {
          this.$store.commit('toggleSideMenu');
        }
    },
    computed: {
        incomingMessageCounter: function() {
            const count = this.messages.messages.reduce(((n, m) => n + (this.currentTime - m.timestamp <= this.messages.counterInterval * 1000 ? 1 : 0)), 0);
            return count > 0 ? `${count / this.messages.counterInterval} messages per second` : 'No messages incoming';
        },
        ...mapGetters([
            'numberOfHubs',
            'numberOfDrones',
            'numberOfCars',
            'numberOfBuses',
            'numberOfParcels',
            // TODO add
        ])
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

vue-material-icon.icon-red {
  color: red;
}

</style>
