/**
 * Configurations to call LLM provider.
 */
interface LlmConfig {
    provider: string;
    model: string;
    apiKey: string; // API KEY from Script Properties 
}


/**
 * Read data from LLM interface and validates them.
 */
function getLlmConfig(): LlmConfig {
    const props = PropertiesService.getScriptProperties();

    const provider = (props.getProperty('LLM_PROVIDER') || '').trim();
    const model = (props.getProperty('LLM_MODEL') || '').trim();

    // Try multiple options for API KEY
    const apiKeyCandidates = ['LLM_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'API_KEY']

    let apiKey = '';
    for (let i = 0; i < apiKeyCandidates.length; i++) {
        const val = props.getProperty(apiKeyCandidates[i]);
        if (val && val.trim() !== '') {
            apiKey = val.trim();
            break;
        }
    }

    if (!provider) {
        throw new Error('LLM_PROVIDER script property is missing or empty');
    }

    if (!model) {
        throw new Error('LLM_MODEL script property is missing or empty');
    }

    if (!apiKey) {
        throw new Error('LLM API key not found. Please set one of: LLM_API_KEY, API_KEY, GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in Script Properties.');
    }

    return {
        provider,
        model,
        apiKey,
    };
}


/**
 * Use fetched metadata to create context proposition for LLM prompt
 */
function buildWebsiteContext(html: string): string {
    const meta = extractPageMeta(html);
    const h1 = extractMainHeading(html);

    const parts: string[] = [];

    if (meta.title) {
        parts.push(meta.title);
    }

    if (meta.description) {
        parts.push(meta.description);
    }

    if (h1) {
        parts.push(h1)
    }
    // Join and truncate to keep context compact
    const joined = parts.join(' | ');
     return joined.length > 500 ? joined.slice(0, 500) : joined;
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
function buildPrompt(startupName: string, website: string, context: string): string {
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
