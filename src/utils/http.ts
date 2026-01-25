interface FetchHtmlResult {
    ok: boolean; // true if status code in [200, 299]
    statusCode: number; // HTTP status code (or -1 on exception)
    url: string;
    content: string;
    headers: {[key: string]: string}; // response headers
}

/**
 * Performs an HTTP GET request to fetch HTML content from the given URL.
 * - Adds sensible default headers (User-Agent, Accept)
 * - Uses muteHttpExceptions so HTTP errors dont throw
 * - Logs timing and status via AppLogger
 * - Returns a structured FetchHtmlResult 
 */
function fetchHtml(url: string, requestOptions?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions, actionName: string = 'fetchHtml'): FetchHtmlResult {
    // Trim the URL and handles empty input
    const rawUrl = url ? url.trim(): '';
    
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
    const defaultHeaders: { [key: string]: string} = {
        'User-Agent': 'Mozilla/5.0 (compatible; StartupScoutingBot/1.0; +https://paprika.social)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    // Merge headers (starts from defaultHeaders and accepts modifications via requestOptions)
    const mergedHeaders: { [key: string]: string} = Object.assign(
        {}, defaultHeaders, (requestOptions && (requestOptions.headers as { [key: string]: string})) || {}
    );

    // Builds default fetch options for GET requests
    const defaultOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        muteHttpExceptions: true, // avoid blow ups
        followRedirects: true,
        validateHttpsCertificates: true,
        headers: mergedHeaders
    };

    // Merge caller options into defaults
    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions =
    Object.assign({}, defaultOptions, requestOptions || {}, {headers: mergedHeaders});

    try {
        const start = new Date().getTime();
        const response = UrlFetchApp.fetch(rawUrl, options);
        const end = new Date().getTime();

        const statusCode = response.getResponseCode();
        const content = response.getContentText() || '';
        const headers = response.getHeaders() as { [key: string]: string};
        const ok = statusCode >= 200 && statusCode < 300;

        AppLogger.info(actionName, `Fetched ${rawUrl}`, {statusCode, durationMs: end - start});

        return {
            ok,
            statusCode,
            url: rawUrl,
            content,
            headers,
        };

    } catch (e) {
        // Catch errors like DNS failure, network down, App Script timeout, ...
        AppLogger.error(actionName, `Exception while fetching ${rawUrl}`, e);

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
function getSerpApiKey(): string | null {
    const props = PropertiesService.getScriptProperties();
    const key = (props.getProperty('SERP_API_KEY') || '').trim();
    return key || null;
}