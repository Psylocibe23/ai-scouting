/**
 * Returns a sheet with the given name from the active spreadsheet.
 * If it does not exist, it creates it and optionally writes a header row.
 */
function getOrCreateSheet(
  sheetName: string,
  headers?: string[],
  headerRow: number = 1
): GoogleAppsScript.Spreadsheet.Sheet {
  const SpreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = SpreadSheet.getSheetByName(sheetName);

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
function adjustColumnWidths(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  numCols: number,
  maxChars: number = 60,
  minWidthPx: number = 60,
  maxWidthPx: number = 500
): void {
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return;
  }

  const data = sheet.getRange(1, 1, lastRow, numCols).getValues();
  const PX_PER_CHAR = 8; // rough approximation of pixels per character

  for (let col = 0; col < numCols; col++) {
    let maxLen = 0;

    for (let row = 0; row < data.length; row++) {
      const val = data[row][col];
      const len = val == null ? 0 : String(val).length;
      if (len > maxLen) {
        maxLen = len;
      }
    }

    const effectiveChars = Math.min(maxChars, Math.max(5, maxLen));
    const width = Math.min(
      maxWidthPx,
      Math.max(minWidthPx, effectiveChars * PX_PER_CHAR)
    );

    sheet.setColumnWidth(col + 1, width);
  }
}
