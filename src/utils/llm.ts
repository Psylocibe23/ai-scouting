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
    const apiKeyCandidates = ['LLM_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'API_KEY'];

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
 * Builds an LLM-ready context string from a website HTML:
 * - uses buildPageInfo (main + aux pages)
 * - falls back to simple meta + H1 if something goes wrong.
 */
function buildWebsiteContext(url: string, html: string, actionName: string = 'buildWebsiteContext'): string {
  if (!html) return '';

  try {
    const pageInfo = buildPageInfo(url, html, actionName + '.page');
    return pageInfo.combinedText;
  } catch (e) {
    AppLogger.error(actionName, 'Error while building PageInfo; falling back to simple context', e);

    const meta = extractPageMeta(html, actionName + '.fallback.meta');
    const h1 = extractMainHeading(html, actionName + '.fallback.h1');

    const parts: string[] = [];
    if (meta.title) parts.push(meta.title);
    if (meta.description) parts.push(meta.description);
    if (h1) parts.push(h1);

    const joined = parts.join(' | ');
    return joined.length > 500 ? joined.slice(0, 500) : joined;
  }
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
function CallLlmJson(systemPrompt: string, userPrompt: string, actionName: string): any | null {
    const config = getLlmConfig();
    const provider = config.provider.toLowerCase();
    // Groq provider endpoint
    let endpoint: string;
    if (provider === 'groq') {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions';
    } else {
        if (provider.startsWith('http')) {
            endpoint = provider;
        } else {
            endpoint = 'https://api.openai.com/v1/chat/completions';
        }
    }

    const body = {
        model: config.model,
        messages: [
            {role: 'system', content: systemPrompt},
            {role: 'user', content: userPrompt}
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 512,
    };

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        method: 'post',
        muteHttpExceptions: true,
        contentType: 'application/json',
        headers: {Authorization: 'Bearer ' + config.apiKey,},
        payload: JSON.stringify(body),
    };

    try {
        const start = new Date().getTime();
        const resp = UrlFetchApp.fetch(endpoint, options);
        const end = new Date().getTime();
        const status = resp.getResponseCode();
        const text = resp.getContentText() || '';

        if (status < 200 || status >= 300) {
            AppLogger.error(actionName, 'LLM HTTP error', { statusCode: status, bodyPreview: text.slice(0, 200) });
            return null;
        }

        let data: any;
        try {
            data = JSON.parse(text);
        } catch (parseRespErr) {
            AppLogger.error(actionName, 'Failed to parse LLM HTTP JSON response', { error: String(parseRespErr), bodyPreview: text.slice(0, 200) });
            return null;
        }

        const usage = data && data.usage ? data.usage : undefined;
        AppLogger.info(actionName, 'LLM call succeeded', {statusCode: status, durationMs: end - start, usage: usage,});

        if (!data.choices ||
            !data.choices[0] ||
            !data.choices[0].message ||
            !data.choices[0].message.content
        ) {
            AppLogger.error(actionName, 'LLM response missing choices[0].message.content', data);
            return null;
        }

        let content: string = String(data.choices[0].message.content || '').trim();

        // Be robust against ```json ... ``` wrappers
        if (content.startsWith('```')) {
            content = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
        }

        // take substring between first '{' and last '}' if needed
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            content = content.substring(firstBrace, lastBrace + 1).trim();
        }

        try {
            const obj = JSON.parse(content);
            return obj;
        } catch (jsonErr) {
            AppLogger.error(actionName, 'LLM did not return valid JSON in message.content', { error: String(jsonErr), rawContentPreview: content.slice(0, 300) });
            return null;
        }
    } catch (e) {
        AppLogger.error(actionName, 'Exception while calling LLM endpoint', e);
        return null;
    }
}