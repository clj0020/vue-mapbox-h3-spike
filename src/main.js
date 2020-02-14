import Vue from 'vue'
import App from './App.vue'
import geojson2h3 from 'geojson2h3';
import { geoToH3, hexRing, kRing, kRingDistances, edgeLength, UNITS } from 'h3-js';
import { BootstrapVue } from 'bootstrap-vue';
import 'bootstrap/dist/css/bootstrap.css';

Object.defineProperty(Vue.prototype, '$geojson2h3', { value: geojson2h3 });
Object.defineProperty(Vue.prototype, '$geoToH3', { value: geoToH3 });
Object.defineProperty(Vue.prototype, '$hexRing', { value: hexRing });
Object.defineProperty(Vue.prototype, '$kRing', { value: kRing });
Object.defineProperty(Vue.prototype, '$kRingDistances', { value: kRingDistances });
Object.defineProperty(Vue.prototype, '$edgeLength', { value: edgeLength });
Object.defineProperty(Vue.prototype, '$UNITS', { value: UNITS });

Vue.config.productionTip = false

Vue.use(BootstrapVue);

new Vue({
  render: h => h(App),
}).$mount('#app')
