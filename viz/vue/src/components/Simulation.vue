<template>
    <div>
        <h4 class="mb-2">Simulation</h4>
        <b-container fluid>
            <b-row class="my-2">
                <b-col>
                    <div class="card" style="width: 20em; height: 110px; margin-bottom: 10px;">
                        <div class="card-header">
                          <b>Control Simulation</b>
                        </div>
                        <b-container fluid>

                            <b-row class="my-2">
                                <b-col>
                                    <b-button variant="link" title="Start simulation" @click="publishStart">
                                        <b-icon v-if="isPaused" icon="play-fill" aria-hidden="true"></b-icon>
                                        <b-icon v-if="!isPaused" icon="pause-fill" aria-hidden="true"></b-icon>
                                    </b-button>
                                </b-col>

                                <b-col>
                                    <b-button variant="link" title="Stop simulation" @click="publishStop">
                                        <b-icon icon="stop-fill" aria-hidden="true"></b-icon>
                                    </b-button>
                                </b-col>

                                <b-col>
                                    <b-button variant="link" title="Reset simulation" @click="publishReset">
                                        <b-icon icon="arrow-counterclockwise" aria-hidden="true"></b-icon>
                                    </b-button>
                                </b-col>

                            </b-row>
                        </b-container>
                    </div>
                </b-col>
            </b-row>

            <b-row>
                <b-col>
                    <div class="card" style="width: 20em; height: 110px; margin-bottom: 10px;">
                        <div class="card-header">
                            <b>Send Messages</b>
                        </div>
                        <b-container fluid>

                            <b-row class="my-2">
                                <b-col>
                                    <b-button variant="link" title="Run test function" @click="clickTestButton">
                                        <b-icon icon="braces" aria-hidden="true"></b-icon>
                                    </b-button>
                                </b-col>

                                <b-col>
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
                                </b-col>

                                <b-col>
                                    <b-button v-b-modal.modal-place-order variant="link" title="Place order">
                                        <b-icon icon="bag-plus-fill" aria-hidden="true"></b-icon>
                                    </b-button>

                                    <b-modal id="modal-place-order" title="Place order" @ok="clickPlaceOrderButton">
                                        <b-form-group label="Vendor" label-for="input-order-vendor">
                                            <b-form-select id="input-order-vendor" v-model="command.order.vendor" :options="Object.values($store.state.topology.customers).map(c => ({ value: c.id, text: `${c.name} (${$store.state.topology.addresses[c.address].name})` }))" required></b-form-select>
                                        </b-form-group>

                                        <b-form-group label="Customer" label-for="input-order-customer">
                                            <b-form-select id="input-order-customer" v-model="command.order.customer" :options="Object.values($store.state.topology.customers).map(c => ({ value: c.id, text: `${c.name} (${$store.state.topology.addresses[c.address].name})` }))" required></b-form-select>
                                        </b-form-group>

                                        <b-form-group label="Pick-up time" label-for="input-order-pickup">
                                            <b-form-select id="input-order-pickup" v-model="command.order.pickup" :options="Array.from({length: 24}, (x, h) => ({ value: h, text: `${h}:00` }))" required></b-form-select>
                                        </b-form-group>

                                        <b-form-group label="Drop-off time" label-for="input-order-dropoff">
                                            <b-form-select id="input-order-dropoff" v-model="command.order.dropoff" :options="Array.from({length: 24}, (x, h) => ({ value: h, text: `${h}:00` }))" required></b-form-select>
                                        </b-form-group>
                                    </b-modal>
                                </b-col>
                            </b-row>
                        </b-container>
                    </div>
                </b-col>
            </b-row>




            <div class="card" style="width: 20rem; margin-top: 10px;">
                <div class="card-header">
                    <b>Statistics Table (Dummy)</b>
                </div>
                <div class="table-responsive">

                    <table class="card-table table">
                        <thead>
                        <tr>
                            <th scope="col">Entity</th>
                            <th scope="col">Engaged</th>
                            <th scope="col">Avg. wait</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td>Drones</td>
                              <td> _x / {{$store.state.entities.drones.length }}</td>
                            <td>_10 min</td>
                        </tr>
                        <tr>
                            <td>Cars</td>
                              <td> _x / {{$store.state.entities.cars.length }}</td>
                            <td>_20 min</td>
                        </tr>
                        <tr>
                            <td>Buses</td>
                              <td> _x / {{$store.state.entities.buses.length }}</td>
                            <td>_50 min</td>
                        </tr>
                        <tr>
                            <td>
                                Parcel
                                <b-badge variant="info" class="badge-circle badge-md badge-floating border-white">transit</b-badge>
                            </td>
                              <td> _{{$store.state.entities.parcels.length }} </td>
                            <td>_42 min</td>
                        </tr>
                        <tr>
                            <td>Parcel
                                <b-badge variant="success" class="badge-circle badge-md badge-floating border-white">done</b-badge>
                            </td>
                              <td> _{{$store.state.entities.parcels.length }} </td>
                            <td>_2 h</td>
                        </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </b-container>
    </div>
</template>

<script>
    export default {
        name: 'Simulation',
        data: function () {
            return {
              isPaused: true,
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

            }
        },
        computed: {

        },
        methods: {
            publishStart: function() {
              this.isPaused = !this.isPaused;
              //TODO wie schaut Pausiermechanismus aus??
              this.$mqtt.publish('start');
            },
            publishStop: function() {
              this.isPaused = true;
              this.$mqtt.publish('stop');
            },
            publishReset: function() {
              this.$mqtt.publish('reset');
            },
            clickSendButton: function() {
              this.$mqtt.publish(this.command.message.topic, JSON.stringify(this.command.message.message), this.command.message.sender);
            },
            clickTestButton: function() {
              this.$mqtt.publish('test', { "bla" : "hello"});
            },
            clickPlaceOrderButton: function() {
              this.$mqtt.publish('place-order', {
                id: this.$uuid(),
                vendor: { type: 'customer', id: this.command.order.vendor },
                customer: { type: 'customer', id: this.command.order.customer },
                pickup: this.command.order.pickup,
                dropoff: this.command.order.dropoff
              });
          },
        },

    }
</script>
