"use strict";
var StartupRepository = /** @class */ (function () {
    function StartupRepository() {
    }
    /**
     * Creates the startup sheet, creating it with header if needed.
     */
    StartupRepository.getSheet = function () {
        return getOrCreateSheet(StartupRepository.SHEET_NAME, ['website', 'name', 'country', 'accelerator', 'value_proposition', 'category', 'last_updated'], StartupRepository.HEADER_ROW);
    };
    /**
     * Reads all startups from the sheet and returns them as Startup objects.
     */
    StartupRepository.getAll = function () {
        var sheet = StartupRepository.getSheet();
        var lastRow = sheet.getLastRow();
        if (lastRow <= StartupRepository.HEADER_ROW) {
            // no data row
            return [];
        }
        var numRows = lastRow - StartupRepository.HEADER_ROW;
        var values = sheet.getRange(StartupRepository.HEADER_ROW + 1, 1, numRows, StartupRepository.NUM_COLS)
            .getValues();
        var startups = values.map(function (row) {
            var rawWebsite = String(row[0] || '').trim();
            var website = normalizeUrl(rawWebsite);
            var name = String(row[1] || '').trim();
            var country = String(row[2] || '').trim();
            var accelerator = String(row[3] || '').trim();
            var value_proposition = String(row[4] || '').trim();
            var rawCategory = row[5];
            var rawLastUpdated = row[6];
            var category = rawCategory !== null && rawCategory !== undefined && String(rawCategory).trim() !== ''
                ? String(rawCategory).trim() : undefined;
            var last_updated = rawLastUpdated !== null && rawLastUpdated !== undefined && String(rawLastUpdated).trim() !== ''
                ? String(rawLastUpdated).trim() : undefined;
            return {
                website: website,
                name: name,
                country: country,
                accelerator: accelerator,
                value_proposition: value_proposition,
                category: category,
                last_updated: last_updated,
            };
        }).filter(function (a) { return a.website !== ''; });
        return startups;
    };
    /**
     * Returns a Set of existing startup websites (used as primary keys).
     */
    StartupRepository.getExistingWebsites = function () {
        var existing = StartupRepository.getAll();
        var set = new Set();
        existing.forEach(function (a) {
            if (a.website) {
                set.add(a.website);
            }
        });
        return set;
    };
    /**
     * Appends multiple startups to the sheet in a single batch write
     * and adjusts column widths for readability.
     */
    StartupRepository.appendMany = function (stups) {
        if (stups.length === 0) {
            return;
        }
        var sheet = StartupRepository.getSheet();
        var lastRow = sheet.getLastRow();
        var startRow = lastRow + 1;
        var rows = stups.map(function (a) { return [
            a.website,
            a.name,
            a.country,
            a.accelerator,
            a.value_proposition || '',
            a.category || '',
            a.last_updated || '',
        ]; });
        sheet.getRange(startRow, 1, rows.length, StartupRepository.NUM_COLS).setValues(rows);
        sheet.getRange(startRow, 1, rows.length, StartupRepository.NUM_COLS).setHorizontalAlignment('center');
        adjustColumnWidths(sheet, StartupRepository.NUM_COLS);
    };
    /**
     * Updates value_proposition and optionally also category/last_update
     * for existing startups, matching rows by normalized website.
     * If website is not found in sheet, update is skipped.
     */
    StartupRepository.updateValuePropsByWebsite = function (updates) {
        var action = 'StartupRepository.updateValuePropsByWebsite';
        if (!updates || updates.length === 0) {
            AppLogger.info(action, 'No updates provided, nothing to do.');
            return;
        }
        var sheet = StartupRepository.getSheet();
        var lastRow = sheet.getLastRow();
        if (lastRow <= StartupRepository.HEADER_ROW) {
            AppLogger.warn(action, 'No startup rows in the sheet, cannot apply updates.');
            return;
        }
        var numRows = lastRow - StartupRepository.HEADER_ROW;
        // Read all rows in order to have a lookup by normalized website
        var values = sheet.getRange(StartupRepository.HEADER_ROW + 1, 1, numRows, StartupRepository.NUM_COLS).getValues();
        // Map normalized websites to indexes in values (0 based)
        var indexByWebsite = {};
        for (var i = 0; i < values.length; i++) {
            var rawWebsite = String(values[i][0] || '').trim();
            var normalized = normalizeUrl(rawWebsite);
            if (normalized) {
                // If duplicates, keep first occurence
                if (indexByWebsite[normalized] === undefined) {
                    indexByWebsite[normalized] = i;
                }
            }
        }
        var updatedCount = 0;
        updates.forEach(function (u) {
            var norm = normalizeUrl(u.website);
            if (!norm) {
                AppLogger.warn(action, 'Skipping update with empty/invalid website', { website: u.website });
                return;
            }
            var rowIndexInValues = indexByWebsite[norm];
            // If we don't find a row for this website, skip
            if (rowIndexInValues === undefined) {
                AppLogger.warn(action, 'No startup row found for website, skipping update', { website: u.website });
                return;
            }
            // Convert 0-based `values` index to actual sheet row index
            var sheetRow = StartupRepository.HEADER_ROW + 1 + rowIndexInValues;
            var value_proposition = u.value_proposition || '';
            var category = u.category || '';
            var last_updated = u.last_updated && u.last_updated.trim() !== ''
                ? u.last_updated.trim() : new Date().toISOString();
            // Columns: 5 = value_proposition, 6 = category, 7 = last_updated
            sheet.getRange(sheetRow, 5, 1, 3).setValues([[value_proposition, category, last_updated]]);
            updatedCount++;
        });
        AppLogger.info(action, "Applied value_proposition updates to ".concat(updatedCount, " startups out of ").concat(updates.length, " requested."));
        if (updatedCount > 0) {
            formatStartupsSheetAfterVpUpdate(sheet, "".concat(action, ".format"));
        }
    };
    StartupRepository.SHEET_NAME = 'startups';
    StartupRepository.HEADER_ROW = 1;
    StartupRepository.NUM_COLS = 7; // website, name, country, accelerator, value_proposition, category, last_updated
    return StartupRepository;
}());
/**
 * Re-align and resize the startups sheet after value_proposition updates.
 */
function formatStartupsSheetAfterVpUpdate(sheet, actionName) {
    if (actionName === void 0) { actionName = 'formatStartupsSheetAfterVpUpdate'; }
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    // Nothing to format 
    if (lastRow <= 1 || lastCol === 0) {
        AppLogger.info(actionName, 'Nothing to format (header only or empty sheet).');
        return;
    }
    // Center-align all data cells (keep header formatting as-is)
    var dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
    dataRange.setHorizontalAlignment('center');
    // Find the value_proposition column by header name and auto-resize it
    var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var vpIndex = headerValues.indexOf('value_proposition');
    if (vpIndex >= 0) {
        var vpCol = vpIndex + 1;
        sheet.autoResizeColumn(vpCol);
        AppLogger.info(actionName, 'Auto-resized value_proposition column', { columnIndex: vpCol });
    }
    else {
        AppLogger.warn(actionName, 'value_proposition column not found in headers, skipping auto-resize.', {
            headers: headerValues,
        });
    }
}
