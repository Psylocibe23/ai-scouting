/**
 * SerpAPI usage tracking and management *monthly max quota = 250 searches)
 */
const SERPAPI_MONTHLY_CALL_LIMIT = 240; // safety margin = 10
const SERPAPI_USAGE_MONTH_KEY  = 'SERPAI_USAGE_MONTH';
const SERPAPI_USAGE_COUNT_KEY  = 'SERPAPI_USAGE_COUNT';

function getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const monthNumber = now.getMonth() + 1;
    const month = (monthNumber < 10 ? '0' + monthNumber : String(monthNumber));
    return `${year}-${month}`;
}

function getSerpApiUsage(): {monthkey: string, count: number} {
    const props = PropertiesService.getScriptProperties();
    const currentMonth = getCurrentMonthKey();
    const storedMonth = (props.getProperty(SERPAPI_USAGE_MONTH_KEY) || '').trim();
    const storedCountStr = (props.getProperty(SERPAPI_USAGE_COUNT_KEY) || '').trim();
    let count = parseInt(storedCountStr || '0', 10);

    if (!storedMonth || storedMonth !== currentMonth) {
        // new month -> reset counter
        props.setProperty(SERPAPI_USAGE_MONTH_KEY, currentMonth);
        props.setProperty(SERPAPI_USAGE_COUNT_KEY, '0');
        count = 0;
        return {monthkey: currentMonth, count: count};
    }

    if (isNaN(count) || count < 0) {
        count = 0;
    }

    return { monthkey: storedMonth, count};
}

function incrementSerpApiUsage(): number {
    const props = PropertiesService.getScriptProperties();
    const currentMonth = getCurrentMonthKey();
    const usage = getSerpApiUsage();
    const newCount = usage.count + 1;
    props.setProperty(SERPAPI_USAGE_MONTH_KEY, currentMonth);
    props.setProperty(SERPAPI_USAGE_COUNT_KEY, String(newCount));
    return newCount;
}


/**
 * Small curated list of European accelerators used for the prototype.
 * In a real system, this could be replaced or complemented by a search API.
 */
function getCuratedEuropeanAccelerators(): Accelerator[] {
  const raw: {
    website: string;
    name: string;
    country: string;
    city?: string;
    focus?: string;
  }[] = [
    {
      website: 'https://seedcamp.com',
      name: 'Seedcamp',
      country: 'United Kingdom',
      city: 'London',
      focus: 'Pre-seed and seed tech startups',
    },
    {
      website: 'https://stationf.co',
      name: 'STATION F',
      country: 'France',
      city: 'Paris',
      focus: 'Early-stage startups across multiple verticals',
    },
    {
      website: 'https://rockstart.com',
      name: 'Rockstart',
      country: 'Netherlands',
      city: 'Amsterdam',
      focus: 'Energy, agrifood and emerging tech',
    },
    {
      website: 'https://www.startupbootcamp.org',
      name: 'Startupbootcamp',
      country: 'Netherlands',
      city: 'Amsterdam',
      focus: 'Vertical-focused accelerator programs in Europe',
    },
    {
      website: 'https://www.joinef.com',
      name: 'Entrepreneur First',
      country: 'United Kingdom',
      city: 'London',
      focus: 'Talent-focused pre-company accelerator',
    },
    {
      website: 'https://www.eitdigital.eu',
      name: 'EIT Digital Accelerator',
      country: 'Belgium',
      city: 'Brussels',
      focus: 'Digital deep-tech scaleups in Europe',
    },
    {
      website: 'https://www.techstars.com/accelerators/london',
      name: 'Techstars London',
      country: 'United Kingdom',
      city: 'London',
      focus: 'Early-stage tech startups',
    },
    {
      website: 'https://www.startuplisboa.com',
      name: 'Startup Lisboa',
      country: 'Portugal',
      city: 'Lisbon',
      focus: 'Early-stage startups across sectors',
    },
  ];

  // Normalize URLs so they are ready to be used as primary keys.
  return raw.map((a) => ({
    website: normalizeUrl(a.website),
    name: a.name,
    country: a.country,
    city: a.city,
    focus: a.focus,
  }));
}

/**
 * Runs accelerator scouting on the given list:
 * - normalizes URLs
 * - checks existing accelerators (idempotent)
 * - appends up to `batch_size` accelerators to the sheet.
 */
interface ScoutAceleratorResult {
    totalCandidates: number;
    alreadyPresent: number;
    added: number;
}

function scoutAccelerators(batch_size: number = 10): ScoutAceleratorResult {
    const action = 'scoutAccelerators';
    const candidates = getCuratedEuropeanAccelerators();
    const totalCandidates = candidates.length;
    // Get existing websites and normalize them to build a robust dedup set
    const existing = AcceleratorRepository.getExistingWebsites();
    const normalizedExisting = new Set<string>();

    existing.forEach((w) => {
        const n = normalizeUrl(w);
        if (n) {
            normalizedExisting.add(n);
        }
    });

    const newAccelerators: Accelerator[] = [];
    let alreadyPresent = 0;

    candidates.forEach((accel) => {
        const norm = normalizeUrl(accel.website);
        
        if (!norm) {
            AppLogger.warn(action, 'Skipping candidate with invalid website.', {website: accel.website});
            return;
        }

        if (normalizedExisting.has(norm)) {
            alreadyPresent++;
            return;
        }

        // Mark as seen to avoid duplicates within the same run
        normalizedExisting.add(norm);

        newAccelerators.push({...accel, website: norm});
    });
        // Respect batch_size
        const toAdd = newAccelerators.slice(0, batch_size);
        if (toAdd.length > 0) {
            AcceleratorRepository.appendMany(toAdd);
        }

        const result: ScoutAceleratorResult = {
            totalCandidates,
            alreadyPresent,
            added: toAdd.length,
        };

        AppLogger.info(action, 'Accelerator scouting completed', result);
        
        return result;
    
}


interface SerpApiResult {
    title?: string;
    link?: string;
    snippet?: string;
}

interface SerpApiResponse {
    organic_results?: SerpApiResult[];
}

/**
 * Calls SerpAPI (Google search) to discover candidates accelerators in Europe.
 * - respects a monthly usage cap (allowed from free-tier)
 * - uses a default low number of results per call.
 */
function discoverAcceleratorsFromSerpApi(maxResults: number = 10): Accelerator[] {
    const action = 'discoverAcceleratorsFromSerpApi';
    const apiKey = getSerpApiKey();

    if (!apiKey) {
        AppLogger.warn(action, 'No SERPAPI_KEY configured, skipping SerpAPI discovery.');
        return [];
    }

    // check usage before filing request
    const usage = getSerpApiUsage();
    if (usage.count > SERPAPI_MONTHLY_CALL_LIMIT) {
        AppLogger.warn(action, `SerpAPI monthly limit reached or exceeded (${usage.count}/${SERPAPI_MONTHLY_CALL_LIMIT}). Skipping call.`);
        return [];
    }

    const query = 'startup accelerator in europe';
    const params: {[key: string]: string} = {
        engine: 'google',
        q: query,
        api_key: apiKey,
        num: String(maxResults), // how many results we get from this call
    };

    const qs = Object.keys(params).map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');

    const url = `https://serpapi.com/search.json?${qs}`;

    try {
        const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
        const status = response.getResponseCode();
        const text = response.getContentText() || '';
        const newCount = incrementSerpApiUsage();

        if (newCount >= SERPAPI_MONTHLY_CALL_LIMIT - 5) {
            AppLogger.warn(action, `SerpAPI usage nearing limit: ${newCount}/${SERPAPI_MONTHLY_CALL_LIMIT}`);
        }

        if (status < 200 || status >= 300) {
            AppLogger.warn(action, `Non-2xx status from SerpAPI: ${status}`, {bodyPreview: text.slice(0, 200),});
            return [];
        }

        let data: SerpApiResponse;

        try {
            data = JSON.parse(text) as SerpApiResponse;
        } catch (parseErr) {
            AppLogger.error(action, 'Failed to parse SerpAPI JSON response', parseErr);
            return [];
        }

         const organic = data.organic_results || [];
         const accelerators: Accelerator[] = [];

         organic.forEach((r) => {
            const link = (r.link || '').trim();
            const title = (r.title || '').trim();
            const snippet = (r.snippet || '').trim();
            const websiteNorm = normalizeUrl(link);
            if (!websiteNorm) {
                return;
            }

            const lowerText = (title + ' ' + snippet).toLowerCase();

            // Heuristic: keep only items that looks like accelerator programs
            if (
                !lowerText.includes('accelerator') &&
                !lowerText.includes('acceleration program') &&
                !lowerText.includes('startup program') &&
                !lowerText.includes('startup accelerator')
            ) {
                return;
            }

            const inferredName = title || websiteNorm;
            accelerators.push({
                website: websiteNorm,
                name: inferredName,
                country: 'Europe',
                city: undefined,
                focus: snippet || undefined,
            });
         });

         AppLogger.info(action, 'SerpAPI discovery completed', {query, found: accelerators.length, usageAfterCall: newCount});
         
         return accelerators;
    } catch (e) {
        AppLogger.error(action, 'Exception while calling SerpAPI', e);
        return [];
    }
}