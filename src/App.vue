<template>
  <div id="app">
    <Map id="map"/>
  </div>
</template>

<script>
import Map from './components/Map.vue'


export default {
  name: 'App',
  components: {
    Map
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  width: 100%;
}
#map {
  height: 100%;
  width: 100%;
  position: static;
}
</style>
