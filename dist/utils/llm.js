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
 * Builds a prompt to be passed to LLM to generate a value proposition for a startup.
 * The LLM is instructed to produce exactly one sentence of the format:
 *      "Startup <X> helps <target Y> do <what W> so that <benefit Z>."
 */
function buildPrompt(startupName, website, context) {
    var safeName = startupName.trim() || 'this startup';
    var safeWebsite = website.trim();
    var baseIntro = [
        'You are an assistant that writes concise, business-style value propositions for startups.',
        'Use the website information to infer what the startup does, who it serves, and what main benefit it provides.',
    ].join(' ');
    var contextPart = context ? "Here is some information extracted from the startup website:\n\n\"".concat(context.trim(), "\"\n\n") : '';
    var instruction = [
        'Write EXACTLY ONE sentence in the following format:',
        'Startup <X> helps <Target Y> do <What W> so that <Benefit Z>.',
        "Replace <X> with the startup name \"".concat(safeName, "\"."),
        'Do not add bullet points, explanations, or extra sentences.',
        'Do not mention that this is a value proposition.',
    ].join(' ');
    var websiteLine = safeWebsite ? "The startup website is: ".concat(safeWebsite, "\n") : '';
    var prompt = [baseIntro, contextPart, instruction, websiteLine].join('\n\n');
    return prompt;
}
