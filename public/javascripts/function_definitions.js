//	General function to pass a path to DB / return its results as a geoJSON object
//	PARAM(S): pathString = database path for a given dataset, see index.js for paths
const dbQuery_return = async (pathString) => {

	var returnMe = null;

	await fetch(pathString)

		//	Parse the result from the database as a JSON object
		.then(fetchResult => fetchResult.json())

		//	Make a copy of the JSON object to return from the function
		.then((queryResult) => returnMe = queryResult)
		.catch((error) => console.log("dbQuery_return function ERROR: " + error.stack));
	
	return returnMe;
}

//	General function to pass a path to DB / print its results to the console
//	PARAM(S): pathString = database path for a given dataset, see index.js for paths
const dbQuery_print = async (pathString) => {

	await fetch(pathString)
		.then(fetchResult => fetchResult.json())
		.then((queryResult) => console.log(queryResult))
		.catch((error) => console.log("dbQuery_print function ERROR: " + error.stack));
}



	// --------------------------------------------------------
	// --------------------------------------------------------



//	Function to create a geoJSON layers of a pollutant dataset, aggregated pollutant information / return its results as a leaflet layer group
//	PARAM(S): layerName = identifier for the pollutant dataset to be loaded / aggregated, one of:
//							"NPRI_PM2_5" | "NPRI_NH3" | "NPRI_NOx" | "NPRI_CO" | "NPRI_SO2" | "NPRI_VOCs"
const createPointLayerGroup = async (layerName) => {

	//	Leaflet point layer representing polluting facilities
	var pointGeoJSON = L.geoJSON(await dbQuery_return("/get_geojson_pollutantPoints/" + layerName), 

		//	Styling for the points 
		{pointToLayer: init_PL_pointStyle, 
		
		//	Hover functionality for the points
		onEachFeature: onEachFeaturePoint});

	pointGeoJSON._leaflet_id = layerName + "-pointlayer";

	//	Leaflet polygon layer representing aggregated polluting facility data at province-level boundary abstraction
	var ptb_province = L.geoJSON(await dbQuery_return("/agg_point-to-boundary-overlay/" + layerName + "-province"), 
	
		//	Styling function for the polygons
		{style:init_PL_boundaryStyle, 
			
		//	Hover function for the polygons
		onEachFeature:onEachFeaturePointPoly});

	ptb_province._leaflet_id = layerName + "-province";
	
	var ptb_c_div = L.geoJSON(await dbQuery_return("/agg_point-to-boundary-overlay/" + layerName + "-c_div"), {style:init_PL_boundaryStyle, onEachFeature:onEachFeaturePointPoly});
	ptb_c_div._leaflet_id = layerName + "-c_div";
	
	var ptb_c_subdiv = L.geoJSON(await dbQuery_return("/agg_point-to-boundary-overlay/" + layerName + "-c_subdiv"), {style:init_PL_boundaryStyle, onEachFeature:onEachFeaturePointPoly});
	ptb_c_subdiv._leaflet_id = layerName + "-c_subdiv";

	var ptb_agg_diss = L.geoJSON(await dbQuery_return("/agg_point-to-boundary-overlay/" + layerName + "-agg_diss"), {style:init_PL_boundaryStyle, onEachFeature:onEachFeaturePointPoly});
	ptb_agg_diss._leaflet_id = layerName + "-agg_diss";

	//	Create a leaflet layer group of the previously populated variables
	var tempLayerGroup = L.layerGroup([pointGeoJSON, ptb_province, ptb_c_div, ptb_c_subdiv, ptb_agg_diss]);
	tempLayerGroup._leaflet_id = layerName + "-layergroup";

	return tempLayerGroup;
}

//	Function to display a leaflet layer group
//	PARAM(S): groupName = identifier for the leaflet layer group to be displayed
const displayPointLayerGroup = async (groupName) => {

	if (groupName === null) return;
	
	else {

		loadingModal.show();

		var layerToAdd = null;

		//	Iterate through layers already loaded into client-side memory
		map.getPointLayerList().forEach(function(layer) {

			var layerID = layer._leaflet_id.substring(0, layer._leaflet_id.indexOf("-"));

			layer._layers[layerID + "-pointlayer"].removeFrom(map);
			layer._layers[layerID + "-province"].removeFrom(map);
			layer._layers[layerID + "-c_div"].removeFrom(map);
			layer._layers[layerID + "-c_subdiv"].removeFrom(map);
			layer._layers[layerID + "-agg_diss"].removeFrom(map);

			//	If the layer we're trying to show is already loaded 
			if (layerID == groupName) {

				layerToAdd = layer;
			}
		});

		//	If the layer wasn't already loaded in client-side memory
		if (layerToAdd === null) {

			layerToAdd = await createPointLayerGroup(groupName);

			//	There are never more than 3 point datasets kept in client-side memory at a time for performance
			if (map.getPointLayerList().length >= 3) {

				map.getPointLayerList().shift();
			}

			map.getPointLayerList().push(layerToAdd);
		}

		map.setCurrentPointLayer(layerToAdd);

		layerToAdd._layers[groupName + "-" + map.getBoundaryLevel()].addTo(map);		
		layerToAdd._layers[groupName + "-pointlayer"].addTo(map);

		chartControl.update();
		legend.update();

		loadingModal.hide();
	}
}

//	Function to create base layers necessary at site load
const initializeSite = async () => {

	loadingModal.show();

	await dbQuery_return("/get_geojson_boundaryPolygons/agg_diss")
		.then(result => { layerControl.addBaseLayer(L.geoJSON(result, {style:base_boundaryStyle, onEachFeature:onEachFeatureBasePoly}), "Aggregate Dissemination Areas")});

	await dbQuery_return("/get_geojson_boundaryPolygons/c_subdiv")
		.then(result => { layerControl.addBaseLayer(L.geoJSON(result, {style:base_boundaryStyle, onEachFeature:onEachFeatureBasePoly}), "Census Subdivisions")});

	await dbQuery_return("/get_geojson_boundaryPolygons/c_div")
		.then(result => { layerControl.addBaseLayer(L.geoJSON(result, {style:base_boundaryStyle, onEachFeature:onEachFeatureBasePoly}), "Census Divisions")});

	await dbQuery_return("/get_geojson_boundaryPolygons/province")
		.then(result => { layerControl.addBaseLayer(L.geoJSON(result, {style:base_boundaryStyle, onEachFeature:onEachFeatureBasePoly}).addTo(map), "Provinces / Territories") });
	
	buildTab("NPRI_PM2_5", "PM2_5");
	buildTab("NPRI_NH3", "NH3");
	buildTab("NPRI_NOx", "NOx");
	buildTab("NPRI_CO", "CO");
	buildTab("NPRI_SO2", "SO2");
	buildTab("NPRI_VOCs", "VOCs");

	loadingModal.hide();
}



	// --------------------------------------------------------
	// --------------------------------------------------------


//	Function that handles client-server request for information based on passed-in coordinates
//	PARAM(S): lat, lng = coordinates of a point to get more information about
const clickInfo = async (lat, lng) => {

	var tempObj = {};

	await fetch("/get_point-to-boundary-click/", {

		method:'POST',
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		},
		
		body: '{"type":"Point","coordinates":[' + lng + ',' + lat + ']}'
	})
		.then(res => res.json())
		.then(res => {

			if (res.features !== null) {

				res.features.forEach(element => {

					var truncDGUID = element.properties.dguid.substr(0,9);

					if (truncDGUID == "2021A0002") {

						tempObj["province"] = element;
					} else if (truncDGUID == "2021S0516") {

						tempObj["agg_diss"] = element;
					} else if (truncDGUID == "2021A0003") {

						tempObj["c_div"] = element;
					} else if (truncDGUID == "2021A0005") { 

						tempObj["c_subdiv"] = element;
					}
					
				})
			}

			else {

				tempObj = null;
			}
		});

	return tempObj;
}

const resetHoverControl = (rawLayer) => {

	hoverControl.reset();
}

const mouseoverBasePoly = (rawLayer) => {

	var layer = rawLayer.target;

	hoverControl.updateBasePoly(layer.feature.properties);
}

const onEachFeatureBasePoly = (feature, layer) => {

	layer.on({

		mouseover: mouseoverBasePoly,
		mouseout: resetHoverControl
	});
}

const mouseoverPointPoly = (rawLayer) => {

	var layer = rawLayer.target;

	hoverControl.updatePointPoly(layer.feature.properties);
}

const onEachFeaturePointPoly = (feature, layer) => {

	layer.on({

		mouseover: mouseoverPointPoly,
		mouseout: resetHoverControl
	});
}

const mouseoverPoint = (rawLayer) => {

	var layer = rawLayer.target;

	hoverControl.updatePoint(layer.feature.properties);
}

const onEachFeaturePoint = (feature, layer) => {

	layer.on({

		mouseover: mouseoverPoint,
		mouseout: resetHoverControl
	})
}



	// --------------------------------------------------------
	// --------------------------------------------------------



//	Function to build a HTML "tab" (pollutant options displayed in the website)
//	PARAM(S):	buttonString = text content for the "tab" itself
//				layerName = identifier for the pollutant dataset, one of:
//								"NPRI_PM2_5" | "NPRI_NH3" | "NPRI_NOx" | "NPRI_CO" | "NPRI_SO2" | "NPRI_VOCs"
const buildTab = (layerName, buttonString) => {
	
	//	ID of the HTML container for the "tab" elements
	var pointTabNav = document.getElementById("pointTabNav");

	var tempNavItem = document.createElement('li');
	tempNavItem.classList.add('nav-item');

	var tempNavLink = document.createElement('a');
	tempNavLink.innerHTML = buttonString;
	tempNavLink.classList.add('nav-link');
	tempNavLink.href = "#";

	//	When the "tab" is clicked on the website...
	tempNavLink.addEventListener("click", (event) => {

		popup.removeFrom(map);
		displayPointLayerGroup(layerName);
	});

	var tempAttr = document.createAttribute("data-bs-toggle");
	tempAttr.value = "tab";

	tempNavLink.setAttributeNode(tempAttr);
	tempNavItem.appendChild(tempNavLink);
	pointTabNav.appendChild(tempNavItem);
}

//	Function to return an HTML legend for the leaflet "legend" control object based on map state
const buildLegend = () => {

	var tempString = "";
	var classBreaks = [0, 20, 40, 60, 80, 100];

	var currentColours = map.getCurrentDemographics() == "lowinc" ? lowincColourRamp :
						 map.getCurrentDemographics() == "ind" 	  ? indColourRamp :
																	vmColourRamp;

	var demoBox = document.createElement('div');
	demoBox.style.float = "right";

	// ---------------------------------

	var class1Text = document.createElement('p');
	class1Text.innerHTML = classBreaks[0] + "&percnt; &ndash; " + classBreaks[1] + "&percnt;";

	var class1TextBox = document.createElement('div');
	class1TextBox.classList.add("legendTextBox");

	var class1Img = document.createElement('i');
	class1Img.classList.add("legendImage");
	class1Img.style.background = currentColours[parseValue(10)];

	class1TextBox.appendChild(class1Text);
	demoBox.appendChild(class1Img);
	demoBox.appendChild(class1TextBox);

	// ---------------------------------

	var class2Text = document.createElement('p');
	class2Text.innerHTML = classBreaks[1] + "&percnt; &ndash; " + classBreaks[2] + "&percnt;";

	var class2TextBox = document.createElement('div');
	class2TextBox.classList.add("legendTextBox");

	var class2Img = document.createElement('i');
	class2Img.classList.add("legendImage");
	class2Img.style.background = currentColours[parseValue(30)];

	class2TextBox.appendChild(class2Text);
	demoBox.appendChild(class2Img);
	demoBox.appendChild(class2TextBox);

	// ---------------------------------

	var class3Text = document.createElement('p');
	class3Text.innerHTML = classBreaks[2] + "&percnt; &ndash; " + classBreaks[3] + "&percnt;";

	var class3TextBox = document.createElement('div');
	class3TextBox.classList.add("legendTextBox");

	var class3Img = document.createElement('i');
	class3Img.classList.add("legendImage");
	class3Img.style.background = currentColours[parseValue(50)];

	class3TextBox.appendChild(class3Text);
	demoBox.appendChild(class3Img);
	demoBox.appendChild(class3TextBox);

	// ---------------------------------

	var class4Text = document.createElement('p');
	class4Text.innerHTML = classBreaks[3] + "&percnt; &ndash; " + classBreaks[4] + "&percnt;";

	var class4TextBox = document.createElement('div');
	class4TextBox.classList.add("legendTextBox");

	var class4Img = document.createElement('i');
	class4Img.classList.add("legendImage");
	class4Img.style.background = currentColours[parseValue(70)];

	class4TextBox.appendChild(class4Text);
	demoBox.appendChild(class4Img);
	demoBox.appendChild(class4TextBox);

	// ---------------------------------

	var class5Text = document.createElement('p');
	class5Text.innerHTML = classBreaks[4] + "&percnt; &ndash; " + classBreaks[5] + "&percnt;";

	var class5TextBox = document.createElement('div');
	class5TextBox.classList.add("legendTextBox");

	var class5Img = document.createElement('i');
	class5Img.classList.add("legendImage");
	class5Img.style.background = currentColours[parseValue(90)];

	class5TextBox.appendChild(class5Text);
	demoBox.appendChild(class5Img);
	demoBox.appendChild(class5TextBox);

	// ---------------------------------

	var nodataText = document.createElement('p');
	nodataText.innerHTML = "Out of Range";

	var nodataTextBox = document.createElement('div');
	nodataTextBox.classList.add("legendTextBox");

	var nodataImg = document.createElement('img');
	nodataImg.classList.add("legendImage");
	nodataImg.style.borderBottom = "0.5px solid"
	nodataImg.src = "images/ndlegend.jpg";

	nodataTextBox.appendChild(nodataText);
	demoBox.appendChild(nodataImg);
	demoBox.appendChild(nodataTextBox);

	// ---------------------------------
	// ---------------------------------

	var pointBox = document.createElement('div');
	pointBox.style.float = "left";
	pointBox.style.marginRight = "110px";

	// ---------------------------------

	var symbolsContainer = document.createElement('div');
	symbolsContainer.style.display = "flex";
	symbolsContainer.style.justifyContent = "center";
	symbolsContainer.style.alignItems = "flex-end";
	symbolsContainer.style.width = "100px";
	symbolsContainer.style.height = "100px";

	// ---------------------------------

	var symbol1 = document.createElement('div');
	symbol1.classList.add("legendPointSymbol");
	symbol1.style.background = pointColours[0];
	symbol1.style.width = "15px";
	symbol1.style.height = "15px";

	var line1 = document.createElement('span');
	line1.classList.add("legendPointLine");
	line1.style.left = "7px";
	line1.style.top = "3px";
	line1.innerHTML = "_______";

	var value1Box = document.createElement('div');
	value1Box.classList.add("legendPointBox");
	value1Box.style.left = "63px";
	value1Box.style.top = "4px";

	var value1 = document.createElement('span');
	value1.innerHTML = map.getCurrentPointLayer_Emissions_minMax().min.toFixed(0) + "&nbsp-&nbsp" + (map.getCurrentPointLayer_Emissions_minMax().max * 0.25).toFixed(0);

	value1Box.appendChild(value1);
	symbol1.appendChild(line1);
	symbol1.appendChild(value1Box);

	// ---------------------------------

	var symbol2 = document.createElement('div');
	symbol2.classList.add("legendPointSymbol");
	symbol2.style.background = pointColours[1];
	symbol2.style.width = "30px";
	symbol2.style.height = "30px";

	var line2 = document.createElement('span');
	line2.classList.add("legendPointLine");
	line2.style.left = "22px";
	line2.innerHTML = "______";

	var value2Box = document.createElement('div');
	value2Box.classList.add("legendPointBox")
	value2Box.style.left = "70px";
	value2Box.style.top = "-2px";

	var value2 = document.createElement('span');
	value2.innerHTML = (map.getCurrentPointLayer_Emissions_minMax().max * 0.25).toFixed(0) + "&nbsp-&nbsp" + (map.getCurrentPointLayer_Emissions_minMax().max * 0.5).toFixed(0);

	value2Box.appendChild(value2);
	symbol2.appendChild(line2);
	symbol2.appendChild(value2Box);

	// ---------------------------------

	var symbol3 = document.createElement('div');
	symbol3.classList.add("legendPointSymbol");
	symbol3.style.background = pointColours[2];
	symbol3.style.width = "55px";
	symbol3.style.height = "55px";

	var line3 = document.createElement('span');
	line3.classList.add("legendPointLine");
	line3.style.left = "43px";	
	line3.style.top = "3px";
	line3.innerHTML = "_____";

	var value3Box = document.createElement('div');
	value3Box.classList.add("legendPointBox")
	value3Box.style.left = "83px";

	var value3 = document.createElement('span');
	value3.innerHTML = (map.getCurrentPointLayer_Emissions_minMax().max * 0.5).toFixed(0) + "&nbsp-&nbsp" + (map.getCurrentPointLayer_Emissions_minMax().max * 0.75).toFixed(0);

	value3Box.appendChild(value3);
	symbol3.appendChild(line3);
	symbol3.appendChild(value3Box);

	// ---------------------------------


	var symbol4 = document.createElement('div');
	symbol4.classList.add("legendPointSymbol");
	symbol4.style.background = pointColours[3];
	symbol4.style.width = "85px";
	symbol4.style.height = "85px";

	var line4 = document.createElement('span');
	line4.classList.add("legendPointLine");
	line4.style.left = "66px";
	line4.style.top = "10px";
	line4.innerHTML = "____";

	var value4Box = document.createElement('div');
	value4Box.classList.add("legendPointBox")
	value4Box.style.left = "98px";
	value4Box.style.top = "8px";

	var value4 = document.createElement('span');
	value4.innerHTML = (map.getCurrentPointLayer_Emissions_minMax().max * 0.75).toFixed(0) + "&nbsp-&nbsp" + map.getCurrentPointLayer_Emissions_minMax().max.toFixed(0);

	value4Box.appendChild(value4);
	symbol4.appendChild(line4);
	symbol4.appendChild(value4Box);

	// ---------------------------------

	symbolsContainer.appendChild(symbol4);
	symbolsContainer.appendChild(symbol3);
	symbolsContainer.appendChild(symbol2);
	symbolsContainer.appendChild(symbol1);

	pointBox.appendChild(symbolsContainer);

	// ---------------------------------

	var legendBox = document.createElement('div');
	legendBox.style.display = "flex";
	legendBox.style.alignItems = "center";

	if (map.getCurrentPointLayer() !== null) { legendBox.appendChild(pointBox) };

	legendBox.appendChild(demoBox);

	return legendBox;
}

//	Function to return data for populating chart.js scatter plot based on map state
const buildChartData = () => {

	var currentLayer = map.getCurrentPointLayer()._layers[map.getCurrentPointLayerName() + "-" + map.getBoundaryLevel()];
	var currentData = [];

	var chartPointColour = 	map.getCurrentDemographics() == "lowinc" ? 	lowincColourRamp[3] :
							map.getCurrentDemographics() == "ind" 	  ? indColourRamp[3] :
											   							vmColourRamp[3];

	var chartPointRamp = 	map.getCurrentDemographics() == "lowinc" ? 	lowincColourRamp :
							map.getCurrentDemographics() == "ind" 	  ? indColourRamp :
												   						vmColourRamp;

	var dataColourIndex = [];

	for (const prop in currentLayer._layers) {

		currentData.push({x:currentLayer._layers[prop].feature.properties[map.getCurrentDemographics()], y:currentLayer._layers[prop].feature.properties.median_emissions, dguid:currentLayer._layers[prop].feature.properties.dguid})

		// chartPointRamp[	 parseValue(element demographic value, x )	]
		dataColourIndex.push(chartPointRamp[parseValue(currentLayer._layers[prop].feature.properties[map.getCurrentDemographics()])] + "BF");
	}

	return {
		
		// https://www.chartjs.org/docs/latest/charts/scatter.html
		datasets: [{

			data: {},
			pointHoverRadius: 7,
			radius: 7,
			//pointBackgroundColor: chartPointColour,
			pointBorderWidth: 2,
			pointBorderColor: "cyan",
			pointStyle: "circle",
			order: 0

		},{


			/* label: 'label', */
			data: currentData,

			pointStyle: Array(currentData.length).fill("circle"),
			
			pointBackgroundColor: dataColourIndex,
			
			pointBorderWidth: 0.5,
			
			pointBorderColor: pointColour + "BF",

			radius: Array(currentData.length).fill(3),

			pointHoverRadius: Array(currentData.length).fill(4),

			pointHoverBorderWidth: Array(currentData.length).fill(1),

			order: 1
		}]
	}
}

//	Function to return HTML content for populating leaflet click popup based on map state
//	PARAM(S): clickInfoObject = leaflet click event info
//			https://leafletjs.com/reference.html#popup-setcontent
const buildPopup = (clickInfoObject) => {

	var popupRamp = map.getCurrentDemographics() == "lowinc" ? 		lowincColourRamp :
					map.getCurrentDemographics() == "ind" ? 		indColourRamp :
											   					   	vmColourRamp;
	
	var popupNatRate = 	map.getCurrentDemographics() == "lowinc" 	? 		lowincNationalRate :
						map.getCurrentDemographics() == "ind" 		? 		indNationalRate :
																			vmNationalRate;														

	var returnDiv = document.createElement('div');
	returnDiv.style.width = "285px";

	// ---------------------------------

	var titleBox = document.createElement('div');
	titleBox.classList.add("popupTextBox")
	titleBox.style.height = "35px"
	titleBox.style.justifyContent = "center";

	var tt1 = document.createElement('span');
	tt1.innerHTML = "Pct.&nbsp";
	tt1.style.fontSize = "120%";
	
	var tt2 = document.createElement('span');
	tt2.style.fontSize = "120%";
	tt2.style.fontWeight = "bold"
	
	if (map.getCurrentDemographics() == "lowinc") {

		tt2.innerHTML = "low-income";
		tt2.style.color = popupRamp[3];
	}

	else if (map.getCurrentDemographics() == "ind") {

		tt2.innerHTML = "indigenous";
		tt2.style.color = popupRamp[3];
	}

	else {

		tt2.innerHTML = "visible minority";
		tt2.style.color = popupRamp[3];
	}

	var tt3 = document.createElement('span');
	tt3.style.fontSize = "120%";
	tt3.innerHTML = "&nbspfrom 2021 Census:"

	titleBox.appendChild(tt1);
	titleBox.appendChild(tt2);
	titleBox.appendChild(tt3);

	// ---------------------------------

	var natTextBox = document.createElement('div');
	natTextBox.classList.add("popupTextBox");

	var natText = document.createElement('p');
	natText.classList.add("popupTextLeft");
	natText.innerHTML = "&nbsp&nbspNational Rate: "

	var natValue = document.createElement('p');
	natValue.classList.add("popupTextRight");
	natValue.innerHTML = popupNatRate + "&percnt;"

	natTextBox.appendChild(natText);
	natTextBox.appendChild(natValue);

	var natIcon = document.createElement('i');
	natIcon.classList.add("popupIcon");
	natIcon.style.background = popupRamp[parseValue(popupNatRate)];
	natIcon.style.borderBottom = "0.5px solid";

	// ---------------------------------

	var provTextBox = document.createElement('div');
	provTextBox.classList.add("popupTextBox");

	var provText = document.createElement('p');
	provText.classList.add("popupTextLeft");
	provText.innerHTML = "&nbsp&nbspProvince / Territory: "

	var provValue = document.createElement('p');
	provValue.classList.add("popupTextRight");
	provValue.innerHTML = clickInfoObject["province"].properties[map.getCurrentDemographics()] + "&percnt;"

	provTextBox.appendChild(provText);
	provTextBox.appendChild(provValue);

	var provIcon;
	
	if (parseValue(clickInfoObject["province"].properties[map.getCurrentDemographics()]) === null) {

		provIcon = document.createElement('img');
		provIcon.classList.add("popupIcon");
		provIcon.src = "images/ndlegend.jpg";
	}

	else {

		provIcon = document.createElement('i');
		provIcon.classList.add("popupIcon");
		provIcon.style.background = popupRamp[parseValue(clickInfoObject["province"].properties[map.getCurrentDemographics()])];
	}

	// ---------------------------------

	var c_divTextBox = document.createElement('div');
	c_divTextBox.classList.add("popupTextBox");

	var c_divText = document.createElement('p');
	c_divText.classList.add("popupTextLeft");
	c_divText.innerHTML = "&nbsp&nbspCensus Division: "

	var c_divValue = document.createElement('p');
	c_divValue.classList.add("popupTextRight");
	c_divValue.innerHTML = clickInfoObject["c_div"].properties[map.getCurrentDemographics()] + "&percnt;";

	c_divTextBox.appendChild(c_divText);
	c_divTextBox.appendChild(c_divValue);

	var c_divIcon;

	if (parseValue(clickInfoObject["c_div"].properties[map.getCurrentDemographics()]) === null) {

		c_divIcon = document.createElement('img');
		c_divIcon.classList.add("popupIcon");
		c_divIcon.src = "images/ndlegend.jpg";
	}

	else {

		c_divIcon = document.createElement('i');
		c_divIcon.classList.add("popupIcon");
		c_divIcon.style.background = popupRamp[parseValue(clickInfoObject["c_div"].properties[map.getCurrentDemographics()])];
	}

	// ---------------------------------

	var c_subdivTextBox = document.createElement('div');
	c_subdivTextBox.classList.add("popupTextBox");

	var c_subdivText = document.createElement('p');
	c_subdivText.classList.add("popupTextLeft");
	c_subdivText.innerHTML = "&nbsp&nbspCensus Subdivision: "

	var c_subdivValue = document.createElement('p');
	c_subdivValue.classList.add("popupTextRight");
	c_subdivValue.innerHTML = clickInfoObject["c_subdiv"].properties[map.getCurrentDemographics()] + "&percnt;";

	c_subdivTextBox.appendChild(c_subdivText);
	c_subdivTextBox.appendChild(c_subdivValue);

	var c_subdivIcon;

	if (parseValue(clickInfoObject["c_subdiv"].properties[map.getCurrentDemographics()]) === null) {

		c_subdivIcon = document.createElement('img');
		c_subdivIcon.classList.add("popupIcon");
		c_subdivIcon.src = "images/ndlegend.jpg";

	}

	else {

		c_subdivIcon = document.createElement('i');
		c_subdivIcon.classList.add("popupIcon");
		c_subdivIcon.style.background = popupRamp[parseValue(clickInfoObject["c_subdiv"].properties[map.getCurrentDemographics()])];
	}

	// ---------------------------------

	var agg_dissTextBox = document.createElement('div');
	agg_dissTextBox.classList.add("popupTextBox");

	var agg_dissText = document.createElement('p');
	agg_dissText.classList.add("popupTextLeft");
	agg_dissText.innerHTML = "&nbsp&nbspAggregate Dissemination Area: "

	var agg_dissValue = document.createElement('p');
	agg_dissValue.classList.add("popupTextRight");
	agg_dissValue.innerHTML = clickInfoObject["agg_diss"].properties[map.getCurrentDemographics()] + "&percnt;";

	agg_dissTextBox.appendChild(agg_dissText);
	agg_dissTextBox.appendChild(agg_dissValue);

	var agg_dissIcon;
	
	
	if (parseValue(clickInfoObject["agg_diss"].properties[map.getCurrentDemographics()]) === null) {

		agg_dissIcon = document.createElement('img');
		agg_dissIcon.classList.add("popupIcon");
		agg_dissIcon.src = "images/ndlegend.jpg";
		agg_dissIcon.style.borderBottom = "0.5px solid"

	}

	else {

		agg_dissIcon = document.createElement('i');
		agg_dissIcon.classList.add("popupIcon");
		agg_dissIcon.style.background = popupRamp[parseValue(clickInfoObject["agg_diss"].properties[map.getCurrentDemographics()])];
	}
	
	// ---------------------------------

	if (map.getBoundaryLevel() == "province") { 
		
		provIcon.style.outlineStyle = "solid"; 
		provIcon.style.outlineOffset = "-2px"; 
		provIcon.style.outlineColor = "cyan"; 
		provIcon.style.outlineWidth = "4px"; 
		provIcon.style.zIndex = "1000"; 
	}
	else if (map.getBoundaryLevel() == "c_div") { 

		c_divIcon.style.outlineStyle = "solid"; 
		c_divIcon.style.outlineOffset = "-2px"; 
		c_divIcon.style.outlineColor = "cyan"; 
		c_divIcon.style.outlineWidth = "4px"; 
		c_divIcon.style.zIndex = "1000";
	}
	else if (map.getBoundaryLevel() == "c_subdiv") { 

		c_subdivIcon.style.outlineStyle = "solid"; 
		c_subdivIcon.style.outlineOffset = "-2px"; 
		c_subdivIcon.style.outlineColor = "cyan"; 
		c_subdivIcon.style.outlineWidth = "4px"; 
		c_subdivIcon.style.zIndex = "1000";
	}
	else if (map.getBoundaryLevel() == "agg_diss") { 

		agg_dissIcon.style.outlineStyle = "solid"; 
		agg_dissIcon.style.outlineOffset = "-2px"; 
		agg_dissIcon.style.outlineColor = "cyan"; 
		agg_dissIcon.style.outlineWidth = "4px"; 
		agg_dissIcon.style.zIndex = "1000";
	}

	returnDiv.appendChild(titleBox);
	returnDiv.appendChild(agg_dissIcon);
	returnDiv.appendChild(agg_dissTextBox);
	returnDiv.appendChild(c_subdivIcon);
	returnDiv.appendChild(c_subdivTextBox);
	returnDiv.appendChild(c_divIcon);
	returnDiv.appendChild(c_divTextBox);
	returnDiv.appendChild(provIcon);
	returnDiv.appendChild(provTextBox);
	returnDiv.appendChild(natIcon);
	returnDiv.appendChild(natTextBox);
	
	return returnDiv;
}



	// --------------------------------------------------------
	// --------------------------------------------------------


//	Styling function for the facility points 
//	PARAM(S): 	feature = the current (single) point being styled
//				latlng = only used in/by the circleMarker function
const init_PL_pointStyle = (feature, latlng)  => {

	var radVal = 	feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.75) + feature.properties.emissions_min) ? 25 :
					feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.5) + feature.properties.emissions_min) ? 16 :
					feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.25) + feature.properties.emissions_min) ? 7.5 :
																																	2.5;

	var colorVal = 	feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.75) + feature.properties.emissions_min) ? pointColours[3] :
					feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.5) + feature.properties.emissions_min) ? pointColours[2] :
					feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.25) + feature.properties.emissions_min) ? pointColours[1] :
																																	pointColours[0];

	var opacity = feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.25) + feature.properties.emissions_min) ? 1 :
																																	0.75

	var fopacity = feature.properties.grand_tota >= ((feature.properties.emissions_max * 0.25) + feature.properties.emissions_min) ? 1 :
																																	0.5

	// https://leafletjs.com/reference.html#circlemarker
	return L.circleMarker(latlng, {

		radius: radVal,
		fillColor: colorVal,
		color: "#000000",
		weight: 0.5,
		opacity: opacity,
		fillOpacity: fopacity
	});
}

//	Styling function for the point-layer polygons (i.e. the red outline on boundaries that contain a point)
const init_PL_boundaryStyle = () => {

	return {

		fill: true,
		color: pointColour, 
		weight: 0.75,
		fillOpacity: 0
	}
}

//	Styling function for the "basemap" polygons (i.e. the user-changeable demographic choropleths)
const base_boundaryStyle = (feature) => {

	var styleObj = {

		color: "#A0A0A0",
		weight: 0.5,
	}

	var currentColours = map.getCurrentDemographics() == "lowinc" ? lowincColourRamp :
						 map.getCurrentDemographics() == "ind" 	  ? indColourRamp :
																	vmColourRamp;

	var tempVal = parseValue(feature.properties[map.getCurrentDemographics()]);

	var fopacity = map.getZoom() >= 10 ? 0.55 : 
										1

	if (tempVal !== null) {

		styleObj["fillColor"] = currentColours[tempVal];
		styleObj["fillPattern"] = null;
		styleObj.fillOpacity = fopacity;
	}

	//	Handling for polygons with no demographic information to display
	else {

		styleObj["fillPattern"] = ndStripes;
		styleObj.fillOpacity = fopacity;
	}

	return styleObj;
}

//	Styling function for the highlight polygons (i.e. the cyan boundary when a polygon gets clicked on)
const highlightPolygonStyle = (feature) => {

	return {

		fill: false,
		color: "cyan",
		weight: 3,
		opacity: 1
	}
}

//	Helper function for parsing values based on an equal-interval classification scheme
const parseValue = (value) => {

	return 	value > 102 	? null 	:
			value >= 80 	? 4		:
			value >= 60		? 3		:
			value >= 40 	? 2		:
			value >= 20 	? 1		:
			value >= 0 		? 0		:
						  	  null
}
