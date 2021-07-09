// Vue modules
import Vue from 'vue';
import App from './app.vue';

// External modules
const {v4: uuid} = require('uuid');

// Own modules
import store from './store/store';
import uuidPlugin from './plugins/uuid';
// import eventGridPlugin from './plugins/eventgrid';
import mqttPlugin from './plugins/mqtt';

// Environment variables
const wssUrl = process.env.VUE_APP_WSS_URL || 'wss://ines-gpu-01.informatik.uni-mannheim.de/meh/wss';
console.log('wssUrl:', wssUrl);
const mqttBroker = process.env.MQTT_BROKER_test; // TODO needed for arbitrary .env variables in vue
const mqttPort = process.env.BROKER_PORT_test;   //     -> https://www.npmjs.com/package/dotenv-webpack
const mqttRoot = process.env.MQTT_ROOT;

// UI
import {BootstrapVue, IconsPlugin} from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

// Icons - Material Design
// import VueMaterial from 'vue-material';
// import * as VueMaterial from 'vue-material/dist/vue-material.js';
// import 'vue-material/dist/vue-material.min.css';
// import 'vue-material/dist/theme/default.css';
// Vue.use(VueMaterial)

import VueMaterialIcon from 'vue-material-icon'

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);
Vue.component(VueMaterialIcon.name, VueMaterialIcon)

// Setup
Vue.config.productionTip = false;
Vue.use(uuidPlugin);
// Vue.use(eventGridPlugin, { type: 'visualization', id: uuid().substr(0, 8), wssUrl });
console.log(`Vue-options: broker ${mqttBroker} on port ${mqttPort} with root ${mqttPort} `)
// Vue.use(mqttPlugin, {broker: mqttBroker, port: mqttPort, root: mqttRoot});
Vue.use(mqttPlugin, {broker: 'mqtt://broker.hivemq.com:8000/mqtt', root: 'mobil-e-hub/v0'});
// Vue.use(mqttPlugin, {broker: 'wss://test.mosquitto.org', port: '8080', root: 'mobil-e-hub/v0'});

// Create app
new Vue({render: (h) => h(App), store}).$mount('#app');
