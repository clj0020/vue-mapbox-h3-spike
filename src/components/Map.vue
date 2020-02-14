<template>
  <MglMap 
    ref="map"
    :accessToken="accessToken"
    :mapStyle.sync="mapStyle"
    @load="onMapLoaded">
  </MglMap>
</template>

<script>
import Mapbox from "mapbox-gl";

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
      mapStyle: 'mapbox://styles/mapbox/streets-v11' // your map style
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

      const config = ({
        lng: -84.373684,
        lat: 33.820379,
        zoom: 11.5,
        fillOpacity: 0.6,
        colorScale: ['#ffffcc', '#78c679', '#006837']
      })

      const asyncActions = event.component.actions;
      
      const newParams = await asyncActions.flyTo({
        center: [-84.373684, 33.820379],
        zoom: 11.5,
        speed: 1
      });
      console.log(newParams);

      const centerHex = this.$geoToH3(33.819310, -84.381538, 8);
      const kRing = this.$kRing(centerHex, 3);

      const hexagons = kRing.reduce((res, hexagon) => ({...res, [hexagon]: Math.random()}), {});
      // Transform the current hexagon map into a GeoJSON object
      const geojson = this.$geojson2h3.h3SetToFeatureCollection(
        Object.keys(hexagons),
        hex => ({value: hexagons[hex]})
      );

      const sourceId = 'h3-hexes';
      const layerId = `${sourceId}-layer`;

      let source = this.map.getSource(sourceId);

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

      
        this.map.addSource(sourceId, {
          type: 'geojson',
          data: geojson
        });
        this.map.addLayer(geoJsonLayer);

        source = this.map.getSource(sourceId);
      }
    
      source.setData(geojson);

      // Update the layer paint properties, using the current config values
      this.map.setPaintProperty(layerId, 'fill-color', {
        property: 'value',
        stops: [
          [0, config.colorScale[0]],
          [0.5, config.colorScale[1]],
          [1, config.colorScale[2]]
        ]
      });
  
      this.map.setPaintProperty(layerId, 'fill-opacity', config.fillOpacity);
    }
  }
};
</script>