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
    SpreadSheet.toast('Running smart accelerator scouting (SerpAPI + HTML fetching and parsing + LLM + Fallback)...'):

    try {
        const BATCH_SIZE = 3;
        const result = scoutAcceleratorsSmart(BATCH_SIZE);

        const msg = 
        `Accelerator Scouting added: ${result.totalAdded} ` +
        `(SerpAPI: ${result.addedFromSerp}, cyrated list: ${result.addedFromCurated}), ` + 
        `already present: ${result.alreadyPresent}.`

        SpreadSheet.toast(msg);
    } catch (e) {
        AppLogger.error('runScoutingAccelerators', 'Unexpected error during smart accelerator scouting', e);
        SpreadSheet.toast('Error during smart accelerator scoutin, check logs.')
    }
}

function runUpdateStartups() {
    const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runUpdateStartups called correctly.")
}

function runGenerateValueProps() {
    const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runGenerateValueProps called correctly.")
}

function runExportCsv() {
    const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runExportCsv called correctly.")
}