var express = require('express');
var router = express.Router();
var app = express();

// Defining constants
const { Client } = require('pg');


//  Key/value pairs for
//      (alias for spatial data layer) : "(name of layer in database)"
var layersKV = {

    NPRI_PM2_5:   "npri_21_pm2_5",
    NPRI_NH3:     "npri_21_nh3",
    NPRI_NOx:     "npri_21_nox",
    NPRI_CO:      "npri_21_co",
    NPRI_SO2:     "npri_21_so2",
    NPRI_VOCs:    "npri_21_vocs",

    province:     "simp_join_provinces_v2",
    c_div:        "simp_join_cendivisions_v2",
    c_subdiv:     "simp_join_censubdivisions_v2",
    agg_diss:     "simp_join_agg_v2",

    //  This one is really, really big - doesn't want to load like the other files
    diss_area:    "simp_join_dissareas"
}


// Client object for connection to pg server
const dbClient = new Client({

    user: "postgres",   // username (for the server; used on pgAdmin)
    host: "localhost",
    database: "testing_db",    // database within pg server
    password: "admin",   // password (for the server; used on pgAdmin)
    port: "5432"
});


// need to set up so website aborts if connection fails
const connectDB = async () => {

    await dbClient.connect()
        .then(() => console.log('connected'))
        .catch((err) => console.error('connection error', err.stack));

}


//  Function to asynchronously query the server's database 
//  PARAM(S): query = string of an SQL query to run on the server's database
const queryDB = async (query) => {

    //  The dbClient.query(query) function below is a fetch / promise object
    //      As such, we can't return out of this function in the promise object (it needs to be resolved / holds up the server until the database gives an answer)
    //      This variable holds onto the results of the query and is returned once the fetch request is completed
    var tempHolder;

    await dbClient.query(query)
        .then((result) => tempHolder = result)
        .catch((error) => console.log("queryDB function ERROR: " + error.stack));
  
    return tempHolder;
}


//  Establish database connection when server starts up
//  https://expressjs.com/en/guide/routing.html
connectDB();


//  GET home page
//  This was a default function from the node/espress template, but I'm not quite sure what it does
//      Removing it makes the website break? :(
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });

});


//  This function generates / returns a simple GeoJSON of a spatial dataset from the server's database
//  PARAM(S):   :layerName = HTML URL parameter indicating the desired spatial data layer, one of (layersKV):
//                                             "NPRI_PM2_5", "NPRI_NH3", "NPRI_NOx", "NPRI_CO", "NPRI_SO2", "NPRI_VOCs",
//                                                    "province", "c_div", "c_subdiv", "agg_diss", "diss_area" 
router.get('/get_geojson/:layerName', function(req, res, next) {

    //  queries database to return a geoJSON feature collection (geometry, attribute data) of the requested geoJSON file from the db
    queryDB("SELECT json_build_object(\'type\', \'FeatureCollection\', \'features\', json_agg(ST_AsGeoJSON(t.*)::json)) FROM " + layersKV[req.params.layerName] +" AS t")

        //  returns the successful query results to the client
        .then((result) => {res.send(result.rows[0].json_build_object)})

        //  logs an error in the case of a failed query
        .catch((error) => console.log("index.js, /getProvinces query ERROR: " + error.stack));
});


//  This function generates / returns a polygon GeoJSON of a boundary dataset from the server's database
//  PARAM(S):   :layerName = HTML URL parameter indicating the desired boundary data layer, one of:
//                                                   "province", "c_div", "c_subdiv", "agg_diss", "diss_area" 
router.get('/get_geojson_boundaryPolygons/:layerName', function(req, res, next) {

    var layer = layersKV[req.params.layerName];

    //  The query will return a GeoJSON feature collection
    queryDB("SELECT json_build_object(\'type\', \'FeatureCollection\', \'features\', json_agg(ST_AsGeoJSON(t.*)::json)) FROM " + 
                "(WITH mytable AS " + 

                        //  Select all rows (in the case of current data: geometry, attributes)
                        "(SELECT " + layer + ".*, " + 

                        //  Creates an attribute to reflect the polygon / row count
                        "(SELECT COUNT(*) FROM " + layer + ") AS record_count, " +
                        
                        //  Create rank (against other selected records) of population amount
                        "ROW_NUMBER() OVER (ORDER BY " + layer + ".pop DESC) AS pop_rank, " +
                        
                        //  Creates an attribute to reflect Canada's national population
                        "(SELECT SUM(pop) FROM " + layer + ") AS canada_pop, " + 

                        //  Create rank (against other selected records) of low-income demographic amount
                        "ROW_NUMBER() OVER (ORDER BY " + layer + ".lowinc DESC) AS lowinc_rank, " + 

                        //  Create rank (against other selected records) of indigenous demographic amount
                        "ROW_NUMBER() OVER (ORDER BY " + layer + ".ind DESC) AS ind_rank, " + 

                        //  Create rank (against other selected records) of visible minority demographic amount
                        "ROW_NUMBER() OVER (ORDER BY " + layer + ".vm DESC) AS vm_rank " + 

                    //  The attribute values created through the query are associated with polygons through the "id" field
                    //  i.e. we select a bunch of records, and then associate attributes based on their ids
                    "FROM " + layer + " GROUP BY " + layer + ".id) " + 
                "SELECT * FROM mytable) " + 
            "AS t")

        // The "result" object needs to be parsed for the data we want
        .then((result) => {res.send(result.rows[0].json_build_object)})

        // logs an error in the case of a failed query
        .catch((error) => console.log("index.js, /getProvinces query ERROR: " + error.stack));
});


//  This function generates / returns a point GeoJSON of a pollutant dataset from the server's database
//  PARAM(S):   :layerName = HTML URL parameter indicating the desired pollutant data layer, one of:
//                                              "NPRI_PM2_5", "NPRI_NH3", "NPRI_NOx", "NPRI_CO", "NPRI_SO2", "NPRI_VOCs"
router.get('/get_geojson_pollutantPoints/:layerName', function(req, res, next) {

    //  The query will return a GeoJSON feature collection
    queryDB("SELECT json_build_object(\'type\', \'FeatureCollection\', \'features\', json_agg(ST_AsGeoJSON(t.*)::json)) FROM " + 

                    //  Select all rows (in the case of current data: facility locations, emission type, emission statistics)
                    "(SELECT " + layersKV[req.params.layerName] +".*, " +
                    
                    //  Creates an attribute to reflect the maximum emission value for the desired pollutant 
                    "(SELECT MAX(grand_tota) FROM " + layersKV[req.params.layerName] + ") AS emissions_max, " + 

                    //  Creates an attribute to reflect the minimum emission value for the desired pollutant 
                    "(SELECT MIN(grand_tota) FROM " + layersKV[req.params.layerName] + ") AS emissions_min, " + 

                    //  Creates an attribute to reflect the point / row count
                    "(SELECT COUNT(*) FROM " + layersKV[req.params.layerName] + ") AS record_count, " + 

                    //  Create rank (against other selected records) of emission totals
                    "ROW_NUMBER() OVER (ORDER BY grand_tota desc) AS emissions_rank " + 
                "FROM " + layersKV[req.params.layerName] + " GROUP BY " + layersKV[req.params.layerName] + ".id) " + 
            "AS t")

        .then((result) => {res.send(result.rows[0].json_build_object)})
        .catch((error) => console.log("index.js, /getProvinces query ERROR: " + error.stack));
});


//  This function returns a polygon GeoJSON of a boundary dataset from the server's database
//      However, this function also performs geoprocessing on the input point / polygon layers 
//      The purpose is to aggregate pollutant facility points (and their related attribute data) to a polygon boundary layer
//  PARAM(S):   :pointLayer = HTML URL parameter indicating the input pollutant data layer, one of:
//                                              "NPRI_PM2_5", "NPRI_NH3", "NPRI_NOx", "NPRI_CO", "NPRI_SO2", "NPRI_VOCs"
//
//              :boundaryLayer = HTML URL parameter indicating the input boundary layer, one of:
//                                                   "province", "c_div", "c_subdiv", "agg_diss", "diss_area" 
router.get('/agg_point-to-boundary-overlay/:pointLayer-:boundaryLayer', function(req, res, next) {

    var pointLayer = layersKV[req.params.pointLayer];
    var boundLayer = layersKV[req.params.boundaryLayer];
 
    //  The query will return a GeoJSON feature collection
    queryDB("SELECT json_build_object('type', 'FeatureCollection', 'features', json_agg(ST_AsGeoJSON(t.*)::json)) FROM " + 
                "(WITH mytable AS " + 

                    //  The order of the SQL query is a bit confusing
                    //      Important to note that these selections (i.e. before the LEFT JOIN below) occur AFTER the join
                    //      i.e. the execution of the statement is JOIN --> first selections --> second selections

                    //  Select all boundary polygons
                    "(SELECT " + boundLayer + ".*, " + 

                    //  Create rank (against other selected records) of population amount  
                    "ROW_NUMBER() OVER (ORDER BY " + boundLayer + ".pop DESC) AS pop_rank, " + 

                    //  Create rank (against other selected records) of indigenous demographic amount
                    "ROW_NUMBER() OVER (ORDER BY " + boundLayer + ".ind DESC) AS ind_rank, " +
                    
                    //  Create rank (against other selected records) of low-income demographic amount
                    "ROW_NUMBER() OVER (ORDER BY " + boundLayer + ".lowinc DESC) AS lowinc_rank, " +
                    
                    //  Create rank (against other selected records) of visible minority demographic amount
                    "ROW_NUMBER() OVER (ORDER BY " + boundLayer + ".vm DESC) AS vm_rank, " +
                    
                    //  Creates an attribute to reflect the amount of points in each polygon
                    "count(" + pointLayer + ".geom) AS point_count, " +
                    
                    //  Creates an attribute of the sum of all points in the input pollutant point dataset
                    "(SELECT COUNT(*) FROM " + pointLayer + ") AS total_point_count, " + 

                    //  Creates an attribute to reflect the amount of polygons in the input dataset
                    "(SELECT COUNT(*) FROM " + boundLayer + ") AS record_count, " +
                    
                    //  Creates an attribute of the median emission value among the input point dataset
                    "PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY " + layersKV[req.params.pointLayer] + ".grand_tota) AS median_emissions, " +
                    
                    //  Creates an attribute of the sum of all emissions in the input point dataset
                    "sum(" + pointLayer + ".grand_tota) AS total_emissions " + 
                
                //  This is where the intersection between the point any polygon layers occurs
                //      A LEFT JOIN returns:
                //          ALL records from table 1 (polygon layer)
                //          MATCHING (based on a condition) records from table 2 (point layer)
                //
                //  Here, the condition of the join is based on the ST_Contains function from the PostGIS extension 
                //      This function returns a boolean T/F based on the spatial relationship between table 1/2
                //          In this case, if an input point falls inside an input polygon, that points attributes are joined to the polygon
                //    
                //      https://postgis.net/docs/ST_Contains.html 
                "FROM " + boundLayer + " LEFT JOIN " + pointLayer + " ON ST_Contains(" + boundLayer + ".geom, " + pointLayer + ".geom) " +
                
                //  The LEFT JOIN results in a one to many relationship between polygons and points
                "GROUP BY " + boundLayer + ".id) " +
                
                    //  Select all records from the now-joined table
                    "SELECT *, " + 

                    //  Creates an attribute to reflect the number of points within a given polygon
                    "(SELECT COUNT(*) FROM mytable WHERE mytable.point_count > 0) AS polys_with_points, " + 

                    //  Create rank (against other selected records) of total emissions of contained pollutant points
                    //      Important to note total_emissions was one of the variables generated earlier in the query
                    "ROW_NUMBER() OVER (ORDER BY total_emissions DESC) AS total_emissions_rank, " + 

                    //  Create rank (against other selected records) of median emissions of contained pollutant points
                    "ROW_NUMBER() OVER (ORDER BY median_emissions DESC) AS median_emissions_rank, " + 

                    //  Create rank (against other selected records) of the number of contained pollutant points
                    "ROW_NUMBER() OVER (ORDER BY point_count DESC) AS point_count_rank " + 

                //  Only select polygons that contain at least one polluting facility point
                "FROM mytable WHERE mytable.point_count > 0) " + 
            "AS t WHERE t.point_count > 0")

        .then((result) => res.send(result.rows[0].json_build_object))
        .catch((error) => console.log("index.js query ERROR: " + error.stack));
});


//  This function returns demographic information at ALL boundary levels for a given click location (lat/lng coords)
//      There are no parameters for this function; it instead employs a post request containing a JSON of the lat/lng generated by leaflet
router.post("/get_point-to-boundary-click/", (req, res) => {

    //  The query will return a GeoJSON feature collection
    queryDB("SELECT json_build_object('type', 'FeatureCollection', 'features', json_agg(ST_AsGeoJSON(t.*)::json)) FROM " + 

                //  ST_GeomFromGeoJSON is a PostGIS function that converts a GeoJSON into a SQL query object / variable
                //      On the client side, I make a simple GeoJSON object from the coordinates of the map click
                "(SELECT ST_GeomFromGeoJSON('" + JSON.stringify(req.body) + "') AS geom) AS pointgeom, " +
                
                //  Select all demographic information from the boundary polygons
                "(SELECT geom, dguid, landarea, pop, ind, lowinc, vm FROM simp_join_provinces_v2 " + 
                    "UNION SELECT geom, dguid, landarea, pop, ind, lowinc, vm FROM simp_join_cendivisions_v2 " + 
                    "UNION SELECT geom, dguid, landarea, pop, ind, lowinc, vm FROM simp_join_censubdivisions_v2 " + 
                    "UNION SELECT geom, dguid, landarea, pop, ind, lowinc, vm FROM simp_join_agg_v2) " +
                    
            //  Only select polygons that contain the lat/lng of the click-point
            "AS t WHERE ST_Contains(t.geom, pointgeom.geom)")
            
        .then((result) => {res.send(result.rows[0].json_build_object)})
        .catch((error) => console.log("index.js query ERROR: " + error.stack));
});


module.exports = router;
