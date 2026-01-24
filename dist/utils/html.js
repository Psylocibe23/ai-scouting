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
 * Simple text white space normalization.
 */
function normalizeTextSpaces(text) {
    if (!text)
        return '';
    return text.replace(/\s+/g, ' ').trim();
}
/**
 * Extracts basic metadata (title and description) from HTML document.
 */
function extractPageMeta(html, actionName) {
    if (actionName === void 0) { actionName = 'extractPageMeta'; }
    if (!html) {
        return {};
    }
    var title;
    var description;
    // Cheerio parsing
    try {
        var $ = Cheerio.load(html);
        // Extract title or og:title
        var rawTitle = $('head > title').first().text() ||
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="og:title"]').attr('content');
        if (rawTitle) {
            var t = normalizeTextSpaces(rawTitle);
            if (t) {
                title = t;
            }
        }
        // Extract description or og:description
        var rawDesc = $('meta[name="description"]').attr('content') ||
            $('meta[name="og:description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content');
        if (rawDesc) {
            var d = normalizeTextSpaces(rawDesc);
            if (d) {
                description = d;
            }
        }
    }
    catch (e) {
        AppLogger.error(actionName, 'Cheerio failed in extractPageMeta, falling back to regex', e);
    }
    // Regex fallback if Cheerio fails parsing.
    if (!title) {
        var titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            var t = stripHtml(titleMatch[1]);
            if (t !== '') {
                title = t;
            }
        }
    }
    if (!title) {
        var ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
            var t = stripHtml(ogTitleMatch[1]);
            if (t !== '') {
                title = t;
            }
        }
    }
    if (!description) {
        var metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (metaDescMatch && metaDescMatch[1]) {
            var d = stripHtml(metaDescMatch[1]);
            if (d !== '') {
                description = d;
            }
        }
    }
    if (!description) {
        var ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (ogDescMatch && ogDescMatch[1]) {
            var d = stripHtml(ogDescMatch[1]);
            if (d !== '') {
                description = d;
            }
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
function extractMainHeading(html, actionName) {
    if (actionName === void 0) { actionName = 'extractMainHeading'; }
    if (!html) {
        return undefined;
    }
    try {
        var $ = Cheerio.load(html);
        // Try common “main” locations first, then fallback to first <h1>.
        var candidates = [
            $('main h1').first().text(),
            $('header h1').first().text(),
            $('h1').first().text(),
        ];
        for (var i = 0; i < candidates.length; i++) {
            var raw = candidates[i];
            if (raw) {
                var h = normalizeTextSpaces(raw);
                if (h)
                    return h;
            }
        }
    }
    catch (e) {
        AppLogger.error(actionName, 'Cheerio failed in extractMainHeading, falling back to regex', e);
    }
    // Regex fallback 
    var h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && h1Match[1]) {
        var h1Text = stripHtml(h1Match[1]);
        return h1Text !== '' ? h1Text : undefined;
    }
    return undefined;
}
/**
 * Extract <h2>...</h2> headings from the HTML, if present.
 */
function extractH2Headings(html, actionName) {
    if (actionName === void 0) { actionName = 'extractH2Headings'; }
    var result = [];
    if (!html)
        return result;
    try {
        var $_1 = Cheerio.load(html);
        $_1('h2').each(function (_, el) {
            var text = normalizeTextSpaces($_1(el).text() || '');
            if (text) {
                result.push(text);
            }
        });
    }
    catch (e) {
        AppLogger.error(actionName, 'Cheerio error in extractH2Headings', e);
    }
    return result;
}
/**
 * Extract <h3>...</h3> headings from the HTML, if present.
 */
function extractH3Headings(html, actionName) {
    if (actionName === void 0) { actionName = 'extractH3Headings'; }
    var result = [];
    if (!html)
        return result;
    try {
        var $_2 = Cheerio.load(html);
        $_2('h3').each(function (_, el) {
            var text = normalizeTextSpaces($_2(el).text() || '');
            if (text) {
                result.push(text);
            }
        });
    }
    catch (e) {
        AppLogger.error(actionName, 'Cheerio error in extractAllH3Headings', e);
    }
    return result;
}
/**
 * Extracts visible text from the footer (or footer-like) section.
 */
function extractFooterText(html, actionName) {
    if (actionName === void 0) { actionName = 'extractFooterText'; }
    if (!html)
        return '';
    try {
        var $ = Cheerio.load(html);
        // Primary: <footer> tag
        var footerText = normalizeTextSpaces($('footer').text() || '');
        // Fallback: elements whose id/class contains "footer"
        if (!footerText) {
            var fallback = $('div[id*="footer"], section[id*="footer"], div[class*="footer"], section[class*="footer"]')
                .first()
                .text();
            footerText = normalizeTextSpaces(fallback || '');
        }
        // Truncate to avoid insane length (2000 chars default)
        var MAX_LEN = 2000;
        if (footerText.length > MAX_LEN) {
            footerText = footerText.slice(0, MAX_LEN);
        }
        return footerText;
    }
    catch (e) {
        AppLogger.error(actionName, 'Cheerio error in extractFooterText', e);
        return '';
    }
}
function resolveUrl(baseUrl, href) {
    var trimmedHref = href.trim();
    if (!trimmedHref)
        return '';
    if (/^https?:\/\//i.test(trimmedHref)) {
        return trimmedHref;
    }
    // Extract origin (protocol + host).
    var originMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/i);
    var origin = originMatch ? originMatch[1] : baseUrl;
    if (trimmedHref.startsWith('/')) {
        return origin + trimmedHref;
    }
    // Remove any query/fragment from base and last segment.
    var baseWithoutQuery = baseUrl.split(/[?#]/)[0];
    var lastSlashIndex = baseWithoutQuery.lastIndexOf('/');
    var basePath = lastSlashIndex > 'https://x'.length - 1 ? baseWithoutQuery.slice(0, lastSlashIndex + 1) : origin + '/';
    return basePath + trimmedHref;
}
/**
 * Extracts links from footer and returns absolute URLs plus visible link text.
 */
function extractFooterLinks(html, baseUrl, actionName) {
    if (actionName === void 0) { actionName = 'extractFooterLinks'; }
    var links = [];
    if (!html)
        return links;
    try {
        var $_3 = Cheerio.load(html);
        var $anchors = $_3('footer a[href]');
        // Fallback: if no footer scan all <a>.
        if ($anchors.length === 0) {
            $anchors = $_3('a[href]');
        }
        $anchors.each(function (_, el) {
            var hrefAttr = $_3(el).attr('href') || '';
            var text = normalizeTextSpaces($_3(el).text() || '');
            if (!hrefAttr)
                return;
            var absoluteHref = resolveUrl(baseUrl, hrefAttr);
            if (!absoluteHref)
                return;
            // Skip mailto / tel for the demo.
            if (/^mailto:|^tel:/i.test(absoluteHref))
                return;
            links.push({ href: absoluteHref, text: text });
        });
    }
    catch (e) {
        AppLogger.error(actionName, 'Cheerio error while extracting footer links', e);
    }
    return links;
}
function classifyAuxLinks(links) {
    var result = {};
    links.forEach(function (link) {
        var label = (link.text + ' ' + link.href).toLowerCase();
        if (!result.policies && /(privacy policies?|privacy policy|privacy|data protection|gdpr|polic(?:y|ies))/i.test(label)) {
            result.policies = link.href;
            return;
        }
        if (!result.cookies && /cookie/.test(label)) {
            result.cookies = link.href;
            return;
        }
        if (!result.about && /(about|who we are|about us|imprint|legal|company info)/.test(label)) {
            result.about = link.href;
            return;
        }
    });
    return result;
}
/**
 * Orchestrator that builds a rich, LLM-ready context from base pages:
 * - extracts title, description, h1, all h2, all h3, footer text from main page
 * - finds footer links and classify them (policies, cookies, about)
 * - fetches those auxiliary pages (if any) and repeats extraction
 * - merges everything into a single combined string.
 */
function buildPageInfo(baseUrl, html, actionName) {
    if (actionName === void 0) { actionName = 'buildPageInfo'; }
    // Main page extraction
    var mainMeta = extractPageMeta(html, actionName + '.main.meta');
    var mainH1 = extractMainHeading(html, actionName + '.main.h1');
    var mainH2 = extractH2Headings(html, actionName + '.main.h2');
    var mainH3 = extractH3Headings(html, actionName + '.main.h3');
    var mainFooter = extractFooterText(html, actionName + '.main.footer');
    var main = {
        url: baseUrl,
        title: mainMeta.title,
        description: mainMeta.description,
        h1: mainH1,
        h2: mainH2.length ? mainH2 : undefined,
        h3: mainH3.length ? mainH3 : undefined,
        footer: mainFooter
    };
    var policy;
    var cookies;
    var about;
    // Discover and fetch aux pages if we have the HTML.
    if (html) {
        var footerLinks = extractFooterLinks(html, baseUrl, actionName + '.footer.links');
        var aux = classifyAuxLinks(footerLinks);
        if (aux.policies) {
            AppLogger.info(actionName, 'Found policy link', { url: aux.policies });
        }
        if (aux.cookies) {
            AppLogger.info(actionName, 'Found cookies link', { url: aux.cookies });
        }
        if (aux.about) {
            AppLogger.info(actionName, 'Found about link', { url: aux.about });
        }
        /**
         * Helper: fetch an auxiliary page and extract info.
         */
        var fetchAndExtract = function (url, label) {
            if (!url)
                return undefined;
            var fetchRes = fetchHtml(url, undefined, "".concat(actionName, ".").concat(label, ".fetch"));
            if (!fetchRes.ok || !fetchRes.content) {
                AppLogger.warn(actionName, "Could not fetch ".concat(label, " page"), { url: url, statusCode: fetchRes.statusCode });
                return undefined;
            }
            var pageHtml = fetchRes.content;
            var meta = extractPageMeta(pageHtml, "".concat(actionName, ".").concat(label, ".meta"));
            var h1 = extractMainHeading(pageHtml, "".concat(actionName, ".").concat(label, ".h1"));
            var h2 = extractH2Headings(pageHtml, "".concat(actionName, ".").concat(label, ".h2"));
            var h3 = extractH3Headings(pageHtml, "".concat(actionName, ".").concat(label, ".h3"));
            var footer = extractFooterText(pageHtml, "".concat(actionName, ".").concat(label, ".footer"));
            return {
                url: url,
                title: meta.title,
                description: meta.description,
                h1: h1,
                h2: h2.length ? h2 : undefined,
                h3: h3.length ? h3 : undefined,
                footer: footer || undefined,
            };
        };
        policy = fetchAndExtract(aux.policies, 'policy');
        if (policy) {
            AppLogger.info(actionName, 'Parsed policy page', { url: policy.url });
        }
        cookies = fetchAndExtract(aux.cookies, 'cookies');
        if (cookies) {
            AppLogger.info(actionName, 'Parsed cookies page', { url: cookies.url });
        }
        about = fetchAndExtract(aux.about, 'about');
        if (about) {
            AppLogger.info(actionName, 'Parsed about page', { url: about.url });
        }
    }
    // Build combined text for LLM.
    var chunks = [];
    function addChunk(label, value) {
        if (!value)
            return;
        if (Array.isArray(value)) {
            value.forEach(function (v) {
                var t = normalizeTextSpaces(v);
                if (t)
                    chunks.push("".concat(label, ": ").concat(t));
            });
        }
        else {
            var t = normalizeTextSpaces(value);
            if (t)
                chunks.push("".concat(label, ": ").concat(t));
        }
    }
    // Main page relevant info first
    addChunk('Main title', main.title);
    addChunk('Main description', main.description);
    addChunk('Main H1', main.h1);
    // About page (if any)
    if (about) {
        addChunk('About title', about.title);
        addChunk('About description', about.description);
        addChunk('About H1', about.h1);
        addChunk('About H2', about.h2 || []);
        addChunk('About H3', about.h3 || []);
        addChunk('About footer', about.footer);
    }
    // Policy page (if any)
    if (policy) {
        addChunk('Policy title', policy.title);
        addChunk('Policy description', policy.description);
        addChunk('Policy H1', policy.h1);
        addChunk('Policy H2', policy.h2 || []);
        addChunk('Policy H3', policy.h3 || []);
        addChunk('Policy footer', policy.footer);
    }
    addChunk('Main H2', main.h2 || []);
    addChunk('Main H3', main.h3 || []);
    addChunk('Main footer', main.footer);
    // Cookies page (if any)
    if (cookies) {
        addChunk('Cookies title', cookies.title);
        addChunk('Cookies description', cookies.description);
        addChunk('Cookies H1', cookies.h1);
        addChunk('Cookies H2', cookies.h2 || []);
        addChunk('Cookies H3', cookies.h3 || []);
        addChunk('Cookies footer', cookies.footer);
    }
    var combinedText = chunks.join(' | ');
    // Safety: hard cap on context length for LLMs.
    var MAX_COMBINED_LEN = 3000;
    if (combinedText.length > MAX_COMBINED_LEN) {
        combinedText = combinedText.slice(0, MAX_COMBINED_LEN);
    }
    var info = {
        main: main,
        policy: policy,
        cookies: cookies,
        about: about,
        combinedText: combinedText,
    };
    return info;
}
