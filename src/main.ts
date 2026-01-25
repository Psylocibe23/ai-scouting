function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Startup Scouting AI')
    .addItem('Scouting Accelerators', 'runScoutingAccelerators')
    .addItem('Update Startups', 'runUpdateStartups')
    .addItem('Generate Value Propositions', 'runGenerateValueProps')
    .addItem('Export CSVs', 'runExportCsv')
    .addToUi();
}

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

function runUpdateStartups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Updating startups from accelerator websites (portfolio/alumni/batch pages)...');

  try {
    const BATCH_ACCELERATORS = 3; // how many accelerators per run
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

function runExportCsv() {
    const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runExportCsv called correctly.")
}