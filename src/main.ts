function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Startup Scouting AI')
    .addItem('Scouting Accelerators', 'runScoutingAccelerators')
    .addItem('Update Startups', 'runUpdateStartups')
    .addItem('Generate Value Propositions', 'runGenerateValueProps')
    .addItem('Reset Spreadsheet', 'runResetSpreadsheet')
    .addToUi();
}


/**
 * runScoutingAccelerators:
 * - Calls scoutAcceleratorsSmart(...) which:
 *   - Queries SerpAPI for European accelerators
 *   - Fetches and parses HTML to validate them
 *   - Uses an LLM (Groq) to extract name/country when needed
 *   - Falls back to a curated list for demo robustness
 * - Writes new accelerators to the "accelerators" sheet
 * - Keeps the process idempotent by using website as primary key.
 */
function runScoutingAccelerators() {
    const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast('Running smart accelerator scouting (SerpAPI + HTML fetching and parsing + LLM + Fallback)...');

    try {
        const BATCH_SIZE = 3;
        const result = scoutAcceleratorsSmart(BATCH_SIZE);

        const msg = 
        `Accelerator Scouting added: ${result.totalAdded} ` +
        `(SerpAPI: ${result.addedFromSerp}, curated list: ${result.addedFromCurated}), ` + 
        `already present: ${result.alreadyPresent}.`;

        SpreadSheet.toast(msg);
    } catch (e) {
        AppLogger.error('runScoutingAccelerators', 'Unexpected error during smart accelerator scouting', e);
        SpreadSheet.toast('Error during smart accelerator scouting, check logs.');
    }
}


/**
 * runUpdateStartups:
 * - Reads accelerators from the "accelerators" sheet
 * - For a small batch of accelerators (cursor-based pagination):
 *   - Fetches the main website
 *   - Heuristically finds portfolio/alumni/startups pages
 *   - Uses an LLM to extract startups (name, website, country)
 *   - De-duplicates using website as primary key
 * - Appends new startups to the "startups" sheet
 * - If nothing is found, falls back to a small curated list.
 */
function runUpdateStartups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Updating startups from accelerator websites (portfolio/alumni/batch pages)...');

  try {
    const BATCH_ACCELERATORS = 2; // how many accelerators per run
    const MAX_STARTUPS_PER_ACC = 3; // cap startups per accelerator
    const MAX_PAGES_PER_ACC = 3; // cap portfolio pages per accelerator

    const result = updateStartupsFromAccelerators(
      BATCH_ACCELERATORS,
      MAX_STARTUPS_PER_ACC,
      MAX_PAGES_PER_ACC
    );

    const msg =
      `Startups update completed. ` +
      `Accelerators scanned: ${result.acceleratorsScanned}/${result.acceleratorsTotal}. ` +
      `Without portfolio page: ${result.acceleratorsNoPortfolio}. ` +
      `Startups discovered: ${result.startupsDiscovered}, ` +
      `added to sheet: ${result.startupsAdded}.`;

    ss.toast(msg);
  } catch (e) {
    AppLogger.error('runUpdateStartups', 'Unexpected error while updating startups from accelerators', e);
    ss.toast('Error while updating startups from accelerators, check logs.');
  }
}


/**
 * runGenerateValueProps:
 * - Scans the "startups" sheet
 * - For startups with an empty value_proposition:
 *   - Fetches the startup website
 *   - Builds a compact textual context (title, meta, H1/H2, etc.)
 *   - Calls the LLM (Groq) with a JSON-only, few-shot prompt
 *   - Maps the JSON to a sentence:
 *       "Startup X helps Target Y do What W so that Benefit Z."
 * - Updates the sheet in batch, with logging and error handling.
 */
function runGenerateValueProps() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Generating value propositions for startups with missing text...');

  try {
    const BATCH_SIZE = 5; // or 3 for demo safety
    const result = generateMissingValueProps(BATCH_SIZE);

    const msg =
      `Value propositions generation completed. ` +
      `Processed: ${result.processed}, ` +
      `updated: ${result.updated}, ` +
      `skipped (no website): ${result.skippedNoWebsite}, ` +
      `skipped (errors/LLM): ${result.skippedError}.`;

    ss.toast(msg);
  } catch (e) {
    AppLogger.error('runGenerateValueProps', 'Unexpected error', e);
    ss.toast('Error during value proposition generation, check logs.');
  }
}



/**
 * Full reset: tracker ScriptProperties + sheet data (headers preserved).
 * Useful to re-run the whole pipeline from scratch.
 */
function runResetSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Resetting tracking state and clearing accelerators/startups data...');

  try {
    resetTrackingProperties();
    resetSheets();

    ss.toast('Reset completed: properties + data cleared (headers preserved).');
  } catch (e) {
    AppLogger.error('runResetSpreadsheet', 'Unexpected error during reset', e);
    ss.toast('Error during reset, check logs.');
  }
}



