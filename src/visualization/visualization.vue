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
                        <b-button variant="link" :title="state === 'listening' ? 'Stop listening' : 'Start listening'" @click="clickListenButton">
                            <b-icon icon="record-circle-fill" :variant="state === 'listening' ? 'danger' : 'secondary'" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Start simulation" @click="clickStartSimulationButton">
                            <b-icon :icon="state === 'running' ? 'pause-fill' : 'play-fill'" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Stop simulation" @click="clickStopSimulationButton">
                            <b-icon icon="stop-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Reset simulation" @click="clickResetSimulationButton">
                            <b-icon icon="arrow-counterclockwise" aria-hidden="true"></b-icon>
                        </b-button>

<!--                        <b-button variant="link" title="Place order" @click="clickPlaceOrderButton" :disabled="state === 'stopped'">-->
<!--                            <b-icon icon="bag-plus-fill" aria-hidden="true"></b-icon>-->
<!--                        </b-button>-->

                        <b-button variant="link" title="Zoom in" @click="clickZoomInButton">
                            <b-icon icon="zoom-in" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-nav-text style="min-width: 50px; text-align: center">{{ Math.round(map.zoom.factor * 100) }}%</b-nav-text>

                        <b-button variant="link" title="Zoom out" @click="clickZoomOutButton">
                            <b-icon icon="zoom-out" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button variant="link" title="Run test function" @click="clickTestButton">
                            <b-icon icon="braces" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-button v-b-modal.modal-send-message variant="link" title="Send message">
                            <b-icon icon="terminal-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-modal id="modal-send-message" title="Send message" @ok="clickSendButton">
                            <b-form-group label="Topic" label-for="input-message-topic">
                                <b-form-input id="input-message-topic" v-model="command.message.topic" placeholder="from/visualization/..." required></b-form-input>
                            </b-form-group>

                            <b-form-group label="Message" label-for="input-message-message">
                                <b-form-input id="input-message-message" v-model="command.message.message" placeholder="{ data: 'Hello World' }" required></b-form-input>
                            </b-form-group>
                        </b-modal>

                        <b-button v-b-modal.modal-place-order variant="link" title="Place order">
                            <b-icon icon="bag-plus-fill" aria-hidden="true"></b-icon>
                        </b-button>

                        <b-modal id="modal-place-order" title="Place order" @ok="clickPlaceOrderButton">
                            <b-form-group label="Vendor" label-for="input-order-vendor">
                                <b-form-select id="input-order-vendor" v-model="command.order.vendor" :options="Object.values(map.topology.customers).map(c => ({ value: c.id, text: `${c.name} (${map.topology.addresses[c.address].name})` }))" required></b-form-select>
                            </b-form-group>

                            <b-form-group label="Customer" label-for="input-order-customer">
                                <b-form-select id="input-order-customer" v-model="command.order.customer" :options="Object.values(map.topology.customers).map(c => ({ value: c.id, text: `${c.name} (${map.topology.addresses[c.address].name})` }))" required></b-form-select>
                            </b-form-group>

                            <b-form-group label="Pick-up time" label-for="input-order-pickup">
                                <b-form-select id="input-order-pickup" v-model="command.order.pickup" :options="Array.from({length: 24}, (x, h) => ({ value: h, text: `${h}:00` }))" required></b-form-select>
                            </b-form-group>

                            <b-form-group label="Drop-off time" label-for="input-order-dropoff">
                                <b-form-select id="input-order-dropoff" v-model="command.order.dropoff" :options="Array.from({length: 24}, (x, h) => ({ value: h, text: `${h}:00` }))" required></b-form-select>
                            </b-form-group>
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
                                        <g :transform="`translate(${map.origin.x}, ${map.origin.y}) scale(${map.zoom.factor}, -${map.zoom.factor}) translate(${map.offset.x}, ${map.offset.y})`">
                                            <!--Topology (nodes, edges)-->
                                            <circle v-for="(node, id) in map.topology.nodes"
                                                    :key="id"
                                                    :r="map.displaySize.node / (map.zoom.topology ? 1 : map.zoom.factor)"
                                                    :cx="node.position.x"
                                                    :cy="node.position.y"
                                                    fill="lightgray"
                                            >
                                                <title>Node {{ node.id }} ({{ node.type }})</title>
                                            </circle>

                                            <line v-for="(edge, id) in map.topology.edges"
                                                  :key="id"
                                                  :x1="map.topology.nodes[edge.from].position.x"
                                                  :y1="map.topology.nodes[edge.from].position.y"
                                                  :x2="map.topology.nodes[edge.to].position.x"
                                                  :y2="map.topology.nodes[edge.to].position.y"
                                                  stroke="lightgray"
                                                  :stroke-width="map.displaySize.edge / (map.zoom.topology ? 1 : map.zoom.factor)"
                                                  :stroke-dasharray="edge.type === 'air' ? 1 : ''"
                                            />


                                            <!--Content-->
                                            <template>
                                                <!--Static content (hubs, addresses)-->
                                                <g v-for="(hub, id) in entities.hubs" :key="id">
                                                    <!--Hub-->
                                                    <use :x="hub.cx - hub.width / 2"
                                                         :y="hub.cy - hub.height / 2"
                                                         :width="hub.width"
                                                         :height="hub.height"
                                                         :href="require('../../assets/entities.svg') + '#hub-symbol'"
                                                         :fill="hub.fill"
                                                         v-b-popover.hover.right="`Hub ${id} (Parcels: ${hub.stored})`"
                                                         title="Hub details"
                                                         transform="scale(1, -1)">
                                                    </use>

                                                    <!--Badge with Parcel count-->
                                                    <!--                                                    <g class="SVGBadge" v-if="hub.stored +1 > 0"  :transform="`rotate(-180 ${hub.x} ${hub.y})`">-->
                                                    <!--&lt;!&ndash;                                                        rotate(-180 ${hub.x} ${hub.y} ` scale(1, -1)`)&ndash;&gt;-->
                                                    <!--                                                        <circle class="SVGBadge-svgBackground" :cx="hub.x" :cy="hub.y - hub.height" r="3"/>-->
                                                    <!--&lt;!&ndash;                                                                TODO text in SVG: flip + translate correctly&ndash;&gt;-->
                                                    <!--                                                        &lt;!&ndash;                                                        <text class="SVGBadge-number" :x="hub.x" :y="hub.y - hub.height+1.5" transform="scale(-1,1)" text-anchor="middle" >{{ hub.stored +1}} </text>&ndash;&gt;-->
                                                    <!--                                                    </g>-->
                                                </g>

<!--                                                <g v-for="hub in svgHubs" :key="hub.id">-->
<!--                                                    <use :x="hub.x" :y="hub.y" :width="hub.width" :height="hub.height" :href="hub.href" :fill="hub.fill"-->
<!--                                                         v-b-popover.hover.right="`Hub ${hub.id} (Parcels: ${hub.stored})`" title="Hub details" transform="scale(1, -1)">-->
<!--&lt;!&ndash;                                                        <title>Hub {{ hub.id }} (Parcels:{{ hub.stored }})</title>&ndash;&gt;-->
<!--                                                    </use>-->
<!--&lt;!&ndash;                                                     Badges with Parcel count&ndash;&gt;-->
<!--&lt;!&ndash;                                                    <g class="SVGBadge" v-if="hub.stored +1 > 0"  :transform="`rotate(-180 ${hub.x} ${hub.y})`">&ndash;&gt;-->
<!--&lt;!&ndash;&lt;!&ndash;                                                        rotate(-180 ${hub.x} ${hub.y} ` scale(1, -1)`)&ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;                                                        <circle class="SVGBadge-svgBackground" :cx="hub.x" :cy="hub.y - hub.height" r="3"/>&ndash;&gt;-->
<!--&lt;!&ndash;&lt;!&ndash;                                                                TODO text in SVG: flip + translate correctly&ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;                                                        &lt;!&ndash;                                                        <text class="SVGBadge-number" :x="hub.x" :y="hub.y - hub.height+1.5" transform="scale(-1,1)" text-anchor="middle" >{{ hub.stored +1}} </text>&ndash;&gt;&ndash;&gt;-->
<!--&lt;!&ndash;                                                    </g>&ndash;&gt;-->
<!--                                                </g>-->

<!--                                                <use v-for="(address, id) in map.topology.addresses" :key="id" :x="address.position.x - entitySize.car" :y="-address.position.y - entitySize.car" :width="2 * entitySize.car" :height="2 * entitySize.car" :href="require('../../assets/entities.svg') + '#address-symbol'" fill="purple" transform="scale(1, -1)">-->
<!--                                                    <title>Address {{ address.id }} ({{ address.name }})</title>-->
<!--                                                </use>-->

                                                <!--Dynamic content (cars, drones, parcels-->
                                                <use v-for="(car, id) in entities.cars"
                                                     :key="id"
                                                     :x="car.cx - car.width / 2"
                                                     :y="car.cy - car.height / 2"
                                                     :width="car.width"
                                                     :height="car.height"
                                                     :fill="car.fill"
                                                     :href="require('../../assets/entities.svg') + '#car-symbol'"
                                                     transform="scale(1, -1)"
                                                >
                                                    <title>Car {{ id }} ({{ car.state }})</title>
                                                </use>


                                                <use v-for="(bus, id) in entities.buss" :key="id" :x="bus.position.x -  entitySize.bus + 2" :y="-bus.position.y - entitySize.bus + 3" :width="2 * entitySize.bus" :height="2 * entitySize.bus" :href="require('../../assets/entities.svg') + '#bus-symbol'" fill="blue" transform="scale(1, -1)">
<!--                                                    TODO add loaded parcels / capacity?-->
                                                    <title>Bus {{ bus.id }} ({{ bus.state }})</title>
                                                </use>

                                                <use v-for="(drone, id) in entities.drones"
                                                     :key="id"
                                                     :x="drone.cx - drone.width / 2"
                                                     :y="drone.cy - drone.height / 2"
                                                     :width="drone.width"
                                                     :height="drone.height"
                                                     :fill="drone.fill"
                                                     :href="require('../../assets/entities.svg') + '#drone-symbol'"
                                                     transform="scale(1, -1)"
                                                >
                                                    <title>Drone {{ id }} ({{ drone.state }})</title>
                                                </use>

                                                <use v-for="(parcel, id) in lodash.pickBy(entities.parcels, (p, key) => p.cx !== null)"
                                                     :key="id"
                                                     :x="parcel.cx - parcel.width / 2"
                                                     :y="parcel.cy - parcel.height / 2"
                                                     :width="parcel.width"
                                                     :height="parcel.height"
                                                     :fill="parcel.fill"
                                                     :href="require('../../assets/entities.svg') + '#parcel-symbol'"
                                                     transform="scale(1, -1)"
                                                     v-b-popover.hover.right="`Parcel ${id} (Source: ${parcel.carrier.id}, Destination: ${parcel.destination.id})`"
                                                     title="Parcel details">
                                                </use>
                                            </template>
                                        </g>
                                    </svg>
                                </b-col>

                                <b-col cols="3">
<!--                                    <b-card v-if="state !== 'stopped'" class="my-3" no-body>-->
<!--                                        <b-card-header>-->
<!--                                            Place Order-->
<!--                                        </b-card-header>-->

<!--                                        <b-card-body>-->
<!--                                            <div>-->
<!--                                                <b-form-group label="Source Hub" label-for="input-source-hub">-->
<!--                                                    <b-form-select id="input-source-hub" v-model="command.order.source" :options="Object.values(this.entities.hubs).map(h => h.id)" required></b-form-select>-->
<!--                                                </b-form-group>-->

<!--                                                <b-form-group label="Destination Hub" label-for="input-destination-hub">-->
<!--                                                    <b-form-select id="input-destination-hub" v-model="command.order.destination" :options="Object.values(this.entities.hubs).map(h => h.id)" required></b-form-select>-->
<!--                                                </b-form-group>-->

<!--                                                <b-button variant="primary" @click="clickPlaceOrderButton">-->
<!--                                                    Place Order-->
<!--                                                </b-button>-->
<!--                                            </div>-->
<!--                                        </b-card-body>-->
<!--                                    </b-card>-->

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
                    <div v-else-if="view === 'messages'">
                        <h4 class="mb-5">Messages</h4>
                        <pre style="max-height: 70vh; overflow-y: scroll; white-space: pre-wrap; word-break: keep-all;">{{ receivedMessages.slice(0, 100).map(m => `${m.timestamp} ${m.topic}: ${m.message.toString()}`).join('\n\n') }}</pre>
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
                                    <h4>Buses</h4>
                                    <b-list-group>
                                        <b-list-group-item v-for="(bus, id) in entities.buss" :key="id">{{ id }}</b-list-group-item>
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
                    <div v-else-if="view === 'settings'">
                        <h4 class="mb-5">Settings</h4>
                        <b-container fluid>
                            <b-row class="my-4">
                                <b-col>
                                    <h5>Display</h5>
                                    <b-form-checkbox id="checkbox-zoom-entities" v-model="map.zoom.entities">
                                        Zoom entity sizes
                                    </b-form-checkbox>
                                    <b-form-checkbox id="checkbox-zoom-topology" v-model="map.zoom.topology">
                                        Zoom node/edge sizes
                                    </b-form-checkbox>
                                </b-col>
                            </b-row>

                            <b-row class="my-4">
                                <b-col>
                                    <h5>MQTT Broker</h5>
                                    <div>
                                        <b-form-group label="Broker URL:" label-for="input-mqtt-broker">
                                            <b-form-input id="input-mqtt-broker" v-model="mqtt.url" type="url" placeholder="Enter URL" required></b-form-input>
                                        </b-form-group>
                                        <b-form-group label="Message Prefix:" label-for="input-mqtt-prefix">
                                            <b-form-input id="input-mqtt-prefix" v-model="mqtt.root" placeholder="Enter prefix" required></b-form-input>
                                        </b-form-group>
                                    </div>
                                </b-col>
                            </b-row>
                        </b-container>
                    </div>
                </b-col>
            </b-row>
        </b-container>

        <b-navbar fixed="bottom" variant="light">
            <b-navbar-nav class="mx-auto">
                <b-nav-text v-if="state === 'listening'" class="mx-3">{{incomingMessageCounter}}</b-nav-text>

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

                    <b-nav-text class="mx-3" title="Number of busses">
                        <font-awesome-icon icon="bus" style="color: blue" />: {{ Object.keys(entities.buss).length }}
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

        <b-button class="floating" :variant="view === 'simulation' ? 'primary' : ''" style="bottom: 220px" title="Map View" @click="setView('simulation')">
            <b-icon icon="map" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'messages' ? 'primary' : ''" style="bottom: 160px" title="Messages View" @click="setView('messages')">
            <b-icon icon="chat-left-text" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'entities' ? 'primary' : ''" style="bottom: 100px" title="Entities View" @click="setView('entities')">
            <b-icon icon="clipboard-data" aria-hidden="true"></b-icon>
        </b-button>
        <b-button class="floating" :variant="view === 'settings' ? 'primary' : ''" style="bottom: 40px" title="Settings View" @click="setView('settings')">
            <b-icon icon="gear-fill" aria-hidden="true"></b-icon>
        </b-button>
    </div>
</template>

<script>
const mqtt = require('mqtt');
const uuid = require('../simulator/helpers').uuid;
const mqttMatch = require('mqtt-match');
const _ = require('lodash');

const topology = require('../topology');

export default {
    data: function () {
        return {
            lodash: _,
            state: 'listening',
            view: 'simulation',
            receivedMessages: [],
            mqtt: {
                client: null,
                id: uuid(),
                root: 'mobil-e-hub/viz',
                url: 'ws://broker.hivemq.com:8000/mqtt'
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
                origin: { x: 0, y: 0 },
                offset: { x: 0, y: 0 },
                zoom: {
                    factor: 4,
                    entities: true,
                    topology: true
                },
                displaySize: {
                    hub: 25,
                    drone: 15,
                    car: 20,
                    //bus: 10,
                    parcel: 12,
                    node: 2,
                    edge: 1
                },
                drag: {
                    isDragging: false,
                    x: 0,
                    y: 0
                },
                topology: topology
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
                    message: null
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

    },
    created: function() {

    },
    mounted: function() {
        try {
            this.mqtt.client = mqtt.connect(this.mqtt.url);
            this.mqtt.client.on('connect', () => {
                this.mqtt.client.subscribe(this.mqtt.root + '/#');
            });
            this.mqtt.client.on('message', (topic, message) => {
                this.receivedMessages.unshift({ topic, message, timestamp: Date.now() });
                let [project, version, direction, entity, id, ...args] = topic.split('/');
                if (this.state === 'listening') {
                    this.receive({ version, direction, entity, id, args, rest: args.join('/'), string: { long: topic, short: `${direction}/${entity}/${id}/${args.join('/')}` } }, JSON.parse(message.toString()));
                }
            });

            setInterval(() => { this.currentTime = Date.now(); }, 1000)
        }
        catch (err) {
            this.receivedMessages.unshift({ topic: 'error', message: err.toString(), timestamp: Date.now() });
        }

        this.$set(this.map, 'origin', { x: this.$refs.svg.clientWidth / 2, y:this.$refs.svg.clientHeight / 2 });
    },
    methods: {
        clickStartSimulationButton: function() {
            this.publish('start');
            // switch (this.state) {
            //     case 'running':
            //         this.publish('pause');
            //         this.state = 'paused';
            //         break;
            //     case 'paused':
            //         this.publish('resume');
            //         this.state = 'running';
            //         break;
            //     case 'stopped':
            //         this.publish('start');
            //         this.state = 'running';
            //         this.$set(this.map, 'origin', { x: this.$refs.svg.clientWidth / 2, y:this.$refs.svg.clientHeight / 2 });
            //         break;
            // }
        },
        clickStopSimulationButton: function() {
            this.publish('stop');
            // this.state = 'stopped';
            // this.$set(this.entities.raw, 'drones', { });
            // this.$set(this.entities.raw, 'cars', { });
            // this.$set(this.entities.raw, 'hubs', { });
            // this.$set(this.entities.raw, 'parcels', { });
            // this.$set(this.entities, 'drones', { });
            // this.$set(this.entities, 'cars', { });
            // this.$set(this.entities, 'hubs', { });
            // this.$set(this.entities, 'parcels', { });
        },
        clickResetSimulationButton: function() {
            this.publish('reset');
        },
        clickZoomInButton: function() {
            this.map.zoom.factor *= 1.25;
        },
        clickZoomOutButton: function() {
            this.map.zoom.factor *= 0.8;
        },
        setView: function(view) {
            this.view = view;
        },
        onMouseWheelMap: function(event) {
            this.map.zoom.factor *= event.deltaY > 0 ? 1 / 1.05 : 1.05;
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
            if (this.matchTopic(topic, 'from/+/+/state')) {
                this.updateState(topic, message);
            }
            else if (this.matchTopic(topic, 'to/drone/+/tasks')) {
                this.showToastRouting('Task assigned', `Drone ${topic.id} has been assigned a new task.`);
            }
            else if (this.matchTopic(topic, 'from/parcel/+/placed')) {
                this.showToastStatus('Order placed', `Parcel ${topic.id} has been placed at hub ${message.carrier.id} with destination ${message.destination.id}.`);
            }
            else if (this.matchTopic(topic, 'from/control-system/+/route-update')) {
                this.showToastRouting('Route update', `Control System ${topic.id} has updated the routes.`);
            }
            else if (this.matchTopic(topic, 'from/car/+/arrived')) {
                this.showToastStatus('Car arrived', `Car ${topic.id} has arrived at node ${message}.`);
            }
            else if (this.matchTopic(topic, 'from/+/+/mission/+/complete')) {
                this.showToastStatus('Mission complete', `${topic.entity} ${topic.id} has completed mission ${topic.args[1]}.`);
            }
            else if (this.matchTopic(topic, 'from/+/+/transaction/+/complete')) {
                this.showToastStatus('Transaction complete', `${topic.entity} ${topic.id} has completed transaction ${topic.args[1]}.`);
            }
            else if (this.matchTopic(topic, 'from/parcel/+/delivered')) {
                this.showToastStatus('Parcel delivered', `Parcel ${topic.id} has reached its destination ${message.destination.id}.`);
            }
            else if (this.matchTopic(topic, 'to/visualization/#')) {
                this.showToastStatus('Message received', `${topic.string.short}: ${JSON.stringify(message)}`);
            }
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
        matchTopic: function(topic, pattern) {
            return mqttMatch(pattern, topic.string.short);
        },
        getX: function(node) {
            return this.map.topology.nodes[node].position.x;
        },
        getY: function(node) {
            return this.map.topology.nodes[node].position.y;
        },
        clickListenButton: function() {
            if (this.state === 'listening') {
                this.state = 'notListening';
            }
            else {
                this.state = 'listening';
            }
        },
        clickSendButton: function() {
            this.mqtt.client.publish(`${this.mqtt.root}/${this.command.message.topic}`, JSON.stringify(this.command.message.message));
        },
        clickTestButton: function() {
            this.publish('test');
            // this.state = 'running';
        },
        clickPlaceOrderButton: function() {
            this.publish('place-order', {
                id: uuid(),
                vendor: { type: 'customer', id: this.command.order.vendor },
                customer: { type: 'customer', id: this.command.order.customer },
                pickup: this.command.order.pickup,
                dropoff: this.command.order.dropoff
            });
        },
        toggleSidebar: function() {
            this.display.isSidebarVisible = !this.display.isSidebarVisible
        },
        updateState(topic, message) {
            if (topic.entity === 'hub') {
                const hub = message;
                const size = this.map.displaySize.hub / (this.map.zoom.entities ? this.map.zoom.factor : 1);
                this.$set(this.entities.hubs, [topic.id], {
                    id: hub.id,
                    cx: this.map.topology.nodes[hub.position].position.x,
                    cy: -this.map.topology.nodes[hub.position].position.y,
                    width: size,
                    height: size,
                    fill: Object.keys(hub.parcels).length > 0 ? 'red' : 'gray',
                    stored: Object.keys(hub.parcels).length
                });
            }
            else if (topic.entity === 'car') {
                const car = message;
                const size = this.map.displaySize.car / (this.map.zoom.entities ? this.map.zoom.factor : 1);
                this.$set(this.entities.cars, [topic.id], {
                    id: car.id,
                    cx: car.position.x,
                    cy: -car.position.y,
                    width: size,
                    height: size,
                    fill: 'blue',
                    state: car.state
                });
            }
            else if (topic.entity === 'drone') {
                const drone = message;
                const size = this.map.displaySize.drone / (this.map.zoom.entities ? this.map.zoom.factor : 1);
                this.$set(this.entities.drones, [topic.id], {
                    id: drone.id,
                    cx: drone.position.x,
                    cy: -drone.position.y,
                    width: size,
                    height: size,
                    fill: 'red',
                    state: drone.state
                });
            }
            else if (topic.entity === 'parcel') {
                const parcel = message;
                const carrier = this.entities[`${parcel.carrier.type}s`][parcel.carrier.id];
                const size = this.map.displaySize.parcel / (this.map.zoom.entities ? this.map.zoom.factor : 1);
                this.$set(this.entities.parcels, [topic.id], {
                    id: parcel.id,
                    cx: carrier ? carrier.cx : null,
                    cy: carrier ? carrier.cy : null,
                    width: size,
                    height: size,
                    fill: 'green',
                    carrier: parcel.carrier,
                    destination: parcel.destination
                });
            }
        }
    },
    computed: {
        parcelPosition: function() {
            return (parcel) => (parcel.carrier.type === 'hub' ? this.map.topology.nodes[this.entities.hubs[parcel.carrier.id].position].position : this.entities[`${parcel.carrier.type}s`][parcel.carrier.id].position);
        },
        svgHubs: function() {
            return Object.values(this.entities.hubs).map(h => ({ id: h.id, x: this.map.topology.nodes[h.position].position.x-3, y: this.map.topology.nodes[h.position].position.y-3, width: 6, height: 6, href: require('../../assets/entities.svg') + '#hub-symbol', fill: Object.keys(h.parcels).length > 0 ? 'red' : 'gray', stored: Object.keys(h.parcels).length }));
        },
        edgesRoad: function() {
            return Object.values(this.map.topology.edges).filter( e => e.type === 'road')
        },
        edgesAir: function() {
            return Object.values(this.map.topology.edges).filter( e => e.type === 'air')
        },
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
            const interval = 10;
            const count = this.receivedMessages.reduce(((n, m) => n + (this.currentTime - m.timestamp <= interval * 1000 ? 1 : 0)), 0);
            return count > 0 ? `${count / interval} messages per second` : 'No messages incoming';
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
