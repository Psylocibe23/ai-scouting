"use strict";
/**
 * Removes html tags from a string and normalizes whitespaces.
 */
function stripHtml(html) {
    if (!html) {
        return '';
    }
    // Remove all tags
    var text = html.replace(/<[^>]*>/g, ' ');
    text = text
        // basic entities
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&apos;/gi, "'")
        // smart quotes
        .replace(/&lsquo;/gi, "'")
        .replace(/&rsquo;/gi, "'")
        .replace(/&ldquo;/gi, '"')
        .replace(/&rdquo;/gi, '"')
        // punctuation
        .replace(/&hellip;/gi, '...')
        .replace(/&ndash;/gi, '-')
        .replace(/&mdash;/gi, '-')
        // currencies
        .replace(/&euro;/gi, '€')
        .replace(/&pound;/gi, '£');
    // Collapse multiple whitespace into single spaces and trim
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}
/**
 * Extracts basic metadata (title and description) from HTML document.
 */
function extractPageMeta(html) {
    if (!html) {
        return {};
    }
    var title;
    var description;
    // Extracts <title>....</title>
    var titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
        title = stripHtml(titleMatch[1]);
        if (title === '') {
            title = undefined;
        }
    }
    // Fallback: <meta property="og:title" ...>
    if (!title) {
        var ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
            title = stripHtml(ogTitleMatch[1]);
        }
    }
    // Extract <meta name="description" content="...">
    var metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (metaDescMatch && metaDescMatch[1]) {
        description = stripHtml(metaDescMatch[1]);
    }
    // Fallback: <meta property="og:description" ...>
    if (!description) {
        var ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (ogDescMatch && ogDescMatch[1]) {
            description = stripHtml(ogDescMatch[1]);
        }
    }
    var result = {};
    if (title) {
        result.title = title;
    }
    if (description) {
        result.description = description;
    }
    return result;
}
/**
 * Extracts the first <h1>...</h1> heading from the HTML, if present.
 */
function extractMainHeading(html) {
    if (!html) {
        return undefined;
    }
    var h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
        var h1Text = stripHtml(h1Match[1]);
        return h1Text !== '' ? h1Text : undefined;
    }
    return undefined;
}
