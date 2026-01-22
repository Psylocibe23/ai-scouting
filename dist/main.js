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
    SpreadSheet.toast("runScoutingAccelerators called correctly.");
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
