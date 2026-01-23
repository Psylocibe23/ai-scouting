"use strict";
function onOpen() {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu('Startup Scouting AI')
        .addItem('Scouting Accelerators', 'runScoutingAccelerators')
        .addItem('Update Startups', 'runUpdateStartups')
        .addItem('Generate Value Propositions', 'runGenerateValueProps')
        .addItem('Export CSVs', 'runExportCsv')
        .addToUi();
}
function runScoutingAccelerators() {
    var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("Running accelerator scouting (small curated batch)...");
    try {
        var BATCH_SIZE = 10;
        var result = scoutAccelerators(BATCH_SIZE);
        SpreadSheet.toast("Accelerator scouting: added ".concat(result.added, ", already present ").concat(result.alreadyPresent, " (candidates: ").concat(result.totalCandidates, ")."));
    }
    catch (e) {
        AppLogger.error('runScoutingAccelerators', 'Unexpected error during accelerator scouting', e);
        SpreadSheet.toast('Error during runScoutingAccelerators, check logs.');
    }
}
function runUpdateStartups() {
    var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runUpdateStartups called correctly.");
}
function runGenerateValueProps() {
    var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runGenerateValueProps called correctly.");
}
function runExportCsv() {
    var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runExportCsv called correctly.");
}
