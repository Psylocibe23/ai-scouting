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
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

    // Collapse multiple whitespace into single spaces and trim
    text = text.replace(/\s+/g, ' ').trim();

    return text;
}


/**
 * Extracts basic metadata (title and description) from HTML document.
 */
function extractPageMeta(html: string): {title?: string, description?: string} {
    if (!html) {
        return {};
    }

    let title: string | undefined;
    let description: string | undefined;

    // Extracts <title>....</title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
        title = stripHtml(titleMatch[1]);
        if (title === '') {
            title = undefined;
        }
    }

    // Extract <meta name="description" content="...">
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    if (metaDescMatch && metaDescMatch[1]) {
        description = stripHtml(metaDescMatch[1]);
    }

    // Fallback: <meta property="og:description" ...>
    if (!description) {
        const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
        if (ogDescMatch && ogDescMatch[1]) {
            description = stripHtml(ogDescMatch[1]);
        }
    }

    const result: { title?: string; description?: string } = {};

    if (title) { result.title = title;}
    if (description) {result.description = description;}

    return result;
}