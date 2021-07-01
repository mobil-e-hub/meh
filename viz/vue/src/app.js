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
Vue.use(eventGridPlugin, { type: 'visualization', id: uuid().substr(0, 8), wssUrl });

// Create app
new Vue({ render: (h) => h(App), store }).$mount('#app');
