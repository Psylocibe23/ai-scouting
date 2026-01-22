"use strict";
var AcceleratorRepository = /** @class */ (function () {
    function AcceleratorRepository() {
    }
    /**
    * Returns the accelerators sheet, creating it with headers if needed.
    */
    AcceleratorRepository.getSheet = function () {
        return getOrCreateSheet(AcceleratorRepository.SHEET_NAME, ['website', 'name', 'country', 'city', 'focus'], AcceleratorRepository.HEADER_ROW);
    };
    /**
    * Reads all accelerators from the sheet and returns them as Accelerator objects.
    */
    AcceleratorRepository.getAll = function () {
        var sheet = AcceleratorRepository.getSheet();
        var lastRow = sheet.getLastRow();
        if (lastRow <= AcceleratorRepository.HEADER_ROW) {
            // no data rows
            return [];
        }
        var numRows = lastRow - AcceleratorRepository.HEADER_ROW;
        var values = sheet.getRange(AcceleratorRepository.HEADER_ROW + 1, 1, numRows, AcceleratorRepository.NUM_COLS)
            .getValues();
        var accelerators = values.map(function (row) {
            var website = String(row[0] || '').trim();
            var name = String(row[1] || '').trim();
            var country = String(row[2] || '').trim();
            var cityRaw = row[3];
            var focusRaw = row[4];
            var city = cityRaw !== null && cityRaw !== undefined && String(cityRaw).trim() !== ''
                ? String(cityRaw).trim() : undefined;
            var focus = focusRaw !== null && focusRaw !== undefined && String(focusRaw).trim() !== ''
                ? String(focusRaw).trim() : undefined;
            return {
                website: website,
                name: name,
                country: country,
                city: city,
                focus: focus
            };
        }).filter(function (a) { return a.website !== ''; });
        return accelerators;
    };
    /**
    * Returns a Set of existing accelerator websites (used as primary keys).
    */
    AcceleratorRepository.getExistingWebsites = function () {
        var existing = AcceleratorRepository.getAll();
        var set = new Set();
        existing.forEach(function (a) {
            if (a.website) {
                set.add(a.website);
            }
        });
        return set;
    };
    /**
    * Appends multiple accelerators to the sheet in a single batch write
    * and adjusts column widths for readability.
    */
    AcceleratorRepository.appendMany = function (accels) {
        if (accels.length === 0) {
            return;
        }
        var sheet = AcceleratorRepository.getSheet();
        var lastRow = sheet.getLastRow();
        var startRow = lastRow + 1;
        var rows = accels.map(function (a) { return [
            a.website,
            a.name,
            a.country,
            a.city || '',
            a.focus || '',
        ]; });
        sheet.getRange(startRow, 1, rows.length, AcceleratorRepository.NUM_COLS).setValues(rows);
        adjustColumnWidths(sheet, AcceleratorRepository.NUM_COLS);
    };
    AcceleratorRepository.SHEET_NAME = 'accelerators';
    AcceleratorRepository.HEADER_ROW = 1;
    AcceleratorRepository.NUM_COLS = 5; // website, name, country, city, focus
    return AcceleratorRepository;
}());
