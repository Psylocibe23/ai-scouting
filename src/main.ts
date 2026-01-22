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
    SpreadSheet.toast("runScoutingAccelerators called correctly.")
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