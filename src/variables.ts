const SERPAPI_MONTHLY_CALL_LIMIT = 240; // safety margin = 10
const SERPAPI_USAGE_MONTH_KEY  = 'SERPAPI_USAGE_MONTH';
const SERPAPI_USAGE_COUNT_KEY  = 'SERPAPI_USAGE_COUNT';
// Tracks where we are in the Google result pages for SerpAPI ("start" parameter).
const SERPAPI_START_INDEX_KEY = 'SERPAPI_START_INDEX'; 
// Tracks which accelerator index we last processed for startup discovery.
const STARTUP_ACCEL_CURSOR_KEY = 'STARTUP_ACCEL_CURSOR';