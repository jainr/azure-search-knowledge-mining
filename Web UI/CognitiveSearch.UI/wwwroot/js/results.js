// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

function Base64Decode(token) {
    if (token.length === 0) return null;
    // The last character in the token is the number of padding characters.
    var numberOfPaddingCharacters = token.slice(-1);
    // The Base64 string is the token without the last character.
    token = token.slice(0, -1);
    // '-'s are '+'s and '_'s are '/'s.
    token = token.replace(/-/g, '+');
    token = token.replace(/_/g, '/');
    // Pad the Base64 string out with '='s
    for (var i = 0; i < numberOfPaddingCharacters; i++)
        token += "=";
    return atob(token);
}

function GetResultsMapsHTML() {
    var mapsContainerHTML = '';
    mapsContainerHTML += '<div id="myMap" style="height:400px" ></div>';

    // Buttons to enable setting and resetting search polygon
    mapsContainerHTML += '<div style="position:absolute;top:50px;left:50px;">';
    mapsContainerHTML += '    <input type="button" value="Set Search Polygon" onclick="drawingTools.startDrawing();" />';
    mapsContainerHTML += '    <input type="button" value="Clear Search Polygon" onclick="drawingTools.clear();" />';
    mapsContainerHTML += '</div>';

    return mapsContainerHTML;
}

//  Authenticates the map and shows some locations.
function AuthenticateResultsMap(results) {
    $.post('/home/getmapcredentials', {},
        function (data) {

            if (data.mapKey === null || data.mapKey === "") {
                showMap = false;
                return;
            }

            var mapsContainerHTML = GetResultsMapsHTML();
            $('#maps-viewer').html(mapsContainerHTML);

            // default map coordinates
            var coordinates = [-122.32, 47.60];

            // Authenticate the map using the key 
            resultsMap = new atlas.Map('myMap', {
                autoResize: true,
                renderWorldCopies: true,
                center: coordinates,
                visibility: "visible",
                zoom: 1.42,
                minZoom: 1.42,
                width: "500px",
                height: "500px",
                style: "road_shaded_relief",
                language: 'en-US',
                authOptions: {
                    authType: 'subscriptionKey',
                    subscriptionKey: data.mapKey
                }
            });

            //Wait until the map resources are ready.
            resultsMap.events.add('ready', function () {

                /* Construct a zoom control*/
                var zoomControl = new atlas.control.ZoomControl();

                /* Add the zoom control to the map*/
                resultsMap.controls.add(zoomControl, {
                    position: "bottom-right"
                });
            });

            AddMapPoints(results);

            return;
        });
    return;
}

// Adds map points and re-centers the map based on results
function AddMapPoints(results) {
    var coordinates;

    if (mapDataSource !== null) {
        // clear the data source, add new POIs and re-center the map
        mapDataSource.clear();
        coordinates = UpdatePOIs(results, mapDataSource);
        if (coordinates) {
            resultsMap.setCamera({ center: coordinates });
        }
    }
    else {
        //Create a data source to add it to the map 
        mapDataSource = new atlas.source.DataSource(null, {
            cluster: true,
            clusterRadius: 45,
            clusterMaxZoom: 15
        });
        coordinates = UpdatePOIs(results, mapDataSource);

        //Wait until the map resources are ready for first set up.
        resultsMap.events.add('ready', function () {
            resultsMap.imageSprite.add('bubble-icon', '../images/single_bubble.png');

            //take the last coordinates.
            if (coordinates) { resultsMap.setCamera({ center: coordinates }); }

            //Add data source and create a symbol layer.
            resultsMap.sources.add(mapDataSource);

            //Create a bubble layer for rendering clustered data points.
            var clusterBubbleLayer = new atlas.layer.BubbleLayer(mapDataSource, null, {
                opacity: 0.7,
                radius: [
                    'interpolate',
                    ['linear'],
                    ['get', 'point_count'],
                    2, 10,
                    50, 35,
                ],

                color: [
                    'interpolate',
                    ['linear'],
                    ['get', 'point_count'],
                    0, 'rgba(255, 108, 92, 1)',
                    50, 'rgba(255, 108, 92, 1)',
                    100, 'rgba(255, 108, 92, 1)'
                ],

                strokeWidth: 0,
                filter: ['has', 'point_count']
            });

            var symbolLayer = new atlas.layer.SymbolLayer(mapDataSource, null, {
                iconOptions: {
                    image: 'bubble-icon',
                    size: 0.3
                },
                textOptions: {
                    offset: [0, -.33]
                },
                filter: ['!', ['has', 'point_count']]
            });

            var symbolLayer2 = new atlas.layer.SymbolLayer(mapDataSource, null, {
                iconOptions: {
                    image: 'none'
                }
            });

            resultsMap.layers.add([
                clusterBubbleLayer,
                symbolLayer2,
                symbolLayer
            ]);

            clusterPopup = new atlas.Popup({
                pixelOffset: [0, 0],
                closeButton: false
            });

            resultsMap.events.add('mouseenter', symbolLayer2, function (e) {
                //alert(Object.keys(e.shapes[0].properties));
                symbolLayer2.setOptions({
                    textOptions: {
                        textField: ['get', 'point_count_abbreviated'],
                        offset: [0, 0.4], 
                        opacity: 1
                    }
                });

            });

            resultsMap.events.add('mouseleave', clusterBubbleLayer, function (e) {
                symbolLayer2.setOptions({
                    textOptions: {
                        textField: ['get', 'point_count_abbreviated'],
                        offset: [0, 0.4],
                        opacity: 0
                    }
                });
            });

            //Create a popup but leave it closed so we can update it and display it later.
            popup = new atlas.Popup({
                pixelOffset: [0, -18],
                closeButton: false
            });

            //Add a hover event to the symbol layer.
            resultsMap.events.add('click', symbolLayer, function (e) {
                //Make sure that the point exists.
                if (e.shapes && e.shapes.length > 0) {
                    var content, coordinate;
                    var properties = e.shapes[0].getProperties();
                    var id = properties.id;
                    var popupTemplate = `<div class="customInfobox">
                                         <div class="name" onclick="ShowDocument('${id}');" >{name}</div>
                                         <div onclick="ShowDocument('${id}');">{description}</div>
                                         </div>`;
                    content = popupTemplate.replace(/{name}/g, properties.name).replace(/{description}/g, properties.description);
                    coordinate = e.shapes[0].getCoordinates();

                    popup.setOptions({
                        //Update the content of the popup.
                        content: content,

                        //Update the popup's position with the symbol's coordinate.
                        position: coordinate

                    });

                    if (popup.isOpen() !== true) {
                        //Open the popup.
                        popup.open(resultsMap);
                    }
                    else {
                        popup.close();
                    }
                }
            });

            drawingTools = new PolygonDrawingTool(resultsMap, null, function (polygon) {
                //Do something with the polygon.
                mapPolygon = polygon;
            });
        });

        // This is necessary for the map to resize correctly after the 
        // map is actually in view.
        $('#maps-pivot-link').on("click", function () {
            window.setTimeout(function () {
                map.map.resize();
            }, 100);
        });
    }
}

function UpdatePOIs(results, dataSource) {
    var coordinates;
    for (var i = 0; i < results.length; i++) {
        var result = results[i].document;
        var latlon = result.geoLocation;
        if (latlon !== null) {
            if (latlon.isEmpty === false) {
                coordinates = [latlon.longitude, latlon.latitude];
                //Add the symbol to the data source.
                dataSource.add(new atlas.data.Feature(new atlas.data.Point(coordinates), {
                    name: result.metadata_storage_name,
                    description: "Learn more...",
                    id: result.metadata_storage_path
                }));
            }
        }
    }

    return coordinates;
}

function UpdateMap(data) {
    if (showMap === true) {
        if (resultsMap === null) {
            // Create the map
            AuthenticateResultsMap(data.results);
        }
        else {
            AddMapPoints(results);
        }
    }
}

function UpdateResults(data) {
    var resultsHtml = '';

    $("#doc-count").html(` Available Results: ${data.count}`);



    for (var i = 0; i < data.results.length; i++) {

        var result = data.results[i].document;
        var searchScore = "@search.score";
        var score = data.results[i]["@search.score"];
        score = score.toFixed(2);
        var name;
        var title;

        result.idx = i;
        //gets document by this field ShowDocument (id)
        var id = result[data.idField];

        var tags = GetTagsHTML(result);
        var path;
        

        // get path
        //Path of img / pdf / etc
        //decodes the path and adds access token.
        if (data.isPathBase64Encoded) {
            path = Base64Decode(result.metadata_storage_path) + token;
        }
        else {
            path = result.metadata_storage_path + token;
        }
        //gets name of file
        //result.metadata_storage_name = filname.pdf or filename.jpg
        if (result["metadata_storage_name"] !== undefined) {
            name = result.metadata_storage_name.split(".")[0];
        }
        //this is none existant on azure
        if (result["metadata_title"] !== undefined && result["metadata_title"] !== null) {
            title = result.metadata_title;
        }
        else {
            // Bring up the name to the top
            title = name;
            name = "";
        }

        var thumbnail_size_ext = "_300xN.jpg";
        var thumbnail_path = "https://kmogstorage.blob.core.windows.net/kmdocument/THUMBNAILS/";
        var filename = result.metadata_storage_name.split(".")[0];
        var thumb_path = thumbnail_path + filename + thumbnail_size_ext + token;

        if (path !== null) {
            var classList = "results-div ";
            if (i === 0) classList += "results-sizer";

            var pathLower = path.toLowerCase();
            //sets result for images
            if (pathLower.includes(".jpg") || pathLower.includes(".png")) {
                resultsHtml += `<div class="${classList}" onclick="ShowDocument('${id}');">
                                    <div class="search-result">
                                        <img class="img-result" style='max-width:100%;' src="${path}"/>
                                        <div class="results-header">
                                            <h4>${name}</h4>
                                        </div>
                                        <div>${tags}</div>
                                    </div>
                                </div>`;
            }
            //sets results for .mp3
            else if (pathLower.includes(".mp3")) {
                resultsHtml += `<div class="${classList}" onclick="ShowDocument('${id}');">
                                    <div class="search-result">
                                        <div class="audio-result-div">
                                            <audio controls>
                                                <source src="${path}" type="audio/mp3">
                                                Your browser does not support the audio tag.
                                            </audio>
                                        </div>
                                        <div class="results-header">
                                            <h4>${name}</h4>
                                        </div>
                                        <div>${tags}</div>                               
                                    </div>
                                </div>`;
            }
                //sets path for .mp4
            else if (pathLower.includes(".mp4")) {
                resultsHtml += `<div class="${classList}" onclick="ShowDocument('${id}');">
                                    <div class="search-result">
                                        <div class="video-result-div">
                                            <video controls class="video-result">
                                                <source src="${path}" type="video/mp4">
                                                Your browser does not support the video tag.
                                            </video>
                                        </div>
                                        <hr />
                                        <div class="results-header">
                                            <h4>${name}</h4>
                                        </div>
                                        <div>${tags}</div>                                 
                                    </div>
                                </div>`;
            }
            else {
                var icon = " ms-Icon--Page";
                //pdf icon class ref "magic"
                if (pathLower.includes(".pdf")) {
                    icon = "ms-Icon--PDF";
                }
                else if (pathLower.includes(".htm")) {
                    icon = "ms-Icon--FileHTML";
                }
                else if (pathLower.includes(".xml")) {
                    icon = "ms-Icon--FileCode";
                }
                else if (pathLower.includes(".doc")) {
                    icon = "ms-Icon--WordDocument";
                }
                else if (pathLower.includes(".ppt")) {
                    icon = "ms-Icon--PowerPointDocument";
                }
                else if (pathLower.includes(".xls")) {
                    icon = "ms-Icon--ExcelDocument";
                }
                //creates html results for icons
                //icon        <i class="html-icon ms-Icon ${icon}"></i>
                resultsHtml += `<div class="${classList}" onclick="ShowDocument('${id}');">
                                    <div class="search-result">
                                       <div class="results-icon col-md-2">
                                            <div class="ms-CommandButton-icon">
                                                <img style='max-width:95%;' src="${thumb_path}" alt="${icon}"/>
                                            </div>
                                        </div>
                                        <div class="results-body col-md-10">
                                            <h4>${title}</h4>
                                            <h5>${name}</h5>
                                            <div style="margin-top:10px;">${tags}</div>
                                            <div>Score: ${score}</div>
                                        </div>
                                    </div>
                                </div>`;
            }
        }
        else {
            resultsHtml += `<div class="${classList}" );">
                                    <div class="search-result">
                                        <div class="results-header">
                                            <h4>Could not get metadata_storage_path for this result.</h4>
                                        </div>
                                    </div>
                                </div>`;
        }
    }

    $("#doc-details-div").html(resultsHtml);
}