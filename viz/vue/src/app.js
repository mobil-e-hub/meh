// Vue modules
import Vue from 'vue';
import App from './app.vue';

// External modules
const { v4: uuid } = require('uuid');

// Own modules
import store from './store/store';
import uuidPlugin from './plugins/uuid';
import eventGridPlugin from './plugins/eventgrid';

// Environment variables
const wssUrl = process.env.VUE_APP_WSS_URL || 'wss://ines-gpu-01.informatik.uni-mannheim.de/meh/wss';
console.log('wssUrl:', wssUrl);

// UI
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

// Icons
// TODO: Include Material Design Icons

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

// Setup
Vue.config.productionTip = false;
Vue.use(uuidPlugin);
Vue.use(eventGridPlugin, { type: 'visualization', id: uuid().substr(0, 8), wssUrl });

// Create app
new Vue({ render: (h) => h(App), store }).$mount('#app');
