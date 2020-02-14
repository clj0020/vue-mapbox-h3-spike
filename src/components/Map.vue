<template>
<div>
    <MglMap
      id="map"
      :accessToken="accessToken"
      :mapStyle.sync="mapStyle"
      :center="[config.lng, config.lat]"
      @load="onMapLoaded">
    </MglMap>
    <div id="sliders">
        <h3>Crime Weight: {{crimeWeight}}</h3>
        <input        
          type="range"
          min="0"
          max="1"
          step=any
          v-bind:value="crimeWeight"
          v-on:input="onSliderChange($event, 'crime')"/>

        <h3>School Weight: {{schoolWeight}}</h3>
        <input        
          type="range"
          min="0"
          max="1"
          step=any
          v-bind:value="schoolWeight"
          v-on:input="onSliderChange($event, 'schools')"/>

        <h3>Bart Weight: {{bartWeight}}</h3>
        <input        
          type="range"
          min="0"
          max="1"
          step=any
          v-bind:value="bartWeight"
          v-on:input="onSliderChange($event, 'bart')"/>

        <h3>Travel Time Weight: {{travelTimeWeight}}</h3>
        <input        
          type="range"
          min="0"
          max="1"
          step=any
          v-bind:value="travelTimeWeight"
          v-on:input="onSliderChange($event, 'travelTime')"/>

        <h3>Points of Interest Weight: {{pointsOfInterestWeight}}</h3>
        <input        
          type="range"
          min="0"
          max="1"
          step=any
          v-bind:value="pointsOfInterestWeight"
          v-on:input="onSliderChange($event, 'poi')"/>

        <h3>Resolution: {{h3Resolution}}</h3>
        <input        
          type="range"
          min="7"
          v-bind:max="maxH3Resolution"
          v-bind:value="h3Resolution"
          v-on:input="onSliderChange($event, 'resolution')"/>
    </div>
</div>
</template>

<style>

  #sliders {
    position: relative; 
    background: #ffffff; 
    display: inline-block;  
  }

  #map {
    position: fixed;
  }

  .selected {
    background-color: rgb(63, 63, 63);
    color: white;
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
        zoom: 11,
        fillOpacity: 0.9,
        colorScale: ['#ffffD9', '#50BAC3', '#1A468A'],
        areaThreshold: 0.75
      },
      maxH3Resolution: 10,
      h3Resolution: 7,
      crimeLayer: null,
      crime90days: null,
      crimeWeight: 1,
      schoolsLayer: null,
      publicSchools: null,
      schoolWeight: 1,
      pointsOfInterestLayer: null,
      pointsOfInterest: null,
      pointsOfInterestWeight: 1,
      travelTimeLayer: null,
      travelTimes: null,
      travelTimeWeight: 1,
      bartLayer: null,
      bartStations: null,
      bartWeight: 1
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

      const asyncActions = event.component.actions;
      
      await asyncActions.flyTo({
        center: [this.config.lng, this.config.lat],
        zoom: this.config.zoom,
        speed: 1
      });

      await this.seedData();
      this.displayData(this.map);
    },
    async displayData(map) {
      await this.createLayers();
      
      var mapLayers = [
        {hexagons: this.schoolsLayer, weight: this.schoolWeight},
        {hexagons: this.bartLayer, weight: this.bartWeight},
        {hexagons: this.travelTimeLayer, weight: this.travelWeight},
        // Crime is bad, so we'll subtract it instead of adding
        {hexagons: this.crimeLayer, weight: -(this.crimeWeight)},
        {hexagons: this.pointsOfInterestLayer, weight: this.pointsOfInterestWeight},
      ];

      var hexagons = this.combineLayers(mapLayers);
      this.renderHexes(map, hexagons);
      //this.renderAreas(map, hexagons);
    },
    redistributeWeights() {
      var mapLayers = [
        {hexagons: this.schoolsLayer, weight: this.schoolWeight},
        {hexagons: this.bartLayer, weight: this.bartWeight},
        {hexagons: this.travelTimeLayer, weight: this.travelWeight},
        // Crime is bad, so we'll subtract it instead of adding
        {hexagons: this.crimeLayer, weight: -(this.crimeWeight)},
        {hexagons: this.pointsOfInterestLayer, weight: this.pointsOfInterestWeight},
      ];

      var hexagons = this.combineLayers(mapLayers);
      this.renderHexes(this.map, hexagons);
      // this.renderAreas(this.map, hexagons);
    },
    onSliderChange(event, type) {
      if (type == 'resolution') {
        this.h3Resolution = Number(event.target.value);
      } else if (type == 'crime') {
        this.crimeWeight = Number(event.target.value);
      } else if (type == 'schools') {
        this.schoolWeight = Number(event.target.value);
      } else if (type == 'bart') {
        this.bartWeight = Number(event.target.value);
      } else if (type == 'travelTime') {
        this.travelTimeWeight = Number(event.target.value);
      } else if (type == 'poi') {
        this.pointsOfInterestWeight = Number(event.target.value);  
      }

      console.log(this.crimeWeight);
      this.redistributeWeights();
    },
    createLayers() {
      this.crimeLayer = this.createCrimeLayer();
      this.schoolsLayer = this.createSchoolsLayer();
      this.bartLayer = this.createBartLayer();
      this.travelTimeLayer = this.createTravelTimeLayer();
      this.pointsOfInterestLayer = this.createPointsOfInterestLayer();
    },
    combineLayers(mapLayers) {
      const combined = {};
      mapLayers.forEach(({hexagons, weight}) => {
        Object.keys(hexagons).forEach(hex => {
          combined[hex] = (combined[hex] || 0) + hexagons[hex] * weight;
        });
      });
      return this.normalizeLayer(combined);  
    },
    createCrimeLayer() {
      const layer = {};
      this.crime90days.forEach(({lat, lng}) => {
        const h3Index = this.$geoToH3(lat, lng, this.h3Resolution);
        layer[h3Index] = (layer[h3Index] || 0) + 1;
      });
      return this.normalizeLayer(layer);      
    },
    createSchoolsLayer() {
        const layer = {};
        this.publicSchools.forEach(({lat, lng}) => {
          const h3Index = this.$geoToH3(lat, lng, this.h3Resolution);
          // Add school hex
          layer[h3Index] = (layer[h3Index] || 0) + 1;
          // add surrounding kRing, with less weight
          this.$hexRing(h3Index, 1).forEach(neighbor => {
            layer[neighbor] = (layer[neighbor] || 0) + 0.5;
          });
      });
      return this.normalizeLayer(layer);
    }, 
    createBartLayer() {
      return this.normalizeLayer(this.bufferPointLinear(this.bartStations, this.kmToRadius(1)));
    },
    createTravelTimeLayer() {
      const layer = {};
      this.travelTimes.features.forEach(feature => {
        const hexagons = this.$geojson2h3.featureToH3Set(feature, this.h3Resolution);
        hexagons.forEach(h3Index => {
          // Lower is better, so take the inverse
          layer[h3Index] = (layer[h3Index] || 0) + 1 / feature.properties.travelTime;
        })
      });
      return this.normalizeLayer(layer, true);
    },
    createPointsOfInterestLayer() {
        const layer = {};
        this.pointsOfInterest.filter(poi => (poi.type === 'Cafes' || poi.type === 'Places to Eat' || poi.type === 'Restaurant')).forEach(({lat, lng}) => {
        const h3Index = this.$geoToH3(lat, lng, this.h3Resolution);
          layer[h3Index] = (layer[h3Index] || 0) + 1;
        });
        return this.normalizeLayer(layer);
    },
    async seedData() {
      this.crime90days = await this.seedCrimeData();
      this.publicSchools = await this.seedPublicSchoolLocations();
      this.bartStations = await this.seedBartStations();
      this.travelTimes = await this.seedTravelTimes();
      this.pointsOfInterest = await this.seedPointsOfInterest();
    },
    seedTravelTimes() {
      return json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/657a9f3b64fedc718c3882cd4adc645ac0b4cfc5/oakland_travel_times.json');
    },
    seedBartStations() {
      return json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/8f1a3e30113472404feebc288e83688a6d5cf33d/bart.json');
    },
    seedCrimeData() {
      return json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/f5ef0fed8972d04a27727ebb50e065265e2d853f/oakland_crime_90days.json');
    },
    seedPublicSchoolLocations() {
      return json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/babf7357f15c99a1b2a507a33d332a4a87b7df8d/public_schools.json');
    },
    seedPointsOfInterest() {
      return json('https://gist.githubusercontent.com/nrabinowitz/d3a5ca3e3e40727595dd137b65058c76/raw/ded89c2acef426fe3ee59b05096ed1baecf02090/oakland-poi.json');
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
    renderAreas(map, hexagons) {
      // Transform the current hexagon map into a GeoJSON object
      const geojson = this.$geojson2h3.h3SetToFeature(
        Object.keys(hexagons).filter(hex => hexagons[hex] > this.config.areaThreshold)
      );
  
      const sourceId = 'h3-hex-areas';
      const layerId = `${sourceId}-layer`;
      let source = map.getSource(sourceId);
  
      // Add the source and layer if we haven't created them yet
      if (!source) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });
        map.addLayer({
          id: layerId,
          source: sourceId,
          type: 'line',
          interactive: false,
          paint: {
            'line-width': 3,
            'line-color': this.config.colorScale[2],
          }
        });
        source = map.getSource(sourceId);
      }

      // Update the geojson data
      source.setData(geojson);
    },
    countPoints(geojson) {
      const layer = {};
      geojson.features.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        const h3Index = this.$geoToH3(lat, lng, this.h3Resolution);
        layer[h3Index] = (layer[h3Index] || 0) + 1;
      });
      return this.normalizeLayer(layer, true);
    },
    bufferPoints(geojson, radius) {
      const layer = {};
      geojson.features.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        const stationIndex = this.$geoToH3(lat, lng, this.h3Resolution);
        const ring = this.$kRing(stationIndex, radius);
        ring.forEach(h3Index => {
          layer[h3Index] = (layer[h3Index] || 0) + 1;
        });
      });
      return this.normalizeLayer(layer, true);
    },
    bufferPointLinear(geojson, radius) {
      const layer = {};
      geojson.features.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        const stationIndex = this.$geoToH3(lat, lng, this.h3Resolution);
        // add surrounding multiple surrounding rings, with less weight in each
        const rings = this.$kRingDistances(stationIndex, radius);
        const step = 1 / (radius + 1);
        rings.forEach((ring, distance) => {
          ring.forEach(h3Index => {
            layer[h3Index] = (layer[h3Index] || 0) + 1 - distance * step;
          })
        });
      });
      return this.normalizeLayer(layer);
    },
    normalizeLayer(layer, baseAtZero = false) {
        const hexagons = Object.keys(layer);
        // Pass one, get max
        const max = hexagons.reduce((max, hex) => Math.max(max, layer[hex]), -Infinity);
        const min = baseAtZero ? hexagons.reduce((min, hex) => Math.min(min, layer[hex]), Infinity) : 0;
        // Pass two, normalize
        hexagons.forEach(hex => {
          layer[hex] = (layer[hex] - min) / (max - min); 
        });
        return layer;
    },
    kmToRadius(km) {
      return Math.floor(km / this.$edgeLength(this.h3Resolution, this.$UNITS.km));
    }
  }
};
</script>