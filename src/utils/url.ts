/**
 * Normalizes a URL so it can be used as a stable identifier:
 * - trims white spaces
 * - default to https://
 * - lower case
 * - removes trailing slash from the path (except root)
 * - if input empty or invalid returns an empty string.
 */
function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) {
    return '';
  }

  const trimmed = rawUrl.trim();
  if (trimmed === '') {
    return '';
  }

  // Ensure we have http/https; default to https if missing
  let urlStr = trimmed;
  if (!/^https?:\/\//i.test(urlStr)) {
    urlStr = 'https://' + urlStr;
  }

  // URL parser using regex 
  const match = urlStr.match(/^(https?):\/\/([^\/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i);
  if (!match) {
    // Fallback: lowercase + remove trailing slashes
    return urlStr.trim().toLowerCase().replace(/\/+$/, '');
  }

  let protocol = match[1]; // http or https
  let host = match[2];   
  let path = match[3];    
  let query = match[4] || '';
  let hash = match[5] || '';

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

  return `${protocol}://${host}${path}${query}${hash}`;
}


/**
 * Returns True if two URL strings represent the same website after normalization.
 */
function areSameWebsite(a: string, b: string): boolean {
    const na = normalizeUrl(a);
    const nb = normalizeUrl(b);

    // return false if both URLs are empty
    if (!na || !nb) {
        return false;
    }


    return na === nb;
}


/**
 * Extract Host name.
 */
function getHostName(url: string): string | null {
  if (!url) return null;
  const m = url.match(/^https?:\/\/([^\/?#]+)/i);
  if (!m || !m[1]) return null;
  return m[1].toLowerCase();
}


/**
 * Returns true if an url is likely an internal link (same hostname or subdomain).
 */
function isInternalLink(baseUrl: string, candidateUrl: string): boolean {
  const baseHost = getHostName(baseUrl);
  const candidateHost = getHostName(candidateUrl);
  if (!baseHost || !candidateHost) return false;

  if (candidateHost === baseHost) return true;
  // Accept subdomains: e.g. demo.seedcamp.com for seedcamp.com.
  if (candidateHost.endsWith('.' + baseHost)) return true;
  return false;
}