"use strict";
/**
 * Read data from LLM interface and validates them.
 */
function getLlmConfig() {
    var props = PropertiesService.getScriptProperties();
    var provider = (props.getProperty('LLM_PROVIDER') || '').trim();
    var model = (props.getProperty('LLM_MODEL') || '').trim();
    // Try multiple options for API KEY
    var apiKeyCandidates = ['LLM_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'API_KEY'];
    var apiKey = '';
    for (var i = 0; i < apiKeyCandidates.length; i++) {
        var val = props.getProperty(apiKeyCandidates[i]);
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
        provider: provider,
        model: model,
        apiKey: apiKey,
    };
}
/**
 * Use fetched metadata to create context proposition for LLM prompt
 */
function buildWebsiteContext(html) {
    var meta = extractPageMeta(html);
    var h1 = extractMainHeading(html);
    var parts = [];
    if (meta.title) {
        parts.push(meta.title);
    }
    if (meta.description) {
        parts.push(meta.description);
    }
    if (h1) {
        parts.push(h1);
    }
    // Join and truncate to keep context compact
    var joined = parts.join(' | ');
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
function buildVpPrompt(startupName, website, context) {
    var safeName = startupName.trim() || 'this startup';
    var safeWebsite = website.trim();
    // Role prompting (better quality output)
    var baseIntro = [
        'You are an assistant that writes concise, business-style value propositions for startups.',
        'Use the website information to infer what the startup does, who it serves, and what main benefit it provides.'
    ].join(' ');
    // Context from the scraped HTML (title, meta description, h1, ...)
    var contextPart = context
        ? "Here is some information extracted from the startup website:\n\n\"".concat(context.trim(), "\"\n")
        : 'No additional website text was available for this startup.';
    // Structured output: JSON schema + constraints (robustness and hallucination reduction)
    var jsonFormatExplanation = [
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
    var examples = [
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
    var task = [
        "Now generate the JSON object for this startup: \"".concat(safeName, "\"."),
        safeWebsite ? "Startup website: ".concat(safeWebsite) : '',
        'Use the context above to infer the target, what, and benefit.',
        'Follow the same structure and style as in the examples.',
        '',
        'Produce exactly one response: a single valid JSON object.',
        'The JSON object must contain exactly these keys and no others: "startup_name", "target", "what", "benefit".',
        "Set \"startup_name\" to \"".concat(safeName, "\"."),
        'Write each value ("target", "what", "benefit") as a short, clear business phrase.',
        'Return only the JSON object, with no extra text, explanations, or commentary before or after it.'
    ].join('\n');
    var sections = [baseIntro, contextPart, jsonFormatExplanation, examples, task];
    return sections.join('\n\n');
}
/**
 * Calls the configured LLM provider (Groq / OpenAI-compatible) and expects
 * a SINGLE JSON object in the response content.
 * - uses getLlmConfig() for provider/model/apiKey
 * - sends system + user messages to the /chat/completions endpoint
 * - forces temperature=0 and response_format=json_object for deterministic JSON
 * - on success: returns the parsed JSON object
 * - on failure: logs and returns null.
 */
function CallLlmJson(systemPrompt, userPrompt, actionName) {
    var config = getLlmConfig();
    var provider = config.provider.toLowerCase();
    // Groq provider endpoint
    var endpoint;
    if (provider === 'groq') {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    }
    else {
        if (provider.startsWith('http')) {
            endpoint = provider;
        }
        else {
            endpoint = 'https://api.openai.com/v1/chat/completions';
        }
    }
    var body = {
        model: config.model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 512,
    };
    var options = {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + config.apiKey, },
        payload: JSON.stringify(body),
    };
    try {
        var start = new Date().getTime();
        var resp = UrlFetchApp.fetch(endpoint, options);
        var end = new Date().getTime();
        var status = resp.getResponseCode();
        var text = resp.getContentText() || '';
        if (status < 200 || status >= 300) {
            AppLogger.error(actionName, 'LLM HTTP error', { statusCode: status, bodyPreview: text.slice(0, 200) });
            return null;
        }
        var data = void 0;
        try {
            data = JSON.parse(text);
        }
        catch (parseRespErr) {
            AppLogger.error(actionName, 'Failed to parse LLM HTTP JSON response', { error: String(parseRespErr), bodyPreview: text.slice(0, 200) });
            return null;
        }
        var usage = data && data.usage ? data.usage : undefined;
        AppLogger.info(actionName, 'LLM call succeeded', { statusCode: status, durationMs: end - start, usage: usage, });
        if (!data.choices ||
            !data.choices[0] ||
            !data.choices[0].message ||
            !data.choices[0].message.content) {
            AppLogger.error(actionName, 'LLM response missing choices[0].message.content', data);
            return null;
        }
        var content = String(data.choices[0].message.content || '').trim();
        // Be robust against ```json ... ``` wrappers
        if (content.startsWith('```')) {
            content = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        }
        // take substring between first '{' and last '}' if needed
        var firstBrace = content.indexOf('{');
        var lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            content = content.substring(firstBrace, lastBrace + 1).trim();
        }
        try {
            var obj = JSON.parse(content);
            return obj;
        }
        catch (jsonErr) {
            AppLogger.error(actionName, 'LLM did not return valid JSON in message.content', { error: String(jsonErr), rawContentPreview: content.slice(0, 300) });
            return null;
        }
    }
    catch (e) {
        AppLogger.error(actionName, 'Exception while calling LLM endpoint', e);
        return null;
    }
}
