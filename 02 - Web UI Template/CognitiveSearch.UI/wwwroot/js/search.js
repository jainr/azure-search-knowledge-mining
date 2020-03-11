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

// When 'Enter' clicked from Search Box, execute Search()
$("#q").keyup(function (e) {
    if (e.keyCode === 13) {
        Search();
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

    // Get center of map to use to score the search results
    $.post('/home/searchview',
        {
            q: q,
            searchFacets: selectedFacets,
            currentPage: currentPage
        },
        function (viewModel) {
            $('#loading-indicator').css("display", "none");
            Update(viewModel);
        });
}

function Update(viewModel) {

    // Update UI controls to match view model incase we came from a direct link
    selectedFacets = viewModel.selectedFacets;
    $("#q").val(viewModel.query);
    currentPage = viewModel.currentPage;

    var data = viewModel.documentResult;
    results = data.results;
    facets = data.facets;
    tags = data.tags;
    token = data.token;

    searchId = data.searchId;

    //Facets
    UpdateFacets();

    //Results List
    UpdateResults(data);

    //Pagination
    UpdatePagination(data.count);

    // Log Search Events
    LogSearchAnalytics(data.count);

    //Filters
    UpdateFilterReset();

    InitLayout();

    UpdateLocationBar(viewModel);

    $('html, body').animate({ scrollTop: 0 }, 'fast');

    FabricInit();
}

function UpdateLocationBar(viewModel) {
    // Try to update the location to match the search.
    if (history.pushState) {
        // Get the existing url
        var searchParams = new URLSearchParams(window.location.search);

        var facetStrings = [];
        var includeFacetsInUrl = true;
        if (includeFacetsInUrl) {
            // Concatenate facet keys.
            for (var s of selectedFacets)
                for (var f of s.value)
                    facetStrings.push(s.key + "_" + f);
        }

        // Update or clear facets
        if (facetStrings.length)
            searchParams.set("facets", facetStrings.join(","));
        else
            searchParams.delete("facets");

        // Add other parameters
        searchParams.set("q", viewModel.query);

        if (viewModel.currentPage > 1)
            searchParams.set("page", viewModel.currentPage);
        else
            searchParams.delete("page");

        //  Using history instead of location so it doesnt cause a redirect.
        var paramsStr = "?" + searchParams.toString();
        var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + paramsStr;
        window.history.pushState({ path: newurl }, '', newurl);
    }
}

function UpdatePagination(docCount) {
    var totalPages = Math.round(docCount / 10);
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
        htmlString = `<li><a href="javascript:void(0)" onclick="GoToPage('${backPage}')" class="ms-Icon ms-Icon--ChevronLeftMed"></a></li>`;
    }

    htmlString += '<li class="active"><a href="#">' + currentPage + '</a></li>';

    if (currentPage <= totalPages) {
        htmlString += `<li><a href="javascript:void(0)" onclick="GoToPage('${forwardPage}')" class="ms-Icon ms-Icon--ChevronRightMed"></a></li>`;
    }
    $("#pagination").html(htmlString);
    $("#paginationFooter").html(htmlString);
}

function GoToPage(page) {
    currentPage = page;
    Search();
}

function SampleSearch(text) {
    $('#index-search-input').val(text);
    $('#index-search-submit').click();
}

