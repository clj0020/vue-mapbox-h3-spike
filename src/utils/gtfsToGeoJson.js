const Papa = require('papaparse');


export function stops(gtfs) {
    var results = Papa.parse(gtfs, { header: true });
    var stops = results.data;
    return {
        type: 'FeatureCollection',
        features: Object.keys(stops).map(function (id) {
            return {
                type: 'Feature',
                id: stops[id].stop_id,
                properties: {
                    stop_id: stops[id].stop_id,
                    stop_name: stops[id].stop_name
                },
                geometry: {
                    type: 'Point',
                    coordinates: [
                        parseFloat(stops[id].stop_lon),
                        parseFloat(stops[id].stop_lat)
                    ]
                }
            };
        })
    };
}