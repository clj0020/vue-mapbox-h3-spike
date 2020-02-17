<template>
<b-container fluid id="map-container">
  <b-row id="map-row">
    <b-col cols="12" md="10" id="map-col">
      <MglMap
        :accessToken="accessToken"
        :mapStyle.sync="mapStyle"
        :center="[config.lng, config.lat]"
        :zoom="config.zoom"
        @load="onMapLoaded">
      </MglMap>
    </b-col>
    <b-col cols="12" md="2" id="sliders">
      <p>Crime Weight: {{crimeWeight}}</p>
      <input        
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-bind:value="crimeWeight"
          v-on:input="onSliderChange($event, 'crime')"/>
      
      <p>Dog Park Weight: {{dogParkWeight}}</p>
      <input        
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-bind:value="dogParkWeight"
          v-on:input="onSliderChange($event, 'dogParks')"/>

      <p>Marta Weight: {{martaWeight}}</p>
      <input        
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-bind:value="martaWeight"
          v-on:input="onSliderChange($event, 'marta')"/>

      <p>Travel Time Weight: {{travelWeight}}</p>
      <input        
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-bind:value="travelWeight"
          v-on:input="onSliderChange($event, 'travelTime')"/>
      
      <!-- <p>Points of Interest Weight: {{pointsOfInterestWeight}}</p>
      <input        
          type="range"
          min="0"
          max="1"
          step="0.01"
          v-bind:value="pointsOfInterestWeight"
          v-on:input="onSliderChange($event, 'poi')"/> -->
    </b-col>
  </b-row>
</b-container>
</template>

<style>

  #map-container {
    height: 100%;
    min-height: 100vh;
  }

  #map-row {
    height: 100%;
  }

  .selected {
    background-color: rgb(63, 63, 63);
    color: white;
  }

</style>

<script>
import Mapbox from "mapbox-gl";
import { json, text } from "d3-fetch";
import { stops } from "@/utils/gtfsToGeoJson";
// import { createTravelTimeData } from "@/utils/createTravelTimesData";
const Papa = require('papaparse');

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
        lng: -84.387595,
        lat: 33.746605,
        zoom: 11,
        fillOpacity: 0.9,
        colorScale: ['#ffffD9', '#50BAC3', '#1A468A'],
        areaThreshold: 0.75
      },
      h3Resolution: 8,
      crimeLayer: null,
      crime90days: null,
      crimeWeight: 1,
      dogParksLayer: null,
      dogParks: null,
      dogParkWeight: 1,
      // pointsOfInterestLayer: null,
      // pointsOfInterest: null,
      // pointsOfInterestWeight: 1,
      travelTimeLayer: null,
      travelTimes: null,
      travelWeight: 1,
      martaLayer: null,
      martaStations: null,
      martaWeight: 1
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

      var seeded = await this.seedData();
      console.log(seeded);
      this.displayData(this.map);
    },
    displayData(map) {
      console.log("Displaying data.");      
      this.createLayers();

      var mapLayers = [
        // Crime is bad, so we'll subtract it instead of adding
        {name: "crime", hexagons: this.crimeLayer, weight: -(this.crimeWeight)},
        {name: "dogParks", hexagons: this.dogParksLayer, weight: this.dogParkWeight},
        {name: "marta", hexagons: this.martaLayer, weight: this.martaWeight},
        {name: "traveltime", hexagons: this.travelTimeLayer, weight: this.travelWeight},
        // {name: "poi", hexagons: this.pointsOfInterestLayer, weight: this.pointsOfInterestWeight}
      ];
      
      var hexagons = this.combineLayers(mapLayers);
      this.renderHexes(map, hexagons);
    },
    onSliderChange(event, type) {
      if (type == 'crime') {
        this.crimeWeight = Number(event.target.value);
      } else if (type == 'dogParks') {
        this.dogParkWeight = Number(event.target.value);
      } else if (type == 'marta') {
        this.martaWeight = Number(event.target.value);
      } else if (type == 'travelTime') {
        this.travelWeight = Number(event.target.value);
      } 
      // else if (type == 'poi') {
      //   this.pointsOfInterestWeight = Number(event.target.value);  
      // }      
      console.log("Slider change", type);

      this.redistributeWeights();
    },
    redistributeWeights() {
      console.log("Redistributing weights");

      var mapLayers = [
        // Crime is bad, so we'll subtract it instead of adding
        {name: "crime", hexagons: this.crimeLayer, weight: -(this.crimeWeight)},
        {name: "dogParks", hexagons: this.dogParksLayer, weight: this.dogParkWeight},
        {name: "marta", hexagons: this.martaLayer, weight: this.martaWeight},
        {name: "traveltime", hexagons: this.travelTimeLayer, weight: this.travelWeight},
        // {name: "poi", hexagons: this.pointsOfInterestLayer, weight: this.pointsOfInterestWeight}
      ];

      console.log("Map layers", mapLayers);

      var hexagons = this.combineLayers(mapLayers);
      this.renderHexes(this.map, hexagons);
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
    createLayers() {
      console.log("Creating layers");
      this.crimeLayer = this.createCrimeLayer();
      this.dogParksLayer = this.createDogParksLayer();
      this.martaLayer = this.createMartaLayer();
      this.travelTimeLayer = this.createTravelTimeLayer();
      // this.pointsOfInterestLayer = this.createPointsOfInterestLayer();
    },
    createCrimeLayer() {
      console.log("Creating crime layer", this.crime90days);
      const layer = {};
      this.crime90days.forEach(({lat, lng}) => {
        const h3Index = this.$geoToH3(lat, lng, Number(this.h3Resolution));
        layer[h3Index] = (layer[h3Index] || 0) + 1;
      });
      return this.normalizeLayer(layer);      
    },
    createDogParksLayer() {
        console.log("Creating dog parks layer", this.dogParks);
        // const layer = {};
        // this.dogParks.forEach(({lat, lng}) => {
        //   const h3Index = this.$geoToH3(lat, lng, Number(this.h3Resolution));
        //   // Add school hex
        //   layer[h3Index] = (layer[h3Index] || 0) + 1;
        //   // add surrounding kRing, with less weight
        //   this.$hexRing(h3Index, 1).forEach(neighbor => {
        //     layer[neighbor] = (layer[neighbor] || 0) + 0.5;
        //   });
        // });
        // return this.normalizeLayer(layer);
        return this.normalizeLayer(this.bufferPointLinear(this.martaStations, this.kmToRadius(1)));
    }, 
    createMartaLayer() {
      console.log("Creating marta layer", this.martaStations);
      return this.normalizeLayer(this.bufferPointLinear(this.martaStations, this.kmToRadius(1)));
    },
    createTravelTimeLayer() {
      console.log("Creating travel time layer", this.travelTimes);
      const layer = {};
      this.travelTimes.features.forEach(feature => {
        const hexagons = this.$geojson2h3.featureToH3Set(feature, Number(this.h3Resolution));
        hexagons.forEach(h3Index => {
          // Lower is better, so take the inverse
          layer[h3Index] = (layer[h3Index] || 0) + 1 / feature.properties.travelTime;
        })
      });
      return this.normalizeLayer(layer, true);
    },
    createPointsOfInterestLayer() {
        console.log("Creating poi layer", this.pointsOfInterest);
        const layer = {};
        this.pointsOfInterest.filter(poi => (poi.type === 'Cafes' || poi.type === 'Places to Eat' || poi.type === 'Restaurant')).forEach(({lat, lng}) => {
        const h3Index = this.$geoToH3(lat, lng, Number(this.h3Resolution));
          layer[h3Index] = (layer[h3Index] || 0) + 1;
        });
        return this.normalizeLayer(layer);
    },
    async seedData() {
      console.log("Seeding data");
      this.crime90days = await this.seedCrimeData();
      console.log("Crimes", this.crime90days);
      this.dogParks = await this.seedDogParkLocations();
      console.log("Dog Parks", this.dogParks);
      this.martaStations = await this.seedMartaStations();
      console.log("Marta stations", this.martaStations);
      this.travelTimes = await this.seedTravelTimes();
      console.log("Travel Times", this.travelTimes);
      // this.pointsOfInterest = await this.seedPointsOfInterest();
      // console.log("POI", this.pointsOfInterest);
      return "Seeded";
    },
    seedTravelTimes() {
      return json('./travelTimes.json');
    },
    seedMartaStations() {
      return text('./martaStops.txt').then((text) => {
        return stops(text);
      });
    },
    seedCrimeData() {
      console.log("Seeding crime data");
      return new Promise(resolve => {
          Papa.parse('https://query.data.world/s/3lnfl7oqpk3fspbleodbcu4wt4hwq5', {
            download: true,
            header: true,
            complete: results => {
              var crimes = results.data;
              var value = Object.keys(crimes).map(function (id) {
                    return {
                      "lat": crimes[id].lat,
                      "lng": crimes[id].long,
                      "type": crimes[id].crime
                    };
                });
              resolve(value);
            }
          });
      });
    },
    seedDogParkLocations() {
      return json('./dogParks.json');
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
        const h3Index = this.$geoToH3(lat, lng, Number(this.h3Resolution));
        layer[h3Index] = (layer[h3Index] || 0) + 1;
      });
      return this.normalizeLayer(layer, true);
    },
    bufferPoints(geojson, radius) {
      const layer = {};
      geojson.features.forEach(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        const stationIndex = this.$geoToH3(lat, lng, Number(this.h3Resolution));
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
        const stationIndex = this.$geoToH3(lat, lng, Number(this.h3Resolution));
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
      return Math.floor(km / this.$edgeLength(Number(this.h3Resolution), this.$UNITS.km));
    }
  }
};
</script>