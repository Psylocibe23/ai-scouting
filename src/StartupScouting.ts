/**
 * Uses the LLM to extract startups from a portfolio/startups/alumni page.
 * - builds a PageInfo (main + about/policy/cookies if present)
 * - sends a compact combinedText to the LLM
 * - expects { "startups": [...] } or a plain array
 * - maps the result into Startup objects (website as primary key).
 */
function inferStartupsFromPortfolioPage(
  pageUrl: string,
  html: string,
  accelerator: Accelerator,
  actionName: string = 'inferStartupsFromPortfolioPage'
): Startup[] {
  const accelUrlNorm = normalizeUrl(accelerator.website);
  const accelName = accelerator.name || accelUrlNorm || 'Unknown Accelerator';
  const accelCountry = accelerator.country || 'Unknown';

  if (!html) {
    return [];
  }

  // Build structured context for the page + aux pages (about/policy/cookies).
  const pageInfo = buildPageInfo(pageUrl, html, actionName + '.pageInfo');

  // System prompt
  const systemPrompt = [
    // Role
    'You are a careful data extraction assistant focused on startup portfolios of accelerators.',
    // Context
    'You receive structured text extracted from a web page that likely lists portfolio startups, alumni, or batches of an accelerator.',
    'Your goal is to identify only the startups that are part of the accelerator (portfolio, alumni, cohorts, batches, etc.).',
    // Behaviour
    'Be conservative: if you are not confident that a name is a startup, skip it.',
    'Do not include the accelerator itself, its staff, sponsors, partners, or generic navigation labels.',
    'If you are unsure about the country, use null instead of guessing.',
    // Output
    'Always respond with JSON only, no extra commentary or markdown.'
  ].join(' ');

  // User prompt
  const userLines: string[] = [];

  // Context framing
  userLines.push('Context about the accelerator:');
  userLines.push(`- Accelerator website: ${accelUrlNorm || accelerator.website}`);
  userLines.push(`- Accelerator name: ${accelName}`);
  userLines.push(`- Accelerator country: ${accelCountry}`);
  userLines.push('');
  userLines.push(`Page URL being analyzed: ${pageUrl}`);
  userLines.push('');
  userLines.push('Below is structured text extracted from this page and related pages (about, policy, cookies).');
  userLines.push('Use it to detect startups that belong to this accelerator (portfolio, alumni, batches, cohorts, etc.).');
  userLines.push('');
  userLines.push('--- PAGE CONTEXT START ---');
  userLines.push(pageInfo.combinedText || '(no text)');
  userLines.push('--- PAGE CONTEXT END ---');
  userLines.push('');

  // Instruction + output schema
  userLines.push('Your task:');
  userLines.push('- Identify startups that clearly appear as portfolio companies, alumni, batch members or similar for this accelerator.');
  userLines.push('- Ignore the accelerator itself, staff members, mentors, sponsors, partners, or generic section titles.');
  userLines.push('');
  userLines.push('Output format (JSON only):');
  userLines.push('{');
  userLines.push('  "startups": [');
  userLines.push('    { "name": "Startup name", "website": "https://example.com", "country": "Country name or null" }');
  userLines.push('  ]');
  userLines.push('}');
  userLines.push('');
  userLines.push('Instructions for each startup:');
  userLines.push('- "name": the startup/company name as it appears in the page.');
  userLines.push('- "website": the startup website URL if it is clearly available; if missing or ambiguous, use null.');
  userLines.push('- "country": a human-readable country name like "France", "Germany", "United Kingdom", or null if unclear.');
  userLines.push('- Skip entries where you are unsure whether it is a startup.');
  userLines.push('');


  // Few-shots prompting

  // Example 1 – classic portfolio page
  userLines.push('Example 1');
  userLines.push('Context snippet:');
  userLines.push('"Our portfolio includes: Acme Analytics (https://acmeanalytics.com) - data analytics for retailers;');
  userLines.push(' BluePay (www.bluepay.io) - payment infrastructure for SMEs;');
  userLines.push(' Seedcamp is a European seed fund..."');
  userLines.push('Expected JSON:');
  userLines.push('{');
  userLines.push('  "startups": [');
  userLines.push('    { "name": "Acme Analytics", "website": "https://acmeanalytics.com", "country": null },');
  userLines.push('    { "name": "BluePay", "website": "https://www.bluepay.io", "country": null }');
  userLines.push('  ]');
  userLines.push('}');
  userLines.push('// Note: "Seedcamp" is the accelerator itself and must not be included.');
  userLines.push('');

  // Example 2 – alumni list with countries and no websites
  userLines.push('Example 2');
  userLines.push('Context snippet:');
  userLines.push('"Alumni:');
  userLines.push('  - FinHealth (France)');
  userLines.push('  - AgroSense (Spain)');
  userLines.push(' Mentors: John Doe, Jane Smith."');
  userLines.push('Expected JSON:');
  userLines.push('{');
  userLines.push('  "startups": [');
  userLines.push('    { "name": "FinHealth", "website": null, "country": "France" },');
  userLines.push('    { "name": "AgroSense", "website": null, "country": "Spain" }');
  userLines.push('  ]');
  userLines.push('}');
  userLines.push('// Note: mentors are people, not startups, and must be excluded.');
  userLines.push('');

  // Example 3 – mixed content where only some are startups
  userLines.push('Example 3');
  userLines.push('Context snippet:');
  userLines.push('"Our partners: BigBank, CloudCorp.');
  userLines.push(' Our portfolio companies include GreenLogix (green logistics SaaS) and MedAI (AI for radiology)."');
  userLines.push('Expected JSON:');
  userLines.push('{');
  userLines.push('  "startups": [');
  userLines.push('    { "name": "GreenLogix", "website": null, "country": null },');
  userLines.push('    { "name": "MedAI", "website": null, "country": null }');
  userLines.push('  ]');
  userLines.push('}');
  userLines.push('// Note: partners BigBank and CloudCorp are not necessarily portfolio startups and should be skipped unless clearly stated as portfolio companies.');
  userLines.push('');

  // Final reminder
  userLines.push('Now, using the actual page context above (not the examples),');
  userLines.push('produce ONLY one JSON object in the specified format.');
  userLines.push('Do not include any explanatory text, comments, or markdown around the JSON.');

  const userPrompt = userLines.join('\n');


  // Call LLM
  const json = CallLlmJson(systemPrompt, userPrompt, actionName);
  if (!json) {
    AppLogger.warn(actionName, 'LLM returned null/empty JSON, skipping page.', { pageUrl });
    return [];
  }

  let rawList: any[] = [];

  if (Array.isArray(json)) {
    // In case the model returns an array directly.
    rawList = json;
  } else if (Array.isArray((json as any).startups)) {
    rawList = (json as any).startups;
  } else {
    AppLogger.warn(actionName, 'LLM JSON did not contain an array or "startups" key, skipping page.', {
      pageUrl,
      jsonShape: typeof json,
    });
    return [];
  }

  // Mapping to Startup[]
  const startups: Startup[] = [];

  rawList.forEach((item) => {
    if (!item || typeof item !== 'object') return;

    let name = '';
    if (typeof item.name === 'string') {
      name = item.name.trim();
    }

    let website = '';
    if (typeof item.website === 'string') {
      website = normalizeUrl(item.website.trim());
    }

    let country = '';
    if (typeof item.country === 'string') {
      country = item.country.trim();
    }

    // Keep website as primary key: skip if missing.
    if (!website) return;

    if (!name) {
      name = website;
    }

    const startup: Startup = {
      website,
      name,
      country: country || 'Unknown',
      accelerator: accelUrlNorm || accelerator.website,
      value_proposition: '',
      category: '',
      last_updated: new Date().toISOString(),
    };

    startups.push(startup);
  });

  AppLogger.info(actionName, 'Inferred startups from portfolio page', {
    pageUrl,
    accelerator: accelName,
    count: startups.length,
  });

  return startups;
}


/**
 * Builds a prompt to be passed to the LLM to generate a value proposition
 * for a startup in a structured JSON format.
 *
 * The model must output ONLY a single JSON object with:
 *   {
 *     "startup_name": "X",
 *     "target": "Y",
 *     "what": "W",
 *     "benefit": "Z"
 *   }
 *
 * such that these fields correspond to the sentence:
 *   "Startup <X> helps <target Y> do <what W> so that <benefit Z>."
 */
function buildVpPrompt(startupName: string, website: string, context: string): string {
  const safeName = startupName.trim() || 'this startup';
  const safeWebsite = website.trim();

  // Role prompting (better quality output)
  const baseIntro = [
    'You are an assistant that writes concise, business-style value propositions for startups.',
    'Use the website information to infer what the startup does, who it serves, and what main benefit it provides.'
  ].join(' ');

  // Context from the scraped HTML (title, meta description, h1, ...)
  const contextPart = context
    ? `Here is some information extracted from the startup website:\n\n"${context.trim()}"\n`
    : 'No additional website text was available for this startup.';

  // Structured output: JSON schema + constraints (robustness and hallucination reduction)
  const jsonFormatExplanation = [
    'Your task is to produce a SINGLE JSON object and nothing else.',
    'The JSON must be valid and have EXACTLY these string fields:',
    '',
    '{',
    '  "startup_name": "X",',
    '  "target": "Y",',
    '  "what": "W",',
    '  "benefit": "Z"',
    '}',
    '',
    'These four fields together must define the sentence:',
    '"Startup X helps Y do W so that Z."',
    '',
    '- "startup_name" is the startup name.',
    '- "target" describes who the startup helps (the main customer or user).',
    '- "what" describes what the startup helps them do.',
    '- "benefit" describes the main benefit or outcome for the target.'
  ].join('\n');

  // Few-shot examples with real startups from accelerators
  const examples = [
    'Here are three examples of the expected JSON output for real startups that went through accelerators:',
    '',
    'Example 1 - Stripe',
    'Implied sentence:',
    '  Startup Stripe helps online businesses of every size accept and manage internet payments so that they can run and grow their companies on the web.',
    'Expected JSON:',
    '{',
    '  "startup_name": "Stripe",',
    '  "target": "online businesses of every size",',
    '  "what": "accept and manage internet payments",',
    '  "benefit": "they can run and grow their companies on the web"',
    '}',
    '',
    'Example 2 - SendGrid',
    'Implied sentence:',
    '  Startup SendGrid helps companies send and track transactional emails at scale so that their messages reliably reach users instead of getting lost or flagged as spam.',
    'Expected JSON:',
    '{',
    '  "startup_name": "SendGrid",',
    '  "target": "companies that send transactional emails",',
    '  "what": "send and track high-volume transactional emails",',
    '  "benefit": "their messages reliably reach users instead of getting lost or flagged as spam"',
    '}',
    '',
    'Example 3 - Revolut',
    'Implied sentence:',
    '  Startup Revolut helps consumers manage money, payments, and investing across borders so that they can use a low-fee global financial super-app instead of fragmented traditional banking services.',
    'Expected JSON:',
    '{',
    '  "startup_name": "Revolut",',
    '  "target": "consumers who need modern global banking",',
    '  "what": "manage money, payments, and investing across borders in one app",',
    '  "benefit": "they can use a low-fee global financial super-app instead of fragmented traditional banking services"',
    '}'
  ].join('\n');

  // Final instructions (use intructions instead of constraint for effectiveness)
  const task = [
    `Now generate the JSON object for this startup: "${safeName}".`,
    safeWebsite ? `Startup website: ${safeWebsite}` : '',
    'Use the context above to infer the target, what, and benefit.',
      'Follow the same structure and style as in the examples.',
      '',
      'Produce exactly one response: a single valid JSON object.',
      'The JSON object must contain exactly these keys and no others: "startup_name", "target", "what", "benefit".',
      `Set "startup_name" to "${safeName}".`,
      'Write each value ("target", "what", "benefit") as a short, clear business phrase.',
      'Return only the JSON object, with no extra text, explanations, or commentary before or after it.'
    ].join('\n');

  const sections = [baseIntro, contextPart, jsonFormatExplanation, examples, task];

  return sections.join('\n\n');
}


/**
 * Calls the LLM to generate a value proposition for a single startup.
 * - normalizes the website
 * - fetches the HTML and builds PageInfo (combinedText)
 * - builds a JSON-only prompt via buildVpPrompt(...)
 * - calls CallLlmJson and maps to a single sentence:
 *      "Startup X helps Y do W so that Z."
 */
function generateValueProp(startup: Startup, actionName: string = 'generateValueProp'): {
    website: string,
    value_proposition: string,
    category?: string,
    last_updated?: string,
} | null {
    const rawWebsite = startup.website || '';
    const websiteNorm = normalizeUrl(rawWebsite);
    
    if (!websiteNorm) {
        AppLogger.warn(actionName, 'Skipping value-prop generation: invalid/empty website', {startup: startup.name, website: rawWebsite});
        return null;
    }

    // Fetch HTML from the startup website.
    const fetchRes = fetchHtml(websiteNorm, undefined, actionName + '.fetchHtml');
    if (!fetchRes.ok || !fetchRes.content) {
        AppLogger.warn(actionName, 'Could not fetch startup website, skipping value-prop', {website: websiteNorm, statusCode: fetchRes.statusCode});
        return null;
    }

    // Build structured context from main/about/policy/cookies pages
    const pageInfo = buildPageInfo(websiteNorm, fetchRes.content, actionName + '.pageInfo');
    const context = pageInfo.combinedText || '';
    const safeName = startup.name && startup.name.trim() !== '' ? startup.name.trim() : websiteNorm;

    // System prompt: generic JSON-only helper.
    const systemPrompt = [
      'You are an assistant that must produce only JSON responses, never plain text.',
      'When the user gives you a JSON schema, respond with exactly one JSON object matching that schema, with no extra commentary.',
      'If you are unsure about some details, keep the phrasing generic rather than inventing very specific facts.'
    ].join(' ');

    const userPrompt = buildVpPrompt(safeName, websiteNorm, context);

    const json = CallLlmJson(systemPrompt, userPrompt, actionName);

    if (!json || typeof json !== 'object') {
        AppLogger.warn(actionName, 'LLM returned null or non-object JSON, skipping startup.', {website: websiteNorm});
        return null;
    }

    // extract fields.
    const startupName = typeof (json as any).startup_name === 'string' ? (json as any).startup_name.trim() : safeName;
    const target = typeof (json as any).target === 'string' ? (json as any).target.trim() : '';
    const what = typeof (json as any).what === 'string' ? (json as any).what.trim() : '';
    const benefit = typeof (json as any).benefit === 'string' ? (json as any).benefit.trim() : '';

    if (!target || !what || !benefit) {
        AppLogger.warn(actionName, 'LLM JSON missing some fields, skipping startup.', {website: websiteNorm});
        return null;
    }

    const sentence = `Startup ${startupName} helps ${target} do ${what} so that ${benefit}.`;
    const update = {
        website: websiteNorm,
        value_proposition: sentence,
        // empty category for the demo
        category: '',
        last_updated: new Date().toISOString(),
    }

    AppLogger.info(actionName, 'Generated value proposition for', {website: websiteNorm, name: startupName});

    return update;
}


interface GenerateValuePropResult {
    processed: number;
    updated: number;
    skippedNoWebsite: number;
    skippedError: number;
}


/**
 * scans the startups sheet and generate value propositions where missing.
 * - respects website as primary key
 * - Applies updates via StartupRepository.updateValuePropsByWebsite in batch.
 */
function generateMissingValueProps(batch_size: number = 5, actionName: string = 'generateMissingValueProps'): GenerateValuePropResult {
    const all = StartupRepository.getAll();
    if (all.length === 0) {
        AppLogger.info(actionName, 'No startups in sheet, nothing to do.');
        return {
            processed: 0,
            updated: 0,
            skippedNoWebsite: 0,
            skippedError: 0,
        };
    }
    // Filter startups where value_proposition is missing.
    const candidates = all.filter((s) => {
        const vp = (s.value_proposition || '').trim();
        return vp === '';
    });

    if (candidates.length === 0) {
        AppLogger.info(actionName, 'No startup with missing value proposition');
        return {
            processed: 0,
            updated: 0,
            skippedNoWebsite: 0,
            skippedError: 0,
        };
    }

    // Limit by batch size for each run (to avoid timeouts)
    const toProcess = candidates.slice(0, batch_size);

    let processed = 0;
    let updated = 0;
    let skippedNoWebsite = 0;
    let skippedError = 0;

    const updates: {
        website: string;
        value_proposition: string;
        category?: string;
        last_updated?: string;
    }[] = [];

    toProcess.forEach((startup) => {
        processed++;

        const rawWebsite = startup.website || '';
        const websiteNorm = normalizeUrl(rawWebsite);

        if (!websiteNorm) {
            skippedNoWebsite++;

            AppLogger.warn(actionName, 'Skipping startup with invalid/empty website', {name: startup.name, website: rawWebsite});
            return;
        }

        try {
            const upd = generateValueProp(startup, actionName + '.single');
            if (upd) {
                updates.push(upd);
                updated++;
            } else {
                skippedError++;
            }
        } catch (e) {
            AppLogger.warn(actionName, 'Unexpected error while generating value_proposition for startup', {name: startup.name, website: websiteNorm, error: e});
            skippedError++;
        }
    });

    // Apply updates to the sheet in one batch
    if (updates.length > 0) {
        StartupRepository.updateValuePropsByWebsite(updates);
    }

    const result: GenerateValuePropResult = {
        processed,
        updated,
        skippedNoWebsite,
        skippedError,
    }

    AppLogger.info(actionName, 'Completed batch value_proposition generation', result);

    return result;
}

/**
 * Curated startups list as fallback for the demo.
 */
function getCuratedDemoStartups(existingWebsites: Set<string>): Startup[] {
  const raw: {
    website: string,
    name: string,
    country: string,
    accelerator: string,
    category: string,
  }[] = [
    {
      website: 'https://www.revolut.com',
      name: 'Revolut',
      country: 'United Kingdom',
      accelerator: 'https://seedcamp.com',
      category: 'Fintech',
    },
    {
      website: 'https://www.transferwise.com',
      name: 'Wise',
      country: 'United Kingdom',
      accelerator: 'https://seedcamp.com',
      category: 'Fintech',
    },
    {
      website: 'https://www.n26.com',
      name: 'N26',
      country: 'Germany',
      accelerator: 'https://www.techstars.com/accelerators/london',
      category: 'Fintech',
    },
  ];

  const normalizedExisting = new Set<string>();
  existingWebsites.forEach((w) => {
    const n = normalizeUrl(w);
    if (n) {
      normalizedExisting .add(n);
    }
  });

  const nowIso = new Date().toISOString();
  const curated: Startup[] = [];

  raw.forEach((r) => {
    const normWebsite = normalizeUrl(r.website);
    const normAcc = normalizeUrl(r.accelerator);

    if (!normWebsite || normalizedExisting.has(normWebsite)) {
      return;
    }

    normalizedExisting.add(normWebsite);

    curated.push({
      website: normWebsite,
      name: r.name,
      country: r.country,
      accelerator: normAcc || r.accelerator,
      value_proposition: '',
      category: r.category || '',
      last_updated: nowIso,
    });
  });

  return curated;
}


interface InferStartupsFromAcc {
  acceleratorsTotal: number;
  acceleratorsScanned: number;
  acceleratorsNoPortfolio: number;
  startupsDiscovered: number;
  startupsAdded: number;
}

/**
 * Scans accelerators and discovers startups from their websites.
 * - reads all accelerators from accelerators sheet
 * - keep tracks of already scanned in ScriptProperties
 * - process at most batch_size accelerators (default = 2)
 * - for each accelerator:
 *    - parse main page
 *    - finds portfolio/alumni/startups links
 *    - for each page calls inferStartupsFromPortfolioPage(...)
 * - de-duplicates using website as primary key
 * - appends startups to sheet in batch
*/
function updateStartupsFromAccelerators(batch_size: number = 2, maxStartupsPerAcc: number = 3, 
  maxPagePerAcc: number = 3, actionName: string = 'updateStartupsFromAccelerators'): InferStartupsFromAcc {

    const accelerators = AcceleratorRepository.getAll();
    const totalAcc = accelerators.length;

    if (totalAcc === 0) {
      AppLogger.info(actionName, 'No accelerators in sheet, run scouting Accelerators to discover new ones.');
      return {
        acceleratorsTotal: 0,
        acceleratorsScanned: 0,
        acceleratorsNoPortfolio: 0,
        startupsDiscovered: 0,
        startupsAdded: 0
      };
    }

    const existingStartupWebsites = StartupRepository.getExistingWebsites();
    const props = PropertiesService.getScriptProperties();
    let cursorRaw = (props.getProperty(STARTUP_ACCEL_CURSOR_KEY) || '').trim();
    let cursor = parseInt(cursorRaw || '0', 10);
    if (isNaN(cursor) || cursor < 0 || cursor >= totalAcc) {
      cursor = 0;
    }

    let acceleratorsScanned = 0;
    let acceleratorsNoPortfolio = 0;
    let startupsDiscovered = 0;
    const newStartups: Startup[] = [];
    const newStartupWebsites = new Set<string>();
    const maxNewStartups = batch_size * maxStartupsPerAcc;

    // Process up to batchAccels accelerators, starting from `cursor` and wrapping around.
    for (let i=0; i < batch_size && acceleratorsScanned < totalAcc && newStartups.length < maxNewStartups; i++) {

      const accIndex = (cursor + i) % totalAcc;
      const accelerator = accelerators[accIndex];
      const accWebsite = normalizeUrl(accelerator.website);

      if (!accWebsite) {
        AppLogger.info(actionName, 'Skipping accelerator with invalid/empty website', {index: accIndex, website: accelerator.website});
        acceleratorsScanned++;
        continue;
      }

      acceleratorsScanned++;

      // Fetch main accelerator page.
      const fetchMain = fetchHtml(accWebsite, undefined, `${actionName}.fetchMain`);

      if (!fetchMain.ok || !fetchMain.content) {
        AppLogger.warn(actionName, 'Could not fetch accelerator website, skipping.', {website: accWebsite, statusCode: fetchMain.statusCode});
        continue;
      }

      // Find portfolio/startups/alumni links.
      const portfolioLinksAll = findStartupListLinks(accWebsite, fetchMain.content, `${actionName}.findStartupListLinks`);

      if (!portfolioLinksAll || portfolioLinksAll.length === 0) {
        acceleratorsNoPortfolio++;
        AppLogger.info(actionName, 'No portfolio page found, skipping.', {website: accWebsite});
        continue;
      }

      const portfolioLinks = portfolioLinksAll.slice(0, maxPagePerAcc);
      // Dedup startups for this accelerator by normalized website.
      const startupsForThisAccel = new Map<string, Startup>();

      for (let j=0; j < portfolioLinks.length; j++) {
        if (startupsForThisAccel.size >= maxStartupsPerAcc) {
          break;
        }

        const portfolioUrlRaw = portfolioLinks[j];
        const portfolioUrl = normalizeUrl(portfolioUrlRaw);
        if (!portfolioUrl) {
          continue;
        }

        const fetchPortfolio = fetchHtml(portfolioUrl, undefined, `${actionName}.fetchPortfolio`);
        if (!fetchPortfolio.ok || !fetchPortfolio.content) {
          AppLogger.warn(actionName, 'Could not fetch portfolio/startups page, skipping link.', {accelerator: accWebsite, portfolioUrl, statusCode: fetchPortfolio.statusCode});
          continue;
        }

        const inferred = inferStartupsFromPortfolioPage(portfolioUrl, fetchPortfolio.content, accelerator, `${actionName}.infer`);
        if (!inferred || inferred.length === 0) {
          continue;
        }

        inferred.forEach((st) => {
          if (startupsForThisAccel.size >= maxStartupsPerAcc ) {
            return;
          }

          const stWebNorm = normalizeUrl(st.website);
          if (!stWebNorm) {
            return;
          }

          // Quick health check: skip if startup website returns HTTP ≥ 400.
          const health = fetchHtml(stWebNorm, undefined, `${actionName}.healthCheck`);
          if (!health.ok || (typeof health.statusCode === 'number' && health.statusCode >= 400)) {
            AppLogger.warn(actionName, 'Startup website failed health check, skipping.', { accelerator: accWebsite, startupWebsite: stWebNorm, statusCode: health.statusCode,});
            return;
          }


          // Global dedup vs existing startups and this run's new startups.
          if (existingStartupWebsites.has(stWebNorm)) {
            return;
          }
          if (newStartupWebsites.has(stWebNorm)) {
            return;
          }

          const normalizedStartup: Startup = {
            website: stWebNorm,
            name: (st.name || stWebNorm).trim(),
            country: (st.country || 'Unknown').trim(),
            accelerator: accWebsite,
            value_proposition: st.value_proposition || '',
            category: st.category || '',
            last_updated: st.last_updated && st.last_updated.trim() !== '' ? st.last_updated.trim() : new Date().toISOString(),
          };

          startupsForThisAccel.set(stWebNorm, normalizedStartup);
        });
      }

      const startupsArray = Array.from(startupsForThisAccel.values());
      if (startupsArray.length > 0) {
        startupsDiscovered += startupsArray.length;
      }

        startupsArray.forEach((s) => {

          if (newStartups.length < maxNewStartups && !newStartupWebsites.has(s.website)) {
            newStartups.push(s);
            newStartupWebsites.add(s.website);
            existingStartupWebsites.add(s.website);

          }
        });
    }

    // If nothing was discovered, optionally use a curated demo fallback list.
    if (newStartups.length === 0) {
      const curated = getCuratedDemoStartups(existingStartupWebsites);
      if (curated.length > 0)  {
        newStartups.push(...curated);
        curated.forEach((s) => {
          existingStartupWebsites.add(s.website);
          newStartupWebsites.add(s.website);
        });
        startupsDiscovered += curated.length;
        AppLogger.info(actionName, 'Using curated demo startups fallback', {count: curated.length});
      }
    }

    if (newStartups.length > 0) {
      StartupRepository.appendMany(newStartups);
    }

    // Advance the accelerator cursor by the number of accelerators actually scanned.
    const nextCursor = (cursor + acceleratorsScanned) % totalAcc;
    props.setProperty(STARTUP_ACCEL_CURSOR_KEY, String(nextCursor));

    const result: InferStartupsFromAcc = {
      acceleratorsTotal: totalAcc,
      acceleratorsScanned,
      acceleratorsNoPortfolio,
      startupsDiscovered,
      startupsAdded: newStartups.length,
    };

    AppLogger.info(actionName, 'Completed startups update from accelerators', result);

    return result;
}