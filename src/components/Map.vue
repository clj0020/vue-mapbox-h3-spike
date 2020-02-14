<template>
<div>
    <MglMap
      id="map"
      :accessToken="accessToken"
      :mapStyle.sync="mapStyle"
      @load="onMapLoaded">
    </MglMap>
    <div id="changeResolution">
        <h3>Resolution: {{h3Resolution}}</h3>
        <input        
          type="range"
          min="7"
          v-bind:max="maxH3Resolution"
          v-bind:value="h3Resolution"
          v-on:input="onSliderChange($event)"/>
    </div>
</div>
</template>

<style>

  #changeResolution {
    position: relative; 
    background: #ffffff; 
    display: inline-block;  
  }

  #map {
    position: fixed;
  }
</style>

<script>
import Mapbox from "mapbox-gl";
import { json } from "d3-fetch";

import { 
  MglMap
} from "vue-mapbox";

export default {
  components: {
    MglMap
  },
  data() {
    return {
      accessToken: 'pk.eyJ1IjoiY2xqMDAyMCIsImEiOiJjam80b2Y4cmEwMWFrM3ZwNW9wbzZvNjF0In0.tGdbiR2A0B9bbHXo_Hg93w', // your access token. Needed if you using Mapbox maps
      mapStyle: 'mapbox://styles/mapbox/streets-v11', // your map style
      config: {
        lng: -122.2,
        lat: 37.7923539,
        zoom: 10.5,
        fillOpacity: 0.75,
        colorScale: ['#ffffD9', '#50BAC3', '#1A468A']
      },
      maxH3Resolution: 10,
      h3Resolution: 7,
      travelTimes: null
    };
  },
  created() {
    // We need to set mapbox-gl library here in order to use it in template
    this.mapbox = Mapbox;
    this.map = null;
  }, 
  methods: {
    async onMapLoaded(event) {
      this.map = event.map;

      console.log(this.map);

      const asyncActions = event.component.actions;
      
      const newParams = await asyncActions.flyTo({
        center: [this.config.lng, this.config.lat],
        zoom: this.config.zoom,
        speed: 1
      });
      console.log(newParams);

      this.travelTimes = await this.seedTravelTimes();
      console.log(this.travelTimes);
      const hexagons = this.transformPolygonsToHexagons(this.travelTimes);
      this.renderHexes(this.map, hexagons);
    },
    onSliderChange(event) {
      console.log(typeof event.target.value);
      console.log(event.target.value);
      this.h3Resolution = Number(event.target.value);
      const hexagons = this.transformPolygonsToHexagons(this.travelTimes);
      this.renderHexes(this.map, hexagons);
    },
    renderHexes(map, hexagons) {
      // Transform the current hexagon map into a GeoJSON object
      const geojson = this.$geojson2h3.h3SetToFeatureCollection(
        Object.keys(hexagons),
        hex => ({value: hexagons[hex]})
      );

      const sourceId = 'h3-hexes';
      const layerId = `${sourceId}-layer`;

      let source = map.getSource(sourceId);

      if(!source) {
        const geoJsonLayer = {
            id: layerId,
            source: sourceId,
            type: 'fill',
            interactive: false,
            paint: {
              'fill-outline-color': 'rgba(0,0,0,0)',
            }
        };

        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });
        map.addLayer(geoJsonLayer);

        source = map.getSource(sourceId);
      }
    
      source.setData(geojson);

      // Update the layer paint properties, using the current config values
      map.setPaintProperty(layerId, 'fill-color', {
        property: 'value',
        stops: [
          [0, this.config.colorScale[0]],
          [0.5, this.config.colorScale[1]],
          [1, this.config.colorScale[2]]
        ]
      });
  
      map.setPaintProperty(layerId, 'fill-opacity', this.config.fillOpacity);
    },
    generateBasicHexagons() {
      const centerHex = this.$geoToH3(this.config.lat, this.config.lng, 8);
      const kRing = this.$kRing(centerHex, 3);
      return kRing.reduce((res, hexagon) => ({...res, [hexagon]: Math.random()}), {});
    },
    seedTravelTimes() {
      return json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/657a9f3b64fedc718c3882cd4adc645ac0b4cfc5/oakland_travel_times.json');
    },
    transformPolygonsToHexagons(travelTimes) {
        const layer = {};
        travelTimes.features.forEach(feature => {
          const hexagons = this.$geojson2h3.featureToH3Set(feature, this.h3Resolution);
            hexagons.forEach(h3Index => {
            layer[h3Index] = feature.properties.travelTime;
          })
        });
        return this.normalizeLayer(layer);
    },
    normalizeLayer(layer, zeroBaseline = false) {
      const hexagons = Object.keys(layer);
      // Pass one, get max (and min if needed)
      const max = hexagons.reduce((max, hex) => Math.max(max, layer[hex]), -Infinity);
      const min = zeroBaseline ? 0 : hexagons.reduce((min, hex) => Math.min(min, layer[hex]), Infinity);

      // Pass two, normalize.
      hexagons.forEach(hex => {
        layer[hex] = (layer[hex] - min) / (max - min);
      });

      return layer;
    }
  }
};
</script>