import Vue from 'vue'
import App from './App.vue'
import geojson2h3 from 'geojson2h3';
import { geoToH3, kRing } from 'h3-js';

Object.defineProperty(Vue.prototype, '$geojson2h3', { value: geojson2h3 });
Object.defineProperty(Vue.prototype, '$geoToH3', { value: geoToH3 });
Object.defineProperty(Vue.prototype, '$kRing', { value: kRing });

Vue.config.productionTip = false

new Vue({
  render: h => h(App),
}).$mount('#app')
