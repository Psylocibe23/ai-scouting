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
    SpreadSheet.toast('Running smart accelerator scouting (SerpAPI + HTML fetching and parsing + LLM + Fallback)...');
    try {
        var BATCH_SIZE = 3;
        var result = scoutAcceleratorsSmart(BATCH_SIZE);
        var msg = "Accelerator Scouting added: ".concat(result.totalAdded, " ") +
            "(SerpAPI: ".concat(result.addedFromSerp, ", curated list: ").concat(result.addedFromCurated, "), ") +
            "already present: ".concat(result.alreadyPresent, ".");
        SpreadSheet.toast(msg);
    }
    catch (e) {
        AppLogger.error('runScoutingAccelerators', 'Unexpected error during smart accelerator scouting', e);
        SpreadSheet.toast('Error during smart accelerator scouting, check logs.');
    }
}
function runUpdateStartups() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Updating startups from accelerator websites (portfolio/alumni/batch pages)...');
    try {
        var BATCH_ACCELERATORS = 3; // how many accelerators per run
        var MAX_STARTUPS_PER_ACC = 3; // cap startups per accelerator
        var MAX_PAGES_PER_ACC = 3; // cap portfolio pages per accelerator
        var result = updateStartupsFromAccelerators(BATCH_ACCELERATORS, MAX_STARTUPS_PER_ACC, MAX_PAGES_PER_ACC);
        var msg = "Startups update completed. " +
            "Accelerators scanned: ".concat(result.acceleratorsScanned, "/").concat(result.acceleratorsTotal, ". ") +
            "Without portfolio page: ".concat(result.acceleratorsNoPortfolio, ". ") +
            "Startups discovered: ".concat(result.startupsDiscovered, ", ") +
            "added to sheet: ".concat(result.startupsAdded, ".");
        ss.toast(msg);
    }
    catch (e) {
        AppLogger.error('runUpdateStartups', 'Unexpected error while updating startups from accelerators', e);
        ss.toast('Error while updating startups from accelerators, check logs.');
    }
}
function runGenerateValueProps() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Generating value propositions for startups with missing text...');
    try {
        var BATCH_SIZE = 5; // or 3 for demo safety
        var result = generateMissingValueProps(BATCH_SIZE);
        var msg = "Value propositions generation completed. " +
            "Processed: ".concat(result.processed, ", ") +
            "updated: ".concat(result.updated, ", ") +
            "skipped (no website): ".concat(result.skippedNoWebsite, ", ") +
            "skipped (errors/LLM): ".concat(result.skippedError, ".");
        ss.toast(msg);
    }
    catch (e) {
        AppLogger.error('runGenerateValueProps', 'Unexpected error', e);
        ss.toast('Error during value proposition generation, check logs.');
    }
}
function runExportCsv() {
    var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    SpreadSheet.toast("runExportCsv called correctly.");
}
