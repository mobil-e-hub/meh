// Vue modules
import Vue from 'vue';
import Vuex from 'vuex';

//Own modules
import topology from '../../topology';

// Setup
Vue.use(Vuex);

// TODO: Consistent handling of plural forms
const plural = {
    drone: 'drones',
    car: 'cars',
    bus: 'buses',
    parcel: 'parcels',
    hub: 'hubs',
    address: 'addresses'
};

export default new Vuex.Store({
    state: {
        entities: {
            drones: {},
            cars: {},
            buses: {},
            parcels: {},
            hubs: {},
            addresses: {}
        },
        topology: topology,
        settings: {
            map: {
                origin: { x: 0, y: 0 },
                zoom: {
                    factor: 4,
                    entities: true,
                    topology: true
                },
                displaySize: {
                    hub: 10,
                    drone: 5,
                    car: 20,
                    bus: 10,
                    parcel: 12,
                    node: 2,
                    edge: 1,
                    address: 7
                }
            }
        }
    },
    getters: {

    },
    mutations: {
        updateEntityState(state, { type, id, payload }) {
            Vue.set(state.entities[plural[type]], id, payload);
        },
        mapZoom(state, { factor }) {
            state.settings.map.zoom.factor *= factor;
        },
        mapMove(state, { offsetX, offsetY }) {
            state.settings.map.origin.x += offsetX;
            state.settings.map.origin.y += offsetY;
        },
        mapSetOrigin(state, { x, y }) {
            state.settings.map.origin.x = x;
            state.settings.map.origin.y = y;
        }
    }
});
