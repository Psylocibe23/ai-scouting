"use strict";
/**
 * Returns a sheet with the given name from the active spreadsheet.
 * If it does not exist, it creates it and optionally writes a header row.
 */
function getOrCreateSheet(sheetName, headers, headerRow) {
    if (headerRow === void 0) { headerRow = 1; }
    var SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SpreadSheet.getSheetByName(sheetName);
    if (!sheet) {
        sheet = SpreadSheet.insertSheet(sheetName);
        if (headers && headers.length > 0) {
            sheet.getRange(headerRow, 1, 1, headers.length).setValues([headers]);
        }
    }
    return sheet;
}
/**
 * Adjusts the widths of the first `numCols` columns based on content length,
 * with both minimum and maximum width caps to avoid huge columns.
 */
function adjustColumnWidths(sheet, numCols, maxChars, minWidthPx, maxWidthPx) {
    if (maxChars === void 0) { maxChars = 60; }
    if (minWidthPx === void 0) { minWidthPx = 60; }
    if (maxWidthPx === void 0) { maxWidthPx = 500; }
    var lastRow = sheet.getLastRow();
    if (lastRow < 1) {
        return;
    }
    var data = sheet.getRange(1, 1, lastRow, numCols).getValues();
    var PX_PER_CHAR = 8; // rough approximation of pixels per character
    for (var col = 0; col < numCols; col++) {
        var maxLen = 0;
        for (var row = 0; row < data.length; row++) {
            var val = data[row][col];
            var len = val == null ? 0 : String(val).length;
            if (len > maxLen) {
                maxLen = len;
            }
        }
        var effectiveChars = Math.min(maxChars, Math.max(5, maxLen));
        var width = Math.min(maxWidthPx, Math.max(minWidthPx, effectiveChars * PX_PER_CHAR));
        sheet.setColumnWidth(col + 1, width);
    }
}
