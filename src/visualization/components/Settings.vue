<template>
    <div>
        <h4 class="mb-5">Settings</h4>
        <b-container fluid>
            <b-row class="my-4">
                <b-col>
                    <h5>Display</h5>
                    <b-form-checkbox id="checkbox-zoom-entities" v-model="$store.state.settings.map.zoom.entities">
                        Zoom entity sizes
                    </b-form-checkbox>
                    <b-form-checkbox id="checkbox-zoom-topology" v-model="$store.state.settings.map.zoom.topology">
                        Zoom node/edge sizes
                    </b-form-checkbox>
                </b-col>
            </b-row>

            <b-row class="my-4">
                <b-col>
                    <h5>MQTT Broker</h5>
                    <div>
                        <b-form-group label="Broker URL:" label-for="input-mqtt-broker">
                            <b-form-input id="input-mqtt-broker" v-model="$mqtt.broker" type="url" placeholder="Enter URL" required></b-form-input>
                        </b-form-group>
                        <b-form-group label="Message Prefix:" label-for="input-mqtt-prefix">
                            <b-form-input id="input-mqtt-prefix" v-model="$mqtt.root" placeholder="Enter prefix" required></b-form-input>
                        </b-form-group>
                    </div>
                </b-col>
            </b-row>
        </b-container>
    </div>
</template>

<script>
    export default {
        name: 'Settings',
        data: function () {
            return {

            }
        },
        computed: {

        }
    }
</script>
