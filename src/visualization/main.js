// Vue modules
import Vue from 'vue';
import App from './visualization.vue';

// Own modules
import store from './store/store';

// UI
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';

// Icons
import { library } from '@fortawesome/fontawesome-svg-core';
import { faCar, faBus, faPlane, faWarehouse, faArchive } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

library.add(faCar);
library.add(faBus);
library.add(faPlane);
library.add(faWarehouse);
library.add(faArchive);

Vue.component('font-awesome-icon', FontAwesomeIcon);

Vue.use(BootstrapVue);
Vue.use(IconsPlugin);

// Setup
Vue.config.productionTip = false;

// Create app
new Vue({ render: (h) => h(App), store }).$mount('#app');
