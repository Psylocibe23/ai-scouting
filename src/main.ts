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
    SpreadSheet.toast("Running accelerator scouting (small curated batch)...")

    try {
        const BATCH_SIZE = 10;
        const result = scoutAccelerators(BATCH_SIZE);
        SpreadSheet.toast(`Accelerator scouting: added ${result.added}, already present ${result.alreadyPresent} (candidates: ${result.totalCandidates}).`);
    } catch (e) {
        AppLogger.error('runScoutingAccelerators', 'Unexpected error during accelerator scouting', e);
        SpreadSheet.toast('Error during runScoutingAccelerators, check logs.')
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