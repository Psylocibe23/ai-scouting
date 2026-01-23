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
 * Builds a prompt to be passed to LLM to generate a value proposition for a startup.
 * The LLM is instructed to produce exactly one sentence of the format:
 *      "Startup <X> helps <target Y> do <what W> so that <benefit Z>."
 */
function buildPrompt(startupName: string, website: string, context: string): string {
    const safeName = startupName.trim() || 'this startup';
    const safeWebsite = website.trim();

    const baseIntro = [
    'You are an assistant that writes concise, business-style value propositions for startups.',
    'Use the website information to infer what the startup does, who it serves, and what main benefit it provides.',
    ].join(' ');

    const contextPart = context? `Here is some information extracted from the startup website:\n\n"${context.trim()}"\n\n`: '';

    const instruction = [
    'Write EXACTLY ONE sentence in the following format:',
    'Startup <X> helps <Target Y> do <What W> so that <Benefit Z>.',
    `Replace <X> with the startup name "${safeName}".`,
    'Do not add bullet points, explanations, or extra sentences.',
    'Do not mention that this is a value proposition.',
    ].join(' ');

    const websiteLine = safeWebsite? `The startup website is: ${safeWebsite}\n`: '';

    const prompt = [baseIntro, contextPart, instruction, websiteLine].join('\n\n');

    return prompt;

}