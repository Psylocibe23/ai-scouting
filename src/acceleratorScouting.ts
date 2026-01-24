/**
 * SerpAPI usage tracking and management *monthly max quota = 250 searches)
 */
const SERPAPI_MONTHLY_CALL_LIMIT = 240; // safety margin = 10
const SERPAPI_USAGE_MONTH_KEY  = 'SERPAPI_USAGE_MONTH';
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

/**
 * Uses the LLM to infer structured accelerator data from a website.
 * - normalize URL
 * - fetch HTML
 * - build a compact context from metadata (title, description, h1)
 * - call LLM with system+user prompt to get JSON
 * - map JSON into an Accelerator object.
 *
 * Returns:
 *  - Accelerator object on success
 *  - null if something goes wrong or data is unusable.
 */
function inferAccelFromWebsite(website: string, snippetHint?: string): Accelerator | null {
  const action = 'inferAccelFromWebsite';

  const normalizedWebsite = normalizeUrl(website);
  if (!normalizedWebsite) {
    AppLogger.warn(action, 'Skipping inference: invalid website', { website });
    return null;
  }

  // Fetch HTML for context
  const fetchResult = fetchHtml(normalizedWebsite, undefined, action + '.fetchHtml');
  if (!fetchResult.ok || !fetchResult.content) {
    AppLogger.warn(action, 'Could not fetch HTML for website, skipping LLM inference', {website: normalizedWebsite, statusCode: fetchResult.statusCode,});
    return null;
  }

  // Build compact textual context from HTML (title, description, h1)
  const htmlContext = buildWebsiteContext(normalizedWebsite, fetchResult.content, action + '.context');

  // Combine snippet (from SerpAPI, if any) and HTML context
  let combinedContext = '';
  if (snippetHint && snippetHint.trim() !== '') {
    combinedContext = snippetHint.trim();
    if (htmlContext) {
      combinedContext += ' | ' + htmlContext;
    }
  } else {
    combinedContext = htmlContext;
  }

  // Build LLM prompts
  // Role Prompting (better quality output) + Structured Output (reduce hallucinations)
  const systemPrompt = [
    'You are an assistant that extracts structured information about startup accelerators from website metadata and short text snippets.',
    'From the given context, you must infer the accelerator name, its country, and optionally city and focus.',
    'If you are not sure about some fields, keep them generic (e.g. "Unknown") or null, but do not invent very specific details.',
    'Always respond with a single JSON object only.'
  ].join(' ');

    const userLines: string[] = [];

  userLines.push(`Website URL: ${normalizedWebsite}`);

  if (combinedContext && combinedContext.trim() !== '') {
    userLines.push('');
    userLines.push('Context extracted from search/snippets and the website:');
    userLines.push(`"${combinedContext.trim()}"`);
  } else {
    userLines.push('');
    userLines.push('No additional context was extracted from the website.');
  }

  userLines.push('');
  userLines.push('You must produce exactly one JSON object with the following shape:');
  userLines.push('{');
  userLines.push('  "name": "Accelerator name",');
  userLines.push('  "country": "Country where the accelerator is based",');
  userLines.push('  "city": "City where the accelerator is based (or null if unknown)",');
  userLines.push('  "focus": "Main focus or vertical of the accelerator (or null if unknown)",');
  userLines.push('  "is_accelerator": true');
  userLines.push('}');

  // Few-shot Prompting (robustness)
  userLines.push('');
  userLines.push('Here are two examples of the expected output format:');

  // Example 1
  userLines.push('');
  userLines.push('Example 1');
  userLines.push('Website URL: https://seedcamp.com');
  userLines.push('Context: "Seedcamp is a European seed fund that identifies and invests in world-class founders attacking large, global markets and solving real problems using technology."');
  userLines.push('Expected JSON:');
  userLines.push('{');
  userLines.push('  "name": "Seedcamp",');
  userLines.push('  "country": "United Kingdom",');
  userLines.push('  "city": "London",');
  userLines.push('  "focus": "European pre-seed and seed tech startups",');
  userLines.push('  "is_accelerator": true');
  userLines.push('}');

  // Example 2
  userLines.push('');
  userLines.push('Example 2');
  userLines.push('Website URL: https://www.techstars.com/accelerators/london');
  userLines.push('Context: "Techstars London runs mentorship-driven accelerator programs helping early-stage technology companies grow with funding, network, and hands-on support in London."');
  userLines.push('Expected JSON:');
  userLines.push('{');
  userLines.push('  "name": "Techstars London",');
  userLines.push('  "country": "United Kingdom",');
  userLines.push('  "city": "London",');
  userLines.push('  "focus": "early-stage technology startups in mentorship-driven accelerator programs",');
  userLines.push('  "is_accelerator": true');
  userLines.push('}');

  // Final guidelines & instruction
  userLines.push('');
  userLines.push('Guidelines:');
  userLines.push('- "name" should be the accelerator brand name, not the startup names.');
  userLines.push('- "country" should be a country name like "France", "Germany", "United Kingdom".');
  userLines.push('- "city" can be null if you cannot confidently infer it.');
  userLines.push('- "focus" should be a short phrase like "early-stage tech startups" or null.');
  userLines.push('- "is_accelerator" MUST be true ONLY if the website itself is a startup accelerator / accelerator program.');
  userLines.push('- If the page is an article, blog, guide, or directory listing accelerators, then set "is_accelerator" to false.');
  userLines.push('');
  userLines.push('Now, based on the provided website URL and context at the top,');
  userLines.push('produce ONLY one JSON object in the same style as the examples above,');
  userLines.push('with keys exactly: "name", "country", "city", "focus", "is_accelerator".');
  userLines.push('Return ONLY the JSON object, with no extra commentary or explanations.');

  const userPrompt = userLines.join('\n');

  // Call the LLM

  const json = CallLlmJson(systemPrompt, userPrompt, action);
  if (!json || typeof json !== 'object') {
    AppLogger.warn(action, 'LLM returned null or non-object JSON, skipping.', { website: normalizedWebsite });
    return null;
  }

  // Classification: drop pages that are not actual accelerators.
  let isAccelerator = false;

  if (typeof json.is_accelerator === 'boolean') {
      isAccelerator = json.is_accelerator;
    } else if (typeof json.type === 'string') {
      // extra robustness if the model decides to return a "type" field.
      const t = json.type.toLowerCase();
      isAccelerator = (t === 'accelerator' || t === 'startup accelerator' || t === 'accelerator program');
    }

    if (!isAccelerator) {
      AppLogger.info(action, 'Skipping non-accelerator page according to LLM classification', {
        website: normalizedWebsite,
        rawType: json.type,
      });
      return null;
    }

  // Map JSON to Accelerator

  // Be defensive: accept slight variations in keys if the model gets creative.
  let name = '';
  if (typeof json.name === 'string') {
    name = json.name.trim();
  } else if (typeof json.accelerator_name === 'string') {
    name = json.accelerator_name.trim();
  }

  let country = '';
  if (typeof json.country === 'string') {
    country = json.country.trim();
  }

  let city: string | undefined;
  if (typeof json.city === 'string') {
    const c = json.city.trim();
    city = c !== '' ? c : undefined;
  }

  let focus: string | undefined;
  if (typeof json.focus === 'string') {
    const f = json.focus.trim();
    focus = f !== '' ? f : undefined;
  }

  // Fallbacks to avoid empty required fields.
  if (!name) {
    // As a last resort, use domain as name.
    name = normalizedWebsite;
  }
  if (!country) {
    country = 'Unknown';
  }

  const accel: Accelerator = {
    website: normalizedWebsite,
    name: name,
    country: country,
    city: city,
    focus: focus,
  };

  AppLogger.info(action, 'Inferred accelerator from website', accel);
  return accel;
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

            const pathLike = link.toLowerCase();
            const textForType = (title + ' ' + snippet).toLowerCase();

            // Skip obvious "best/top/list of accelerators" articles.
            if (
              /best .*accelerator/.test(textForType) ||
              /top .*accelerator/.test(textForType) ||
              /list of .*accelerator/.test(textForType) ||
              pathLike.includes('/best-') ||
              pathLike.includes('/top-') ||
              pathLike.includes('/list-')
            ) {
              AppLogger.info(action, 'Skipping article/directory-style Serp result', { link, title });
              return;
            }
            if (!websiteNorm) {
              return;
            }
        
            const lowerText = (title + ' ' + snippet).toLowerCase();
        
            // Heuristic: keep only items that look like accelerator programs
            if (
              !lowerText.includes('accelerator') &&
              !lowerText.includes('acceleration program') &&
              !lowerText.includes('startup program') &&
              !lowerText.includes('startup accelerator')
            ) {
              return;
            }
        
            // NEW: call the LLM-based inference instead of hardcoding
            const inferred = inferAccelFromWebsite(websiteNorm, snippet || undefined);
            if (inferred) {
              accelerators.push(inferred);
            }
          });


         AppLogger.info(action, 'SerpAPI discovery completed', {query, found: accelerators.length, usageAfterCall: newCount});
         
         return accelerators;
    } catch (e) {
        AppLogger.error(action, 'Exception while calling SerpAPI', e);
        return [];
    }
}


/**
 * Orchestrator 
 * - load existing accelerator websites (for dedup)
 * - discover new accelerators via Serp API + LLM (groq)
 * - add accelerators to curated list (no duplicates)
 * - append new accelerators to sheet
 */
interface AcceleratorScouting {
    batchSize: number;
    serpCandidates: number;
    curatedCandidates: number;
    addedFromSerp: number;
    addedFromCurated: number;
    totalAdded: number;
    alreadyPresent: number;
}

function scoutAcceleratorsSmart(batch_size: number = 10): AcceleratorScouting {
    const action = 'scoutAcceleratorsSmart';

    // 1. Build normalized set of existing websites
    const existing = AcceleratorRepository.getExistingWebsites();
    const normalizedExistingSet = new Set<string>();
    existing.forEach((w) => {
        const n = normalizeUrl(w);
        if (n) {
            normalizedExistingSet.add(n)
        }
    });

    // 2. SerpAPI + LLM
    const serpDiscovered = discoverAcceleratorsFromSerpApi(batch_size);
    const serpCandidates = serpDiscovered.length;
    const newFromSerp: Accelerator[] = [];
    let alreadyPresent = 0;

    serpDiscovered.forEach((a) => {
        const norm = normalizeUrl(a.website);

        if (!norm) {
            return;
        }

        if (normalizedExistingSet.has(norm)) {
            alreadyPresent++;
            return;
        }

        normalizedExistingSet.add(norm);
        newFromSerp.push({...a, website: norm});
    });

    let addedFromSerp = newFromSerp.length;
    let addedFromCurated = 0;

    const toAppend: Accelerator[] = [];
    toAppend.push(...newFromSerp);

    // 3. Fallback to fill remaining batch slots
    const remaining = Math.max(0, batch_size - addedFromSerp);
    let curatedCandidates = 0;

    if (remaining > 0) {
        const curated = getCuratedEuropeanAccelerators();
        curatedCandidates = curated.length;

        for (let i = 0; i < curated.length && addedFromCurated < remaining; i++) {
            const accel = curated[i];
            const norm = normalizeUrl(accel.website);
            if (!norm) {
                continue;
            }

            if (normalizedExistingSet.has(norm)) {
                alreadyPresent++;
                continue;
            }

            normalizedExistingSet.add(norm);
            toAppend.push({ ...accel, website: norm });
            addedFromCurated++;
        }
    }

    // 4. Write to sheet (in batch)
    if (toAppend.length > 0) {
        AcceleratorRepository.appendMany(toAppend);
    }

    const summary: AcceleratorScouting = {
        batchSize: batch_size,
        serpCandidates,
        curatedCandidates,
        addedFromSerp,
        addedFromCurated,
        totalAdded: addedFromSerp + addedFromCurated,
        alreadyPresent,
    }

    AppLogger.info(action, 'Full accelerator scouting summary', summary);
    return summary;

}