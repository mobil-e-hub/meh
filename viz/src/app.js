// Vue modules
import Vue from 'vue';
import App from './visualization.vue';

// Own modules
import store from './store/store';
import uuidPlugin from './plugins/uuid';
import mqttPlugin from './plugins/mqtt';

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
Vue.use(mqttPlugin, { broker: 'mqtt://broker.hivemq.com:8000/mqtt', root: 'mobil-e-hub/viz' }); // TODO: Replace MQTT plugin by Eventgrid plugin

// Create app
new Vue({ render: (h) => h(App), store }).$mount('#app');
