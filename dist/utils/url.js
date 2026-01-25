"use strict";
/**
 * Normalizes a URL so it can be used as a stable identifier:
 * - trims white spaces
 * - default to https://
 * - lower case
 * - removes trailing slash from the path (except root)
 * - if input empty or invalid returns an empty string.
 */
function normalizeUrl(rawUrl) {
    if (!rawUrl) {
        return '';
    }
    var trimmed = rawUrl.trim();
    if (trimmed === '') {
        return '';
    }
    // Ensure we have http/https; default to https if missing
    var urlStr = trimmed;
    if (!/^https?:\/\//i.test(urlStr)) {
        urlStr = 'https://' + urlStr;
    }
    // URL parser using regex 
    var match = urlStr.match(/^(https?):\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i);
    if (!match) {
        // Fallback: lowercase + remove trailing slashes
        return urlStr.trim().toLowerCase().replace(/\/+$/, '');
    }
    var protocol = match[1]; // http or https
    var host = match[2];
    var path = match[3];
    var query = match[4] || '';
    var hash = match[5] || '';
    protocol = protocol.toLowerCase();
    host = host.toLowerCase();
    // Normalize host by stripping leading "www."
    host = host.replace(/^www\./, '');
    // Normalize path: default to "/", remove trailing slashes
    if (!path || path === '') {
        path = '/';
    }
    path = path.replace(/\/+$/, '');
    if (path === '') {
        path = '/';
    }
    return "".concat(protocol, "://").concat(host).concat(path).concat(query).concat(hash);
}
/**
 * Returns True if two URL strings represent the same website after normalization.
 */
function areSameWebsite(a, b) {
    var na = normalizeUrl(a);
    var nb = normalizeUrl(b);
    // return false if both URLs are empty
    if (!na || !nb) {
        return false;
    }
    return na === nb;
}
/**
 * Extract Host name.
 */
function getHostName(url) {
    if (!url)
        return null;
    var m = url.match(/^https?:\/\/([^\/?#]+)/i);
    if (!m || !m[1])
        return null;
    return m[1].toLowerCase();
}
/**
 * Returns true if an url is likely an internal link (same hostname or subdomain).
 */
function isInternalLink(baseUrl, candidateUrl) {
    var baseHost = getHostName(baseUrl);
    var candidateHost = getHostName(candidateUrl);
    if (!baseHost || !candidateHost)
        return false;
    if (candidateHost === baseHost)
        return true;
    // Accept subdomains: e.g. demo.seedcamp.com for seedcamp.com.
    if (candidateHost.endsWith('.' + baseHost))
        return true;
    return false;
}
