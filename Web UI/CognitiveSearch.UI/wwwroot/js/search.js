﻿// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Initialize global properties
var q, sortType, tempdata, instrumentationKey;
var results = [];
var facets = [];
var selectedFacets = [];
var token = "";
var currentPage = 1;
var searchId;
var searchServiceName = "";
var indexName = "";
var scoringProfile = "";
var resultsMap = null;
var mapDataSource = null;
var showMap = true;

// variables related to polygon selection on map
var drawingTools;
var mapPolygon = null;

// When 'Enter' clicked from Search Box, execute Search()
$("#q").keyup(function (e) {
    if (e.keyCode === 13) {
        // Search();
        window[searchmethod]();
    }
});
$("#transcript-search-input").keyup(function (e) {
    if (e.keyCode === 13) {
        SearchTranscript($('#transcript-search-input').val());
    }
});
// Search with query and facets
function Search() {
    $('#loading-indicator').show();

    if (currentPage > 1) {
        if (q != $("#q").val()) {
            currentPage = 1;
        }
    }
    q = $("#q").val();


    //Pass the polygon filter to the query: mapPolygon.data.geometry.coordinates[0][1]
    var polygonString = "";

    if (mapPolygon !== null && mapPolygon.data !== null && mapPolygon.data.geometry !== null && mapPolygon.data.geometry.coordinates !== null)
    {
        var pointArray = mapPolygon.data.geometry.coordinates[0];

        for (var i = 0; i < pointArray.length; i++)
        {            
            if (polygonString.length > 0)
            { polygonString += ","; }

            polygonString += pointArray[i][0] + " " + pointArray[i][1];
        }
    }

    // Get center of map to use to score the search results
    $.post('/home/getdocuments',
        {
            q: q !== undefined ? q : "*",
            searchFacets: selectedFacets,
            currentPage: currentPage,
            polygonString: polygonString
        },
        function (data) {
            $('#loading-indicator').css("display", "none");
            Update(data);
        });
}

function Update(data) {
    results = data.results;
    facets = data.facets;
    tags = data.tags;
    token = data.token;
    mapresults = data.mapresults;

    searchId = data.searchId;

    //Facets
    UpdateFacets();

    //Results List
    UpdateResults(data);

    //Map
    UpdateMap(data);

    //Pagination
    UpdatePagination(data.count);

    // Log Search Events
    LogSearchAnalytics(data.count);

    //Filters
    UpdateFilterReset();

    InitLayout();

    $('html, body').animate({ scrollTop: 0 }, 'fast');

    FabricInit();
}

function UpdatePagination(docCount) {
    var totalPages = Math.round(docCount / 20);
    // Set a max of 5 items and set the current page in middle of pages
    var startPage = currentPage;

    var maxPage = startPage + 5;
    if (totalPages < maxPage)
        maxPage = totalPages + 1;
    var backPage = parseInt(currentPage) - 1;
    if (backPage < 1)
        backPage = 1;
    var forwardPage = parseInt(currentPage) + 1;

    var htmlString = "";
    if (currentPage > 1) {
        htmlString = `<li><a href="javascript:void(0)" onclick="GoToPage('${backPage}')" class="ms-Icon ms-Icon--ChevronLeftMed" style="display:inline-block; font-size:100%; margin: -1px 0px 0px 0px;"></a></li>`;
    }

    htmlString += '<li class="active"><a href="#">' + currentPage + '</a></li>';

    if (currentPage <= totalPages) {
        htmlString += `<li><a href="javascript:void(0)" onclick="GoToPage('${forwardPage}')" class="ms-Icon ms-Icon--ChevronRightMed" style="display: inline-block; font-size: 100%; margin: -1px 0px 0px 0px;"></a></li>`;
    }
    $("#pagination").html(htmlString);
    $("#paginationFooter").html(htmlString);
}

function GoToPage(page) {
    currentPage = page;
    if (window.location.pathname.indexOf("/Search") !== -1) {
        Search();
    } else {
        ImagesSearch();
    }
}

function SampleSearch(text) {
    $('#index-search-input').val(text);
    $('#index-search-submit').click();
}

// Search with query and facets
function ImagesSearch() {
    $('#loading-indicator').show();

    if (currentPage > 1) {
        if (q != $("#q").val()) {
            currentPage = 1;
        }
    }
    q = $("#q").val();


    //Pass the polygon filter to the query: mapPolygon.data.geometry.coordinates[0][1]
    var polygonString = "";

    if (mapPolygon !== null && mapPolygon.data !== null && mapPolygon.data.geometry !== null && mapPolygon.data.geometry.coordinates !== null)
    {
        var pointArray = mapPolygon.data.geometry.coordinates[0];

        for (var i = 0; i < pointArray.length; i++)
        {            
            if (polygonString.length > 0)
            { polygonString += ","; }

            polygonString += pointArray[i][0] + " " + pointArray[i][1];
        }
    }

    // Get center of map to use to score the search results
    $.post('/home/getimages',
        {
            q: q !== undefined ? q : "*",
            searchFacets: selectedFacets,
            currentPage: currentPage
        },
        function (data) {
            $('#loading-indicator').css("display", "none");
            ImagesUpdate(data, currentPage);
        });
}
function ImagesUpdate(data) {
    results = data.results;
    facets = data.facets;
    tags = data.tags;
    token = data.token;
    searchId = data.searchId;

    //Facets
    UpdateFacets();
    // UpdateDocCount(data);
    //Results List
    UpdateImagesResults(data, currentPage);
    //Pagination
    UpdatePagination(data.count);
    // Log Search Events
    LogSearchAnalytics(data.count);
    //Filters
    UpdateFilterReset();

    InitLayout();

    $('html, body').animate({ scrollTop: 0 }, 'fast');

    FabricInit();
}
