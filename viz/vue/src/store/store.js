// Vue modules
import Vue from 'vue';
import Vuex from 'vuex';

//Own modules
import topology from '../../assets/topology';

// Setup
Vue.use(Vuex);

const plural = {
    drone: 'drones',
    car: 'cars',
    bus: 'buses',
    parcel: 'parcels',
    hub: 'hubs',
    address: 'addresses'
};

const resetEntityStates = () => {
    return {
        drones: {},
        cars: {},
        buses: {},
        parcels: {},
        hubs: {},
        addresses: {}
    }
}

export default new Vuex.Store({
    state: {
        entities: resetEntityStates(),
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
                    car: 10,
                    bus: 20,
                    parcel: 4,
                    node: 2,
                    edge: 1,
                    address: 7
                }
            },
            sideMenuVisible: false,
        },
        scenarios: { },
        selectedScenario: " ",
        statistics: {
            //TODO store stuff for stats here
            parcelsDelivered: 0,

        //    TODO: - commit and save parcel/id/delivered messages to compute number of dones
        //          - commit and save parcel/id/placed messages to compute number of active parcels
        //          - TODO: how to compute TIME?? --> no central time --> pause
        }
    },
    getters: {
        numberOfHubs: state => Object.keys(state.entities.hubs).length,
        numberOfDrones: state => Object.keys(state.entities.drones).length,
        numberOfCars: state => Object.keys(state.entities.cars).length,
        numberOfBuses: state => Object.keys(state.entities.buses).length,
        numberOfParcels: state => Object.keys(state.entities.parcels).length,
        availableScenarios: state => Object.keys(state.scenarios),
    },
    mutations: {
        updateEntityState(state, { type, id, payload }) {
            Vue.set(state.entities[plural[type]], id, payload);
        },
        resetEntityState(state) {
            Object.assign(state.entities, resetEntityStates())
        },
        stopEntityState(state) {
            Object.assign(state.entities, resetEntityStates())
        },
        updateScenarios(state, scenarios) {
            state.scenarios= scenarios;
            state.selectedScenario = Object.keys(scenarios).find( i => scenarios[i]);
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
        },
        toggleSideMenu(state) {
            state.settings.sideMenuVisible = !this.state.settings.sideMenuVisible;
        },
        setSelectedScenario(state, scenario) {
            state.scenarios[state.selectedScenario] = false;
            state.selectedScenario = scenario;
            state.scenarios[scenario] = true;
        },
        parcelDelivered(state, id) {
            // let index = state.entities.parcels.findIndex(p => p == id );
            // state.entities.parcels.splice(index, 1);
            // delete state.entities.parcels[id];
            Vue.delete(state.entities.parcels, id)
            state.statistics.parcelsDelivered += 1;

        }
    }
});
