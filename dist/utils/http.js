"use strict";
/**
 * Performs an HTTP GET request to fetch HTML content from the given URL.
 * - Adds sensible default headers (User-Agent, Accept)
 * - Uses muteHttpExceptions so HTTP errors dont throw
 * - Logs timing and status via AppLogger
 * - Returns a structured FetchHtmlResult
 */
function fetchHtml(url, requestOptions, actionName) {
    if (actionName === void 0) { actionName = 'fetchHtml'; }
    // Trim the URL and handles empty input
    var rawUrl = url ? url.trim() : '';
    if (!rawUrl) {
        AppLogger.warn(actionName, 'Empty URL passed to fetchHtml');
        return {
            ok: false,
            statusCode: 0,
            url: '',
            content: '',
            headers: {},
        };
    }
    // Bot behaves like a normal browser client (declearing bot for transparency)
    var defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (compatible; StartupScoutingBot/1.0; +https://paprika.social)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
    // Merge headers (starts from defaultHeaders and accepts modifications via requestOptions)
    var mergedHeaders = Object.assign({}, defaultHeaders, (requestOptions && requestOptions.headers) || {});
    // Builds default fetch options for GET requests
    var defaultOptions = {
        muteHttpExceptions: true, // avoid blow ups
        followRedirects: true,
        validateHttpsCertificates: true,
        headers: mergedHeaders
    };
    // Merge caller options into defaults
    var options = Object.assign({}, defaultOptions, requestOptions || {}, { headers: mergedHeaders });
    try {
        var start = new Date().getTime();
        var response = UrlFetchApp.fetch(rawUrl, options);
        var end = new Date().getTime();
        var statusCode = response.getResponseCode();
        var content = response.getContentText() || '';
        var headers = response.getHeaders();
        var ok = statusCode >= 200 && statusCode < 300;
        AppLogger.info(actionName, "Fetched ".concat(rawUrl), { statusCode: statusCode, durationMs: end - start });
        return {
            ok: ok,
            statusCode: statusCode,
            url: rawUrl,
            content: content,
            headers: headers,
        };
    }
    catch (e) {
        // Catch errors like DNS failure, network down, App Script timeout, ...
        AppLogger.error(actionName, "Exception while fetching ".concat(rawUrl), e);
        return {
            ok: false,
            statusCode: -1,
            url: rawUrl,
            content: '',
            headers: {}
        };
    }
}
/**
 * Reads the SerpAPI key from the Script Properties, returns null if not set.
 */
function getSerpApiKey() {
    var props = PropertiesService.getScriptProperties();
    var key = (props.getProperty('SERP_API_KEY') || '').trim();
    return key || null;
}
