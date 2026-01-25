/**
 * Reset all tracking-related ScriptProperties (cursors, startIndex).
 */
function resetTrackingProperties(actionName: string = 'resetTrackingProperties'): void {
  const props = PropertiesService.getScriptProperties();

  // Delete old tracker values (if present)
  const trackerKeys = [SERPAPI_START_INDEX_KEY, STARTUP_ACCEL_CURSOR_KEY];

  trackerKeys.forEach((key) => {
    if (!key) return;
    props.deleteProperty(key);
  });

  // Re-initialize to a clean baseline
  props.setProperty(SERPAPI_START_INDEX_KEY, '0');
  props.setProperty(STARTUP_ACCEL_CURSOR_KEY, '0');

  AppLogger.info(actionName, 'Tracking ScriptProperties reset');
}


/**
 * Clears all data rows from a sheet while preserving the header row.
 */
function clearSheetDataRows(sheet: GoogleAppsScript.Spreadsheet.Sheet, actionName: string): void {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // Nothing to clear (no data or just header)
  if (lastRow <= 1 || lastCol === 0) {
    AppLogger.info(actionName, 'No data rows to clear (header only or empty sheet).');
    return;
  }

  // Clear content but keep formatting/header
  sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
}

/**
 * Clear both "accelerators" and "startups" data sheets (headers preserved).
 */
function resetSheets(actionName: string = 'resetSheets'): void {
  const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();

  const accSheet = SpreadSheet.getSheetByName('accelerators');
  const startupSheet = SpreadSheet.getSheetByName('startups');

  if (accSheet) {
    clearSheetDataRows(accSheet, actionName + '.accelerators');
  } else {
    AppLogger.warn(actionName, 'Accelerators sheet not found, skipping clear.');
  }

  if (startupSheet) {
    clearSheetDataRows(startupSheet, actionName + '.startups');
  } else {
    AppLogger.warn(actionName, 'Startups sheet not found, skipping clear.');
  }

  AppLogger.info(actionName, 'Cleared accelerators and startups data (headers preserved).');
}
