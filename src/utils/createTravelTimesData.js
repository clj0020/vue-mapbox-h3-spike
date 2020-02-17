const Papa = require('papaparse');
import { json } from "d3-fetch";

export function createTravelTimeData() {
    Papa.parse('./atlanta_travel_times.csv', {   
            download: true,         
            header: true,
            complete: results => {
                var travelTimes = results.data;
                json("./travelTimes.json").then((censusGeoJson) => {         
                    var geojson = {
                        "type": "FeatureCollection",
                        "features": []
                    }         
                    censusGeoJson.features.forEach(function(feature, index) {                        
                        var nameToMatch = feature.properties.DISPLAY_NAME;                        
                        Object.keys(travelTimes).map(function (id) {                    
                            var censusTractName = travelTimes[id].destination_display_name;                            
                            if (nameToMatch == censusTractName) {  
                                console.log("MAtch");
                                censusGeoJson.features[index].properties["travelTime"] = travelTimes[id].mean_travel_time;   
                                geojson.features.push(censusGeoJson.features[index]);
                            }        
                        });
                    });
                    console.log(JSON.stringify(geojson));
                });            
            }
          });
}