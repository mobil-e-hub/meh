<template>
    <div>
        <h4 class="mb-5">Entities</h4>
        <b-container fluid>
            <b-row>
                <b-col>
                    <h4>Hubs</h4>
                    <b-list-group>
                        <b-list-group-item v-for="(hub, id) in $store.state.entities.hubs" :key="id">{{ id }}</b-list-group-item>
                    </b-list-group>
                </b-col>
                <b-col>
                    <h4>Drones</h4>
                    <b-list-group>
                        <b-list-group-item v-for="(drone, id) in $store.state.entities.drones" :key="id">{{ id }}</b-list-group-item>
                    </b-list-group>
                </b-col>
                <b-col>
                    <h4>Cars</h4>
                    <b-list-group>
                        <b-list-group-item v-for="(car, id) in $store.state.entities.cars" :key="id">{{ id }}</b-list-group-item>
                    </b-list-group>
                </b-col>
                <b-col>
                    <h4>Buses</h4>
                    <b-list-group>
                        <b-list-group-item v-for="(bus, id) in $store.state.entities.buss" :key="id">{{ id }}</b-list-group-item>
                    </b-list-group>
                </b-col>
                <b-col>
                    <h4>Parcels</h4>
                    <b-list-group>
                        <b-list-group-item v-for="(parcel, id) in $store.state.entities.parcels" :key="id">{{ id }}</b-list-group-item>
                    </b-list-group>
                </b-col>
            </b-row>
        </b-container>
    </div>
</template>

<script>
    export default {
        name: 'Entities',
        data: function () {
            return {

            }
        },
        computed: {

        }
    }
</script>
