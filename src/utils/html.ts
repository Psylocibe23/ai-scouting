/**
 * Removes html tags from a string and normalizes whitespaces.
 */
function stripHtml(html: string): string {
    if (!html) {
        return '';
    }

    // Remove all tags
    let text = html.replace(/<[^>]*>/g, ' ');
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
      .replace(/&pound;/gi, '£')

    // Collapse multiple whitespace into single spaces and trim
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}

/**
 * Simple text white space normalization.
 */
function normalizeTextSpaces(text: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}


/**
 * Extracts basic metadata (title and description) from HTML document.
 */
function extractPageMeta(html: string, actionName: string = 'extractPageMeta'): {title?: string, description?: string} {
    if (!html) {
        return {};
    }

    let title: string | undefined;
    let description: string | undefined;

    // Cheerio parsing
    try {
        const $ = Cheerio.load(html);

        // Extract title or og:title
        const rawTitle =
            $('head > title').first().text() ||
            $('meta[property="og:title"]').attr('content') ||
            $('meta[name="og:title"]').attr('content');

        if (rawTitle) {
            const t = normalizeTextSpaces(rawTitle);
            if (t) { title = t; }
        }

        // Extract description or og:description
        const rawDesc =
            $('meta[name="description"]').attr('content') ||
            $('meta[name="og:description"]').attr('content') ||
            $('meta[property="og:description"]').attr('content');

        if (rawDesc) {
            const d = normalizeTextSpaces(rawDesc);
            if (d) { description = d; }
        }
    } catch (e) {
        AppLogger.error(actionName, 'Cheerio failed in extractPageMeta, falling back to regex', e);
    }

    // Regex fallback if Cheerio fails parsing.
    if (!title) {
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            const t = stripHtml(titleMatch[1]);
            if (t !== '') { title = t; }
        }
    }

    if (!title) {
        const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
            const t = stripHtml(ogTitleMatch[1]);
            if (t !== '') { title = t; }
        }
    }

    if (!description) {
        const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (metaDescMatch && metaDescMatch[1]) {
            const d = stripHtml(metaDescMatch[1]);
            if (d !== '') { description = d; }
        }
    }

    if (!description) {
        const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (ogDescMatch && ogDescMatch[1]) {
            const d = stripHtml(ogDescMatch[1]);
            if (d !== '') { description = d; }
        }
    }

    const result: {title?: string, description?: string} = {};
    if (title) {result.title = title; }
    if (description) {result.description = description; }
    return result;
    
}


/**
 * Extracts the first <h1>...</h1> heading from the HTML, if present.
 */
function extractMainHeading(html: string, actionName: string = 'extractMainHeading'): string | undefined {
  if (!html) {
    return undefined;
  }

  try {
    const $ = Cheerio.load(html);

    // Try common “main” locations first, then fallback to first <h1>.
    const candidates = [
        $('main h1').first().text(),
        $('header h1').first().text(),
        $('h1').first().text(),];

    for (let i=0; i < candidates.length; i++) {
        const raw = candidates[i];
        if (raw) {
            const h = normalizeTextSpaces(raw);
            if (h) return h;
        }
    }
  } catch (e) {
    AppLogger.error(actionName, 'Cheerio failed in extractMainHeading, falling back to regex', e);
  }

  // Regex fallback 
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match && h1Match[1]) {
    const h1Text = stripHtml(h1Match[1]);
    return h1Text !== '' ? h1Text : undefined;
  }

  return undefined;
}


/**
 * Extract <h2>...</h2> headings from the HTML, if present.
 */
function extractH2Headings(html: string, actionName: string = 'extractH2Headings'): string[] {
    const result: string[] = [];
    if (!html) return result;

    try {
        const $ = Cheerio.load(html);
        $('h2').each((_, el) => {
            const text = normalizeTextSpaces($(el).text() || '');
            if (text) {
                result.push(text);
            }
        });
    } catch (e) {
        AppLogger.error(actionName, 'Cheerio error in extractH2Headings', e);
    }

    return result;
}


/**
 * Extract <h3>...</h3> headings from the HTML, if present.
 */
function extractH3Headings(html: string, actionName: string = 'extractH3Headings'): string[] {
    const result: string[] = [];
    if (!html) return result;

    try {
        const $ = Cheerio.load(html);
        $('h3').each((_, el) => {
            const text = normalizeTextSpaces($(el).text() || '');
            if (text) {
                result.push(text);
            }
        });
    } catch (e) {
        AppLogger.error(actionName, 'Cheerio error in extractAllH3Headings', e);
    }

    return result;
}


/**
 * Extracts visible text from the footer (or footer-like) section.
 */
function extractFooterText(html: string, actionName: string = 'extractFooterText'): string {
  if (!html) return '';

  try {
    const $ = Cheerio.load(html);

    // Primary: <footer> tag
    let footerText = normalizeTextSpaces($('footer').text() || '');

    // Fallback: elements whose id/class contains "footer"
    if (!footerText) {
      const fallback = $('div[id*="footer"], section[id*="footer"], div[class*="footer"], section[class*="footer"]')
        .first()
        .text();
      footerText = normalizeTextSpaces(fallback || '');
    }

    // Truncate to avoid insane length (2000 chars default)
    const MAX_LEN = 2000;
    if (footerText.length > MAX_LEN) {
      footerText = footerText.slice(0, MAX_LEN);
    }

    return footerText;
  } catch (e) {
    AppLogger.error(actionName, 'Cheerio error in extractFooterText', e);
    return '';
  }
}



/**
 * URL resolver helper:
 * - if href absoulte, returns it
 * - if href starts with '/', uses origin of baseUrl
 * - otherwise joins relative path to baseUrl path.
 */
interface InfoLink {
    href: string;
    text: string;
}

function resolveUrl(baseUrl: string, href: string): string {
    const trimmedHref = href.trim();
    if (!trimmedHref) return '';

    if (/^https?:\/\//i.test(trimmedHref)) {
        return trimmedHref;
    }

    // Extract origin (protocol + host).
    const originMatch = baseUrl.match(/^(https?:\/\/[^\/]+)/i);
    const origin = originMatch ? originMatch[1] : baseUrl;

    if (trimmedHref.startsWith('/')) {
        return origin + trimmedHref;
    }

    // Remove any query/fragment from base and last segment.
    const baseWithoutQuery = baseUrl.split(/[?#]/)[0];
    const lastSlashIndex = baseWithoutQuery.lastIndexOf('/');
    const basePath = lastSlashIndex > 'https://x'.length - 1 ? baseWithoutQuery.slice(0, lastSlashIndex + 1): origin + '/';

    return basePath + trimmedHref;
}


/**
 * Extracts links from footer and returns absolute URLs plus visible link text.
 */
function extractFooterLinks(html: string, baseUrl: string, actionName: string = 'extractFooterLinks'): InfoLink[] {
    const links: InfoLink[] = [];
    if (!html) return links;

    try {
        const $ = Cheerio.load(html);

        let $anchors = $('footer a[href]');
        // Fallback: if no footer scan all <a>.
        if ($anchors.length === 0) {
            $anchors = $('a[href]');
        }

        $anchors.each((_, el) => {
            const hrefAttr = $(el).attr('href') || '';
            const text = normalizeTextSpaces($(el).text() || '');
            if (!hrefAttr) return;

            const absoluteHref = resolveUrl(baseUrl, hrefAttr);
            if (!absoluteHref) return;

            // Skip mailto / tel for the demo.
            if (/^mailto:|^tel:/i.test(absoluteHref)) return;

            links.push({href: absoluteHref, text});
        });
    } catch (e) {
        AppLogger.error(actionName, 'Cheerio error while extracting footer links', e);
    }

    return links;
}


/**
 * Classifier for links retrieved from footer (policies, about, cookies).
 */
interface AuxPages {
    policies?: string;
    cookies?: string;
    about?: string;
}

function classifyAuxLinks(links: InfoLink[]): AuxPages {
    const result: AuxPages = {};

    links.forEach((link) => {
        const label = (link.text + ' ' + link.href).toLowerCase();

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
 * Heuristic detector for 'portfolio/startups/alumni' pages inside accelerator websites.
 */
function findStartupListLinks(accelWebsite: string, html: string, actionName: string = 'findStartupListLinks'): string[] {
    const results: string[] = [];
    const seen = new Set<string>();
    if (!html) return results;

    try {
        const $ = Cheerio.load(html);

        const anchors = $('a[href]');
        const KEYWORDS = /(portfolio|our startups|startups|start-up|alumni|our companies|portfolio companies|cohort|batch)/i;
        const NEGATIVE = /(login|log in|sign in|sign up|apply|apply now|contact|careers|jobs|blog|events|faq|news)/i;

        anchors.each((_, el) => {
            const hrefAttr = ($(el).attr('href') || '').trim();
            if (!hrefAttr) return;

            const absoluteHref = resolveUrl(accelWebsite, hrefAttr);
            if (!absoluteHref) return;

            if (!isInternalLink(accelWebsite, absoluteHref)) return;

            const text = normalizeTextSpaces($(el).text() || '');
            const label = (text + ' ' + hrefAttr).toLowerCase();
            // Must contain a positive keyword.
            if (!KEYWORDS.test(label)) return;
            if (NEGATIVE.test(label)) return;

            if (!seen.has(absoluteHref)) {
                seen.add(absoluteHref);
                results.push(absoluteHref);
            }
        });
    } catch (e) {
        AppLogger.error(actionName, 'Cheerio error in findStartupListLinks', e);
    }

    // For demo robustness cap to a max number of startups links.
    const MAX_PORTFOLIO_LINKS = 10;
    const trimmed = results.slice(0, MAX_PORTFOLIO_LINKS);

    if (trimmed.length === 0) {
        AppLogger.info(actionName, 'No portfolio/startups/alumni links detected', {base: accelWebsite});
    } else {
        AppLogger.info(actionName, 'Detected startup list links', {base: accelWebsite, links: trimmed});
    }

    return trimmed;

}


interface PageExtract {
    url: string;
    title?: string;
    description?: string;
    h1?: string;
    h2?: string[];
    h3?: string[];
    footer?: string;
}

interface PageInfo {
    main: PageExtract;
    policy?: PageExtract;
    cookies?: PageExtract;
    about?: PageExtract;
    /**
     * Flattened, truncated text to be fed to the LLM.
     */
    combinedText: string;
}


/**
 * Orchestrator that builds a rich, LLM-ready context from base pages:
 * - extracts title, description, h1, all h2, all h3, footer text from main page
 * - finds footer links and classify them (policies, cookies, about)
 * - fetches those auxiliary pages (if any) and repeats extraction
 * - merges everything into a single combined string.
 */
function buildPageInfo(baseUrl: string, html: string, actionName: string = 'buildPageInfo'): PageInfo {
    // Main page extraction
    const mainMeta = extractPageMeta(html, actionName + '.main.meta');
    const mainH1 = extractMainHeading(html, actionName + '.main.h1');
    const mainH2 = extractH2Headings(html, actionName + '.main.h2');
    const mainH3 = extractH3Headings(html, actionName + '.main.h3');
    const mainFooter = extractFooterText(html, actionName + '.main.footer');

    const main: PageExtract = {
        url: baseUrl,
        title: mainMeta.title,
        description: mainMeta.description,
        h1: mainH1,
        h2: mainH2.length ? mainH2 : undefined,
        h3: mainH3.length ? mainH3 : undefined,
        footer: mainFooter
    };

    let policy: PageExtract | undefined;
    let cookies: PageExtract | undefined;
    let about: PageExtract | undefined;

    // Discover and fetch aux pages if we have the HTML.
    if (html) {
        const footerLinks = extractFooterLinks(html, baseUrl, actionName + '.footer.links');
        const aux = classifyAuxLinks(footerLinks);

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
        const fetchAndExtract = (url: string | undefined, label: 'policy' | 'cookies' | 'about'): PageExtract | undefined => {
            if (!url) return undefined;

            const fetchRes = fetchHtml(url, undefined, `${actionName}.${label}.fetch`);
            if (!fetchRes.ok || !fetchRes.content) {
                AppLogger.warn(actionName, `Could not fetch ${label} page`, {url, statusCode: fetchRes.statusCode});
                return undefined;
            }

            const pageHtml = fetchRes.content;
            const meta = extractPageMeta(pageHtml, `${actionName}.${label}.meta`);
            const h1 = extractMainHeading(pageHtml, `${actionName}.${label}.h1`);
            const h2 = extractH2Headings(pageHtml, `${actionName}.${label}.h2`);
            const h3 = extractH3Headings(pageHtml, `${actionName}.${label}.h3`);
            const footer = extractFooterText(pageHtml, `${actionName}.${label}.footer`);

            return {
                url,
                title: meta.title,
                description: meta.description,
                h1,
                h2: h2.length ? h2 : undefined,
                h3: h3.length ? h3 : undefined,
                footer: footer || undefined,
            };
        }

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
    const chunks: string[] = [];
    function addChunk(label: string, value?: string | string[] | null) {
        if (!value) return;

        if (Array.isArray(value)) {
            value.forEach((v) => {
                const t = normalizeTextSpaces(v);
                if (t) chunks.push(`${label}: ${t}`);
            });
        } else {
            const t = normalizeTextSpaces(value);
            if (t) chunks.push(`${label}: ${t}`);
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

    let combinedText = chunks.join(' | ');

    // Safety: hard cap on context length for LLMs.
    const MAX_COMBINED_LEN = 3000;
    if (combinedText.length > MAX_COMBINED_LEN) {
      combinedText = combinedText.slice(0, MAX_COMBINED_LEN);
    }

    const info: PageInfo = {
      main,
      policy,
      cookies,
      about,
      combinedText,
    };

    return info;
}