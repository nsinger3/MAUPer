//	Extension of leaflet "map" class for app-specific variables, functions
//		https://leafletjs.com/examples/extending/extending-1-classes.html
var extendedMap = L.Map.include({

	//	Internal class variable (string) for the current boundary abstraction level ("base" layer in leaflet layer control) 
	____boundaryLevel: "province",

	//	Function to set the map's current boundary abstraction level
	//	PARAM(S): newLevel = string, one of
	//				"province" | "c_div" | "c_subdiv" | "agg_diss"
	setBoundaryLevel: function(newLevel) {this.____boundaryLevel = newLevel},

	//	Function to return a string of the map's current boundary abstraction level
	getBoundaryLevel: function() {return this.____boundaryLevel},


		// ----------------

	
	//	Internal class variable (leaflet layer group) for the map's currently displayed point layer ("selected tab")
	____currentPointLayer: null,

	//	Function to set the map's currently displayed point layer
	//	PARAM(S): newLayer = leaflet layer group, one of current DB options:
	//						"NPRI_PM2_5" | "NPRI_NH3" | "NPRI_NOx" | "NPRI_CO" | "NPRI_SO2" | "NPRI_VOCs"
	setCurrentPointLayer: function(newLayer) {this.____currentPointLayer = newLayer},

	//	Function to return the currently displayed point layer
	getCurrentPointLayer: function() {return this.____currentPointLayer},

	//	Function to return a string of the map's currently displayed point layer
	getCurrentPointLayerName: function() {
		
		if (this.____currentPointLayer === null) {

			return "none";

		} else {

			// the createPointLayerGroup function sets the first part of each layer in the group to *current layer alias* + "-" 
			return this.____currentPointLayer._leaflet_id.substring(0, this.____currentPointLayer._leaflet_id.indexOf("-"))
		}
	},

	//	Function to return the (min, max) total emission values for the map's currently displayed point layer
	getCurrentPointLayer_Emissions_minMax: function() {

		if (this.____currentPointLayer === null) {

			return {min: 0, max: 0};
		}

		else {

			var pointLayer = map.getCurrentPointLayer()._layers[map.getCurrentPointLayerName() + "-pointlayer"];

			//	emissions_min & emissions_max are created through backend database queries 
			return {min: pointLayer._layers[Object.keys(pointLayer._layers)[0]].feature.properties.emissions_min, max: pointLayer._layers[Object.keys(pointLayer._layers)[0]].feature.properties.emissions_max};
		}
	},


		// ----------------

	
	//	Internal class variable (string) for the map's currently displayed demographic data 
	____currentDemographics: "lowinc",
	
	//	Function to set the map's currently displayed demographic data
	//	PARAM(S): newDemoString = string, one of
	//							"lowinc" | "ind" | "vm"
	setCurrentDemographics: function(newDemoString) {this.____currentDemographics = newDemoString},

	//	Function to return a string of the map's currently displayed demographic data
	getCurrentDemographics: function() {return this.____currentDemographics},


		// ----------------


	//	Internal class variable (array) for storing point layers
	____pointLayerList: [],

	//	Function to return the list of stored point layers 
	getPointLayerList: function() {return this.____pointLayerList},


		// ----------------


	//	Internal class variable for the map's currently displayed "highlight" polygon
	____highlightPolygon: null,

	//	Function to set the map's currently displayed "highlight" polygon
	//	PARAM(S): newLayer = leaflet layer
	setHighlightPolygon: function(newLayer) {this.____highlightPolygon = newLayer},

	//	Function to return the map's currently displayed "highlight" polygon
	getHighlightPolygon: function() {return this.____highlightPolygon},



		// ----------------


	//	Internal class variable for the chart.js instance on the website
	____chartInstance: null,

	setChartInstance: function(newInstance) {this.____chartInstance = newInstance},

	getChartInstance: function() {return this.____chartInstance}

});

var map = new extendedMap('map', {
		
		//	https://leafletjs.com/reference.html#map
		doubleClickZoom:false,
		minZoom: 3,
		maxZoom: 13,
		zoomControl: false
	})

	// set the coordinates, zoom level of the map
	.setView([58.53959476664049, -97.16308593750001], 4);

//	https://github.com/CartoDB/basemap-styles
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {

	// https://gist.github.com/mgax/7dbe824d56f933239b8ac284d2bfd92c
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
}).addTo(map);

//	Colour ramps [n = 5; hex values] for symbolizing the demographic datasets
//	These variables are referred to at various points in this file & function_def...js
var lowincColourRamp = ['#f0f2e8', '#b7d0cf', '#7aabb3', '#3e8598', '#005f7b'];
var indColourRamp = ['#f0f2e8', '#bfc7d5', '#8d99be', '#5b6ca8', '#2b4093'];
var vmColourRamp = ['#f0f2e8', '#b8cbb6', '#7ea281', '#457a4e', '#0d521b'];

// 	Base red colour [hex value] for the points, boundary outlines
var pointColour = "#ff4f3b";

//	Colours used [n = 4; hex values] for symbolizing the Graduated polluting facility symbols
var pointColours = ['#ff4f3b', '#d13527', '#a41a14', '#760000'];

//	I didn't initially include the national demographic rates in the processed demographic datasets
//	I went back to the raw data and included the values here (as they're only single points of data)
//	https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?Lang=E&DGUIDList=2021A000011124&GENDERList=1,2,3&STATISTICList=1,4&HEADERList=0&SearchText=Canada
var lowincNationalRate = 11.1;
var indNationalRate = 5;
var vmNationalRate = 26.5;

//	"No data" pattern used for polygons where demographic data is not available  
//	https://github.com/teastman/Leaflet.pattern
var ndStripes = new L.StripePattern({

	weight: 5.5,	
	angle: 45,
	color: "#ffffff",
	spaceColor: "#bcbcbc",
	opacity: 1,
	spaceOpacity: 1
});
ndStripes.addTo(map);

//	Creates the bootstrap loading animation (used in the "loadingSpinner" HTML element in index.html)
const loadingModal = new bootstrap.Modal(document.getElementById("loadingSpinner"));

//	Creates / adds a leaflet layer-control for switching between basemaps
var layerControl = L.control.layers(mapBaseMaps = {}, mapOverlayMaps = {}, {collapsed:false, position: 'bottomleft'}).addTo(map);


	// ----------------


var legend = L.control({position: 'bottomright', collapsed:false});

//	When the "legend" control object is added to the map...
legend.onAdd = function() {

	//	Uses leaflet's DOM utility function to create a new div of the class "info"
	this._div = L.DomUtil.create('div', 'info');

	//	Stops clicks from affecting the map underneath this control
	L.DomEvent.disableClickPropagation(this._div);

	this._div.appendChild(buildLegend());
	return this._div;
}

//	When .update() is called on the "legend" control object...
legend.update = function() {

	//	Clears old content from the legend
	this._div.innerHTML = "";

	//	Insert new legend using the buildLegend() function
	this._div.appendChild(buildLegend());

	return this._div;
}

legend.addTo(map);


	// ----------------


var chartControl = L.control({position:'topright'});

//	When the "chartControl" control object is added to the map...
//	PARAM(S): map = leaflet map object
chartControl.onAdd = function (map) {

	var canvas = document.createElement('canvas');

	//	Creates a new chart.js chart instance using the ^^^ canvas element
	//	https://www.chartjs.org/docs/latest/charts/line.html#dataset-properties
	var myChart = new Chart(canvas, {

		type: 'scatter',

		//	Data is initally left blank; it gets populated when a dataset is selected by the user
		data: {},
		options: {

			//	https://www.chartjs.org/docs/latest/configuration/interactions.html#interactions
			interaction: {

				intersect: true
			},

			//	https://www.chartjs.org/docs/latest/configuration/animations.html#disabling-animation
			animation: false,
			scales: {

				//	Demographic data
				x: {

					type: 'linear',
					position: 'bottom',
					min: 0,
					max: 100
				},

				//	Pollutant data
				y: {

					type: 'linear',
					position: 'left',
					min: 0
				},
			},

			plugins: {

				// Currently disabled; NEED TO ADD chart point / map interactions
				tooltip: {

					events: [/* 'click', 'mouseout' */]
				},

				legend: {

					display: false
				}
			}
		}
	})

	//	The instantiated chart instance is held by the map object, but is not added to the map until a pollutant dataset is selected
	map.setChartInstance(myChart);

	// ----------------

	//	Upon website instantiation, no pollutant data is loaded
	//	As such, a message is displayed instead of the chart object until one is selected
	this._div = L.DomUtil.create('div', 'info');
	L.DomEvent.disableClickPropagation(this._div);
	
	var div = document.createElement('div');

	//	This element defines the dimensions of the chart control area
	//	I found that setting the params of this div and then just emptying / refilling it later worked
	div.style.width = "500px";
	div.style.height = "250px";

	var textBox = document.createElement('div');
	textBox.style.display = "flex";
	textBox.style.height = "250px";
	textBox.style.lineHeight = "250px";
	textBox.style.justifyContent = "center";
	
	var textValue = document.createElement('span');
	textValue.style.fontWeight = "bold";
	textValue.style.color = "#9f9f9f";
	textValue.innerHTML = "Select a dataset from the tabs above"

	//	The div currently contains the textbox, but can be re-used later
	textBox.appendChild(textValue);
	div.appendChild(textBox);

	this._div.appendChild(div);
	return this._div;
}

//	When .update() is called on the "chartControl" control object...
chartControl.update = function () {

	if (map.getCurrentPointLayerName() != "none") {

		this._div.childNodes[0].innerHTML = "";
		this._div.childNodes[0].appendChild(map.getChartInstance().canvas)

		map.getChartInstance().options.scales['x'].title.display = true;
		map.getChartInstance().options.scales['x'].title.text = map.getCurrentDemographics() == "lowinc" 	? 	"% of Population Considered \"Low-Income\"" :
																map.getCurrentDemographics() == "ind"		? 	"% of Population Considered \"Indigenous\"" :
																"% of Population Considered \"Visible Minority\"";

		map.getChartInstance().options.scales['y'].title.display = true;
		map.getChartInstance().options.scales['y'].title.text = "Median Emissions (t)";

		map.getChartInstance().options.scales['y'].title.text = map.getCurrentPointLayerName() == "NPRI_PM2_5" 	? "Median PM2.5 Emissions (t)" :
																map.getCurrentPointLayerName() == "NPRI_NH3"	? "Median Ammonia Emissions (t)" :
																map.getCurrentPointLayerName() == "NPRI_NOx"	? "Median NOx Emissions (t)" :
																map.getCurrentPointLayerName() == "NPRI_CO"		? "Median CO Emissions (t)" :
																map.getCurrentPointLayerName() == "NPRI_SO2"	? "Median SO2 Emissions (t)" :
																									"Median VOC Emissions (t)" ;

		map.getChartInstance().options.layout.padding.right = "10";
		map.getChartInstance().options.layout.padding.top = "18";

 		map.getChartInstance().options.scales['x'].ticks.padding = 7;
		map.getChartInstance().options.scales['y'].ticks.padding = 7;

		map.getChartInstance().options.scales['x'].grid.drawTicks = false;
		map.getChartInstance().options.scales['y'].grid.drawTicks = false;

		//map.getChartInstance().options.scales['x'].grid.tickLength = 5;


		map.getChartInstance().data = buildChartData();
		map.getChartInstance().update();
	}
}

//	When .refresh() is called on the "chartControl" control object...
chartControl.refresh = function () {

	// .update() is a chart.js function
	map.getChartInstance().update();
}

chartControl.addTo(map);


	// ----------------


var hoverControl = L.control({position:"topright"});

//	When the "hoverControl" control object is added to the map...
hoverControl.onAdd = function() {

	this._div = L.DomUtil.create('div', 'info');
	this._div.style.width = "520px";
	L.DomEvent.disableClickPropagation(this._div);

	return this._div;
}

//	Invoked when hovering over a "basemap" polygon in the map frame...
//	PARAM(S): properties = "properties" from a leaflet layer object
hoverControl.updateBasePoly = function (properties) {

	this._div.innerHTML = "";

	var boundaryString = 	(map.getBoundaryLevel() == "province") 	? "Province / Territory" :
							(map.getBoundaryLevel() == "c_div") 	? "Census Division" :
							(map.getBoundaryLevel() == "c_subdiv") 	? "Census Subdivision" :
																	  "Aggregate Dissemination Area"
																  
	var contentContainer = document.createElement('div');

	var titleBox = document.createElement('div');
	titleBox.style.display = "flex";
	titleBox.style.height = "35px";
	titleBox.style.lineHeight = "35px";
	titleBox.style.justifyContent = "center";

	var titleText = document.createElement('span');
	titleText.style.textDecoration = "underline";
	titleText.innerHTML = boundaryString + "&nbspInformation";

	titleBox.appendChild(titleText);

	// ---------------------------------

 	var infoContainer = document.createElement('div');

	var line1Box = document.createElement('div');
	line1Box.classList.add("hoverLineBox");

	var line1Text1 = document.createElement('p');
	line1Text1.style.width = "100%";
	line1Text1.style.fontWeight = "bold";
	line1Text1.style.textAlign = "center";

	line1Text1.innerHTML = 	boundaryString == "Province / Territory" ? 	properties.prename : 
							boundaryString == "Census Division" ? 		properties.cdname :
							boundaryString == "Census Subdivision" ? 	properties.csdname :
												"ADA ID:&nbsp" + properties.adauid;

 	line1Box.appendChild(line1Text1);

	// ---------------------------------

	var line2Box = document.createElement('div');
	line2Box.classList.add("hoverLineBox");

	var line2Text1 = document.createElement('p');
	line2Text1.style.width = "38%";
	line2Text1.style.textAlign = "right"
	line2Text1.innerHTML = "Population:&nbsp";

	var line2Text2 = document.createElement('p');
	line2Text2.style.width = "62%";
	line2Text2.innerHTML = properties.pop + "&nbsp|&nbsp" + "Rank&nbsp" + properties.pop_rank + "&nbspof&nbsp" + properties.record_count;

 	line2Box.appendChild(line2Text1);
 	line2Box.appendChild(line2Text2);

	// ---------------------------------

	var line3Box = document.createElement('div');
	line3Box.classList.add("hoverLineBox");

	var line3Text1 = document.createElement('p');
	line3Text1.style.width = "38%";
	line3Text1.style.textAlign = "right"
	line3Text1.innerHTML = "Low-Income Population:&nbsp";

	if (map.getCurrentDemographics() == "lowinc") {

		line3Text1.style.fontWeight = "bold";
		line3Text1.style.color = lowincColourRamp[3];
	}

	var line3Text2 = document.createElement('p');
	line3Text2.style.width = "62%";
	line3Text2.innerHTML = Math.floor((properties.lowinc / 100) * properties.pop) + "&nbsp|&nbsp" + properties.lowinc + "%&nbsp|&nbspRank&nbsp" + properties.lowinc_rank + "&nbspof&nbsp" + properties.record_count;

 	line3Box.appendChild(line3Text1);
 	line3Box.appendChild(line3Text2);

	// ---------------------------------

	var line4Box = document.createElement('div');
	line4Box.classList.add("hoverLineBox");

	var line4Text1 = document.createElement('p');
	line4Text1.style.width = "38%";
	line4Text1.style.textAlign = "right"
	line4Text1.innerHTML = "Indigenous Population:&nbsp";

	if (map.getCurrentDemographics() == "ind") {

		line4Text1.style.fontWeight = "bold";
		line4Text1.style.color = indColourRamp[3];
	}

	var line4Text2 = document.createElement('p');
	line4Text2.style.width = "62%";
	line4Text2.innerHTML = Math.floor((properties.ind / 100) * properties.pop) + "&nbsp|&nbsp" + properties.ind + "%&nbsp|&nbspRank&nbsp" + properties.ind_rank + "&nbspof&nbsp" + properties.record_count;

 	line4Box.appendChild(line4Text1);
 	line4Box.appendChild(line4Text2);

	// ---------------------------------

	var line5Box = document.createElement('div');
	line5Box.classList.add("hoverLineBox");

	var line5Text1 = document.createElement('p');
	line5Text1.style.width = "38%";
	line5Text1.style.textAlign = "right"
	line5Text1.innerHTML = "Visible Minority Population:&nbsp";

	if (map.getCurrentDemographics() == "vm") {

		line5Text1.style.fontWeight = "bold";
		line5Text1.style.color = vmColourRamp[3];
	}

	var line5Text2 = document.createElement('p');
	line5Text2.style.width = "62%";
	line5Text2.innerHTML = Math.floor((properties.vm / 100) * properties.pop) + "&nbsp|&nbsp" + properties.vm + "%&nbsp|&nbspRank&nbsp" + properties.vm_rank + "&nbspof&nbsp" + properties.record_count;

 	line5Box.appendChild(line5Text1);
 	line5Box.appendChild(line5Text2);

	// ---------------------------------

	infoContainer.appendChild(line1Box);
	infoContainer.appendChild(line2Box);
	infoContainer.appendChild(line3Box);
	infoContainer.appendChild(line4Box);
	infoContainer.appendChild(line5Box);

	contentContainer.appendChild(titleBox);
	contentContainer.appendChild(infoContainer);
	this._div.append(contentContainer);
}

//	Invoked when hovering over a point-layer polygon in the map frame...
//	PARAM(S): properties = "properties" from a leaflet layer object
hoverControl.updatePointPoly = function (properties) {

	this._div.innerHTML = "";

	//	Because we're hovering over a polygon with polluting facilities, the hover control is styled with a red border (like the related map symbology)
	this._div.style.outlineStyle = "solid";
	this._div.style.outlineOffset = "-5px";
	this._div.style.outlineWidth = "3px";
	this._div.style.outlineColor = pointColour;

	var boundaryString = 	(map.getBoundaryLevel() == "province") 	? "Province / Territory" :
							(map.getBoundaryLevel() == "c_div") 	? "Census Division" :
							(map.getBoundaryLevel() == "c_subdiv") 	? "Census Subdivision" :
																	  "Aggregate Dissemination Area"
																  
	var contentContainer = document.createElement('div');

	var titleBox = document.createElement('div');
	titleBox.style.display = "flex";
	titleBox.style.height = "35px";
	titleBox.style.lineHeight = "35px";
	titleBox.style.justifyContent = "center";

	var titleText = document.createElement('span');
	titleText.style.textDecoration = "underline";
	titleText.innerHTML = boundaryString + "&nbspInformation";

	titleBox.appendChild(titleText);

	// ---------------------------------

 	var infoContainer = document.createElement('div');

	var line1Box = document.createElement('div');
	line1Box.classList.add("hoverLineBox");

	var line1Text1 = document.createElement('p');
	line1Text1.style.width = "100%";
	line1Text1.style.fontWeight = "bold";
	line1Text1.style.textAlign = "center";

	line1Text1.innerHTML = 	boundaryString == "Province / Territory" ? 	properties.prename : 
							boundaryString == "Census Division" ? 		properties.cdname :
							boundaryString == "Census Subdivision" ? 	properties.csdname :
																		"ADA ID:&nbsp" + properties.adauid;

 	line1Box.appendChild(line1Text1);

	// ---------------------------------

	var line2Box = document.createElement('div');
	line2Box.classList.add("hoverLineBox");

	var line2Text1 = document.createElement('p');
	line2Text1.style.width = "38%";
	line2Text1.style.textAlign = "right"
	line2Text1.innerHTML = "Population:&nbsp";

	var line2Text2 = document.createElement('p');
	line2Text2.style.width = "62%";
	line2Text2.innerHTML = properties.pop + "&nbsp&nbsp|&nbsp&nbsp" + "Rank&nbsp" + properties.pop_rank + "&nbspof&nbsp" + properties.record_count;

 	line2Box.appendChild(line2Text1);
 	line2Box.appendChild(line2Text2);

	// ---------------------------------

	var line3Box = document.createElement('div');
	line3Box.classList.add("hoverLineBox");

	var line3Text1 = document.createElement('p');
	line3Text1.style.width = "38%";
	line3Text1.style.textAlign = "right";
	line3Text1.style.fontWeight = "bold";

	var line3Text2 = document.createElement('p');
	line3Text2.style.width = "62%";

	if (map.getCurrentDemographics() == "lowinc") {

		line3Text1.innerHTML = "Low-Income Population:&nbsp";
		line3Text1.style.color = lowincColourRamp[3];
		line3Text2.innerHTML = Math.floor((properties.lowinc / 100) * properties.pop) + "&nbsp&nbsp|&nbsp&nbsp" + properties.lowinc + "%&nbsp&nbsp|&nbsp&nbspRank&nbsp" + properties.lowinc_rank + "&nbspof&nbsp" + properties.record_count;
	}

	else if (map.getCurrentDemographics() == "ind") {

		line3Text1.innerHTML = "Indigenous Population:&nbsp";
		line3Text1.style.color = indColourRamp[3];
		line3Text2.innerHTML = Math.floor((properties.ind / 100) * properties.pop) + "&nbsp&nbsp|&nbsp&nbsp" + properties.ind + "%&nbsp&nbsp|&nbsp&nbspRank&nbsp" + properties.ind_rank + "&nbspof&nbsp" + properties.record_count;
	}

	else {

		line3Text1.innerHTML = "Visible Minority Population:&nbsp";
		line3Text1.style.color = vmColourRamp[3];
		line3Text2.innerHTML = Math.floor((properties.vm / 100) * properties.pop) + "&nbsp&nbsp|&nbsp&nbsp" + properties.vm + "%&nbsp&nbsp|&nbsp&nbspRank&nbsp" + properties.vm_rank + "&nbspof&nbsp" + properties.record_count;
	}

 	line3Box.appendChild(line3Text1);
 	line3Box.appendChild(line3Text2);

	// ---------------------------------

	var line4Box = document.createElement('div');
	line4Box.classList.add("hoverLineBox");

	var line4Text1 = document.createElement('p');
	line4Text1.style.width = "38%";
	line4Text1.style.textAlign = "right"
	line4Text1.innerHTML = "&nbsp";

	var line4Text2 = document.createElement('p');
	line4Text2.style.width = "62%";
	line4Text2.innerHTML = "&nbsp";

 	line4Box.appendChild(line4Text1);
 	line4Box.appendChild(line4Text2);

	// ---------------------------------

	var line5Box = document.createElement('div');
	line5Box.classList.add("hoverLineBox");

	var line5Text1 = document.createElement('p');
	line5Text1.style.width = "38%";
	line5Text1.style.textAlign = "right"
	line5Text1.innerHTML = "Contained Points:&nbsp";

	var line5Text2 = document.createElement('p');
	line5Text2.style.width = "62%";
	line5Text2.innerHTML = properties.point_count + "&nbsp(of&nbsp" + properties.total_point_count + ")&nbsp&nbsp|&nbsp&nbspRank&nbsp" + properties.point_count_rank + "&nbspof&nbsp" + properties.polys_with_points;

 	line5Box.appendChild(line5Text1);
 	line5Box.appendChild(line5Text2);

	// ---------------------------------

	var line6Box = document.createElement('div');
	line6Box.classList.add("hoverLineBox");

	var line6Text1 = document.createElement('p');
	line6Text1.style.width = "38%";
	line6Text1.style.textAlign = "right"
	line6Text1.innerHTML = "Median Emissions:&nbsp";

	var line6Text2 = document.createElement('p');
	line6Text2.style.width = "62%";
	line6Text2.innerHTML = properties.median_emissions + "&nbsp(t)&nbsp&nbsp|&nbsp&nbspRank&nbsp" + properties.median_emissions_rank + "&nbspof&nbsp" + properties.polys_with_points;

 	line6Box.appendChild(line6Text1);
 	line6Box.appendChild(line6Text2);

	// ---------------------------------

	var line7Box = document.createElement('div');
	line7Box.classList.add("hoverLineBox");

	var line7Text1 = document.createElement('p');
	line7Text1.style.width = "38%";
	line7Text1.style.textAlign = "right"
	line7Text1.innerHTML = "Total Emissions:&nbsp";

	var line7Text2 = document.createElement('p');
	line7Text2.style.width = "62%";
	line7Text2.innerHTML = properties.total_emissions.toFixed(2) + "&nbsp(t)&nbsp&nbsp|&nbsp&nbspRank&nbsp" + properties.total_emissions_rank + "&nbspof&nbsp" + properties.polys_with_points;

 	line7Box.appendChild(line7Text1);
 	line7Box.appendChild(line7Text2);

	// ---------------------------------

	infoContainer.appendChild(line1Box);
	infoContainer.appendChild(line2Box);
 	infoContainer.appendChild(line3Box);
	infoContainer.appendChild(line4Box);
	infoContainer.appendChild(line5Box);
	infoContainer.appendChild(line6Box);
	infoContainer.appendChild(line7Box);

	contentContainer.appendChild(titleBox);
	contentContainer.appendChild(infoContainer);
	this._div.append(contentContainer);
}

//	Invoked when hovering over a point symbol in the map frame...
//	PARAM(S): properties = "properties" from a leaflet layer object
hoverControl.updatePoint = function (properties) {

	this._div.innerHTML = "";

	//	Because we're hovering over a point, the hover control is styled with a red border...
	this._div.style.outlineStyle = "solid";
	this._div.style.outlineOffset = "-5px";
	this._div.style.outlineWidth = "3px";
	this._div.style.outlineColor = pointColour;

	//	...and a point symbol in the top left of the control
	var pointIcon = document.createElement('div');
	pointIcon.classList.add("legendPointSymbol");
	pointIcon.style.width = "50px";
	pointIcon.style.height = "50px";
	pointIcon.style.left = "-10px";
	pointIcon.style.top = "-9px";

	// ---------------------------------

	var contentContainer = document.createElement('div');

	var titleBox = document.createElement('div');
	titleBox.style.display = "flex";
	titleBox.style.height = "35px";
	titleBox.style.lineHeight = "35px";
	titleBox.style.justifyContent = "center";

	var titleText = document.createElement('span');
	titleText.style.textDecoration = "underline";
	titleText.innerHTML = "Facility Information";

	titleBox.appendChild(titleText);

	// ---------------------------------

	var infoContainer = document.createElement('div');

	var line1Box = document.createElement('div');
	line1Box.classList.add("hoverLineBox");

	var line1Text1 = document.createElement('p');
	line1Text1.style.width = "100%";
	line1Text1.style.textAlign = "center";
	line1Text1.style.fontWeight = "bold";

	if (properties.company_na.length >= 60) {

		line1Text1.innerHTML = properties.company_na.substring(0, 60) + "...";
	}
	else {

		line1Text1.innerHTML = properties.company_na;
	}

	line1Box.appendChild(line1Text1);

	// ---------------------------------

	var line2Box = document.createElement('div');
	line2Box.classList.add("hoverLineBox");

	var line2Text1 = document.createElement('p');
	line2Text1.style.width = "25%";
	line2Text1.style.textAlign = "right";
	line2Text1.innerHTML = "Industry:&nbsp";

	var line2Text2 = document.createElement('p');
	line2Text2.style.width = "75%";

	if (properties.naics_4_se.length >= 55) {

		line2Text2.innerHTML = properties.naics_4_se.substring(0, 55) + "...";
	}	
	else {

		line2Text2.innerHTML = properties.naics_4_se;
	}

	line2Box.appendChild(line2Text1);
	line2Box.appendChild(line2Text2);

	// ---------------------------------

	var line3Box = document.createElement('div');
	line3Box.classList.add("hoverLineBox");

	var line3Text1 = document.createElement('p');
	line3Text1.style.width = "25%";
	line3Text1.style.textAlign = "right";
	line3Text1.innerHTML = "Location:&nbsp";

	var line3Text2 = document.createElement('p');
	line3Text2.style.width = "75%";
	line3Text2.innerHTML = properties.city + ",&nbsp" + properties.province;

	line3Box.appendChild(line3Text1);
	line3Box.appendChild(line3Text2);

	// ---------------------------------

	var line4Box = document.createElement('div');
	line4Box.classList.add("hoverLineBox");

	var line4Text1 = document.createElement('p');
	line4Text1.style.width = "25%";
	line4Text1.style.textAlign = "right";
	line4Text1.innerHTML = "&nbsp";

	var line4Text2 = document.createElement('p');
	line4Text2.style.width = "75%";
	line4Text2.innerHTML = "&nbsp";

	line4Box.appendChild(line4Text1);
	line4Box.appendChild(line4Text2);

	// ---------------------------------
	
	var line5Box = document.createElement('div');
	line5Box.classList.add("hoverLineBox");

	var line5Text1 = document.createElement('p');
	line5Text1.style.width = "25%";
	line5Text1.style.textAlign = "right";
	line5Text1.innerHTML = "Emission Type:&nbsp";

	var line5Text2 = document.createElement('p');
	line5Text2.style.width = "75%";
	line5Text2.innerHTML = properties.substance_;

	line5Box.appendChild(line5Text1);
	line5Box.appendChild(line5Text2);

	// ---------------------------------

	var line6Box = document.createElement('div');
	line6Box.classList.add("hoverLineBox");

	var line6Text1 = document.createElement('p');
	line6Text1.style.width = "25%";
	line6Text1.style.textAlign = "right";
	line6Text1.innerHTML = "Total&nbspEmissions:&nbsp";

	var line6Text2 = document.createElement('p');
	line6Text2.style.width = "75%";
	line6Text2.innerHTML = properties.grand_tota + "&nbsp(t)";

	line6Box.appendChild(line6Text1);
	line6Box.appendChild(line6Text2);

	// ---------------------------------

	var line7Box = document.createElement('div');
	line7Box.classList.add("hoverLineBox");

	var line7Text1 = document.createElement('p');
	line7Text1.style.width = "25%";
	line7Text1.style.textAlign = "right";
	line7Text1.innerHTML = "&nbsp";

	var line7Text2 = document.createElement('p');
	line7Text2.style.width = "75%";
	line7Text2.innerHTML = "Ranked&nbsp" + properties.emissions_rank + "&nbspamong&nbsp" + properties.record_count + "&nbspfacilities&nbspof&nbspthis&nbsptype";

	line7Box.appendChild(line7Text1);
	line7Box.appendChild(line7Text2);

	// ---------------------------------

	infoContainer.appendChild(line1Box);
	infoContainer.appendChild(line2Box);
	infoContainer.appendChild(line3Box);
	infoContainer.appendChild(line4Box);
	infoContainer.appendChild(line5Box);
	infoContainer.appendChild(line6Box);
	infoContainer.appendChild(line7Box);

	contentContainer.appendChild(titleBox);
	contentContainer.appendChild(infoContainer);
	this._div.appendChild(pointIcon);
	this._div.appendChild(contentContainer);
}

//	When .reset() is called on the "chartControl" control object...
hoverControl.reset = function () {

	this._div.style.outlineStyle = "none";
	this._div.innerHTML = "";
	//L.DomUtil.disableTextSelection(this._div);

	var contentContainer = document.createElement('div');

	var textBox = document.createElement('div');
	textBox.style.display = "flex";
	textBox.style.height = "75px";
	textBox.style.lineHeight = "75px";
	textBox.style.justifyContent = "center";

	var textValue = document.createElement('span');
	textValue.style.fontWeight = "bold";
	textValue.style.color = "#9f9f9f";
	textValue.innerHTML = "Hover over a feature for more information"

	textBox.appendChild(textValue);
	contentContainer.appendChild(textBox);

	this._div.appendChild(contentContainer);
}

hoverControl.addTo(map);
hoverControl.reset();


	// ----------------


var popup = L.popup();

//	When .remove() is called on the "popup" leaflet popup object...
popup.on("remove", function() {

	map.getHighlightPolygon().removeFrom(map);

	if(map.getCurrentPointLayer() != null) {

		chartControl.update();
		chartControl.refresh();		
	}
});



	// --------------------------------------------------------
	// --------------------------------------------------------



//	When the base layer gets changed in the map...
//	PARAM(S): layer = the new / to-be-displayed leaflet layer, one of:
//									"province" | "c_div" | "c_subdiv" | "agg_diss"
map.on("baselayerchange", function(layer) {

	popup.removeFrom(map);

	if (layer.name == "Provinces / Territories") map.setBoundaryLevel("province");
	else if (layer.name == "Census Divisions") map.setBoundaryLevel("c_div");
	else if (layer.name == "Census Subdivisions") map.setBoundaryLevel("c_subdiv");
	else if (layer.name == "Aggregate Dissemination Areas")	map.setBoundaryLevel("agg_diss");

	if (map.getCurrentPointLayerName() != "none") {

		displayPointLayerGroup(map.getCurrentPointLayerName());
		layerControl._layers.forEach(layer => layer.layer.bringToBack());
	}
})

//	When a "zoom" action (i.e. scrolling, using the + / - buttons) in the map ends...
map.on("zoomend", function() {

	layerControl._layers.forEach(layer => { layer.layer.setStyle(base_boundaryStyle) })
})

//	When the map is clicked on...
//	PARAM(S): e = leaflet click event info
map.on("click", function(e) {

	clickInfo(e.latlng.lat, e.latlng.lng)
		.then((res) => {
			
			//	If the user has clicked within a polygon on the map
			if (res !== null) {

				var tempGeoJSON = L.geoJSON(res[map.getBoundaryLevel()], {style:highlightPolygonStyle})

				map.setHighlightPolygon(tempGeoJSON);

				map.getHighlightPolygon().addTo(map)

				if (map.getCurrentPointLayer() != null) {

					var chartInstance = map.getChartInstance();
					var highlightLayer = Object.values(map.getHighlightPolygon()._layers);
					var highlightDGUID = highlightLayer[0].feature.properties.dguid;
					const matchingDGUID = (element) => element.dguid == highlightDGUID;

					var matchIndex = chartInstance.data.datasets[1].data.findIndex(matchingDGUID);

					chartInstance.data.datasets[1].radius[matchIndex] = 0;

					chartInstance.data.datasets[0].data = [chartInstance.data.datasets[1].data[matchIndex]];

					//console.log(chartInstance.data.datasets[1].data[matchIndex])

					var chartPointRamp = 	map.getCurrentDemographics() == "lowinc" ? 	lowincColourRamp :
											map.getCurrentDemographics() == "ind" 	  ? indColourRamp :
																   						vmColourRamp;

					//chartPointRamp[parseValue(currentLayer._layers[prop].feature.properties[map.getCurrentDemographics()])] + "BF");
					if (matchIndex >= 0) {

						chartInstance.data.datasets[0].pointBackgroundColor = chartPointRamp[parseValue(chartInstance.data.datasets[1].data[matchIndex].x)]
					}

					chartControl.refresh();

				}

				popup
					.setLatLng(e.latlng)
					.setContent(buildPopup(res))
					.openOn(map)
			}
	});
});


	
	// --------------------------------------------------------
	// --------------------------------------------------------



//	https://github.com/CliffCloud/Leaflet.EasyButton
var lowincButton = L.easyButton({

	//	The order of the states in these button definitions reflects how they're initially presented in the map
	states: [{

		stateName: 	"selected",
		icon: 		"<i class=\"bi bi-circle-fill\"></i>", /* https://icons.getbootstrap.com/icons/circle-fill/ */
		title:		"Displaying 'Low-Income' Census Demographics",

	}, {

		stateName: 	"unselected",
		icon: 		"<i class=\"bi bi-circle\"></i>", /* https://icons.getbootstrap.com/icons/circle/ */
		title: 		"Click to display 'Low-Income' Census Demographics",

		onClick: function(btn, map) {

			//	Update the background colour of each button in the easyBar
			lowincButton.button.style.backgroundColor = lowincColourRamp[2];
			indButton.button.style.backgroundColor = "white";
			vmButton.button.style.backgroundColor = "white";

			//	Update the state of each button in the easyBar
			btn.state('selected');
			indButton.state('unselected');
			vmButton.state('unselected');

			//	If there's a popup currently displayed, it gets removed
			popup.removeFrom(map);
			map.setCurrentDemographics("lowinc");
			chartControl.update();
			legend.update();

			//	The style for the boundaries (i.e. the colours used in the choropleth) need to be refreshed when changing button states
			layerControl._layers.forEach(layer => { layer.layer.setStyle(base_boundaryStyle) })
		}
	}],
});

var indButton = L.easyButton({

	states: [{

		stateName: 	"unselected",
		icon: 		"<i class=\"bi bi-circle\"></i>",
		title: 		"Click to display 'Indigenous' Census Demographics",
		onClick: function(btn, map) {

			lowincButton.button.style.backgroundColor = "white";
			indButton.button.style.backgroundColor = indColourRamp[2];
			vmButton.button.style.backgroundColor = "white";

			btn.state('selected')
			lowincButton.state('unselected')
			vmButton.state('unselected')

			popup.removeFrom(map);
			map.setCurrentDemographics("ind");
			chartControl.update();

			legend.update();

			layerControl._layers.forEach(layer => { layer.layer.setStyle(base_boundaryStyle) })
		}
	}, {

		stateName: 	"selected",
		icon: 		"<i class=\"bi bi-circle-fill\"></i>",
		title:		"Displaying 'Indigenous' Census Demographics",
	}]
});

var vmButton = L.easyButton({

	states: [{

		stateName: 	"unselected",
		icon: 		"<i class=\"bi bi-circle\"></i>",
		title: 		"Click to display 'Visible Minority' Census Demographics",
		onClick: function(btn, map) {

			lowincButton.button.style.backgroundColor = "white";
			indButton.button.style.backgroundColor = "white";
			vmButton.button.style.backgroundColor = vmColourRamp[2];

			btn.state('selected')
			lowincButton.state('unselected')
			indButton.state('unselected')

			popup.removeFrom(map);
			map.setCurrentDemographics("vm");
			chartControl.update();
			legend.update();

			layerControl._layers.forEach(layer => { layer.layer.setStyle(base_boundaryStyle) })
		}
	}, {

		stateName: 	"selected",
		icon: 		"<i class=\"bi bi-circle-fill\"></i>",
		title:		"Displaying 'Visible Minority' Census Demographics",
	}]
});

lowincButton.button.style.backgroundColor = lowincColourRamp[2];

//	an easyBar is just a wrapper included with leaflet.easyButton for wrapping together multiple easyButtons
var demoBar = L.easyBar([lowincButton, indButton, vmButton], {position:"bottomright"}).addTo(map);



	// --------------------------------------------------------
	// --------------------------------------------------------



//	This function handles the initial site-load database calls / data loading
initializeSite();
