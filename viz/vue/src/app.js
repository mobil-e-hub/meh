// Vue modules
import Vue from 'vue';
import App from './app.vue';

// External modules
const {v4: uuid} = require('uuid');

// const process = require('process');
const dotenv = require('dotenv');

// Own modules
import store from './store/store';
import uuidPlugin from './plugins/uuid';
import mqttPlugin from './plugins/mqtt';

// Environment variables
dotenv.config()
const wssUrl = process.env.VUE_APP_WSS_URL || 'wss://ines-gpu-01.informatik.uni-mannheim.de/meh/wss';
console.log('wssUrl:', wssUrl);
const mqttBroker = process.env.VUE_APP_MQTT_BROKER_URL || 'wss://ines-gpu-01.informatik.uni-mannheim.de/meh/mqtt';
const mqttPort = process.env.VUE_APP_MQTT_BROKER_PORT || 443;
const mqttUsername = process.env.VUE_APP_MQTT_BROKER_USERNAME;
const mqttPassword = process.env.VUE_APP_MQTT_BROKER_PASSWORD;

const mqttRoot = process.env.VUE_APP_MQTT_ROOT;

// UI
import {BootstrapVue, IconsPlugin} from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

import VueMaterialIcon from 'vue-material-icon'

process.title = 'Vue-app '

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);
Vue.component(VueMaterialIcon.name, VueMaterialIcon)

// Setup
Vue.config.productionTip = false;
Vue.use(uuidPlugin);
console.log(`Vue-options: broker ${mqttBroker} on port ${mqttPort} with root ${mqttRoot} `)
Vue.use(mqttPlugin, {broker: mqttBroker, root: mqttRoot, username: mqttUsername, password: mqttPassword});

// Create app
new Vue({render: (h) => h(App), store}).$mount('#app');
