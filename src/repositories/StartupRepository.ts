class StartupRepository {
    private static SHEET_NAME = 'startups';
    private static HEADER_ROW = 1;
    private static NUM_COLS = 7; // website, name, country, accelerator, value_proposition, category, last_updated

    /**
     * Creates the startup sheet, creating it with header if needed.
     */
    private static getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
        return getOrCreateSheet(
            StartupRepository.SHEET_NAME,
            ['website', 'name', 'country', 'accelerator', 'value_proposition', 'category', 'last_updated'],
            StartupRepository.HEADER_ROW,
        );
    }

    /**
     * Reads all startups from the sheet and returns them as Startup objects.
     */
    static getAll(): Startup[] {
        const sheet = StartupRepository.getSheet();
        const lastRow = sheet.getLastRow();

        if (lastRow <= StartupRepository.HEADER_ROW) {
            // no data row
            return [];
        }

        const numRows = lastRow - StartupRepository.HEADER_ROW;
        const values = sheet.getRange(StartupRepository.HEADER_ROW + 1, 1, numRows, StartupRepository.NUM_COLS)
        .getValues();

        const startups: Startup[] = values.map((row)=> {
            const rawWebsite = String(row[0] || '').trim();
            const website = normalizeUrl(rawWebsite);
            const name = String(row[1] || '').trim();
            const country = String(row[2] || '').trim();
            const accelerator = String(row[3] || '').trim();
            const value_proposition = String(row[4] || '').trim();
            const rawCategory = row[5];
            const rawLastUpdated = row[6];

            const category =
            rawCategory !== null && rawCategory !== undefined && String(rawCategory).trim() !== ''
            ? String(rawCategory).trim(): undefined;

            const last_updated =
            rawLastUpdated !== null && rawLastUpdated !== undefined && String(rawLastUpdated).trim() !== ''
            ? String(rawLastUpdated).trim(): undefined;

            return {
                website,
                name,
                country,
                accelerator,
                value_proposition,
                category,
                last_updated,
            } as Startup;
        }).filter((a) => a.website !== '');

        return startups;
    }

    /**
     * Returns a Set of existing startup websites (used as primary keys).
     */
    static getExistingWebsites() : Set<string> {
        const existing = StartupRepository.getAll();
        const set = new Set<string>();
        existing.forEach((a) => {
            if (a.website) {
                set.add(a.website);
            }
        });

        return set;

    }

    /**
     * Appends multiple startups to the sheet in a single batch write
     * and adjusts column widths for readability.
     */
    static appendMany(stups: Startup[]): void {
        if (stups.length === 0) { return }

        const sheet = StartupRepository.getSheet();
        const lastRow = sheet.getLastRow();
        const startRow = lastRow + 1;

        const rows = stups.map((a) => [
            a.website,
            a.name,
            a.country,
            a.accelerator,
            a.value_proposition || '',
            a.category || '',
            a.last_updated || '',

        ]);

        sheet.getRange(startRow, 1, rows.length, StartupRepository.NUM_COLS).setValues(rows);
        adjustColumnWidths(sheet, StartupRepository.NUM_COLS);
    }

    /**
     * Updates value_proposition and optionally also category/last_update
     * for existing startups, matching rows by normalized website.
     * If website is not found in sheet, update is skipped. 
     */
    static updateValuePropsByWebsite(
        updates: {
            website: string;
            value_proposition: string;
            category?: string;
            last_updated?: string;
        }[]): void {
            const action = 'StartupRepository.updateValuePropsByWebsite';

            if (!updates || updates.length === 0) {
                AppLogger.info(action, 'No updates provided, nothing to do.');
                return;
            }

            const sheet = StartupRepository.getSheet();
            const lastRow = sheet.getLastRow();

            if (lastRow <= StartupRepository.HEADER_ROW) {
                AppLogger.warn(action, 'No startup rows in the sheet, cannot apply updates.');
                return;
            }

            const numRows = lastRow - StartupRepository.HEADER_ROW;

            // Read all rows in order to have a lookup by normalized website
            const values = sheet.getRange(StartupRepository.HEADER_ROW + 1, 1, numRows, StartupRepository.NUM_COLS).getValues();
            // Map normalized websites to indexes in values (0 based)
            const indexByWebsite: { [normalized: string]: number } = {};

            for (let i=0; i < values.length; i++) {
                const rawWebsite = String(values[i][0] || '').trim();
                const normalized = normalizeUrl(rawWebsite);
                if (normalized) {
                    // If duplicates, keep first occurence
                    if (indexByWebsite[normalized] === undefined) {
                        indexByWebsite[normalized] = i;
                    }
                }
            }

            let updatedCount = 0;
            updates.forEach((u) => {
                const norm = normalizeUrl(u.website);

                if (!norm) {
                    AppLogger.warn(action, 'Skipping update with empty/invalid website', {website: u.website});
                    return;
                }

                const rowIndexInValues = indexByWebsite[norm];
                // If we don't find a row for this website, skip
                if (rowIndexInValues === undefined) {
                    AppLogger.warn(action, 'No startup row found for website, skipping update', {website: u.website});
                    return;
                }

                // Convert 0-based `values` index to actual sheet row index
                const sheetRow = StartupRepository.HEADER_ROW + 1 + rowIndexInValues;

                const value_proposition = u.value_proposition || '';
                const category = u.category || '';
                const last_updated = u.last_updated && u.last_updated.trim() !== ''
                ? u.last_updated.trim(): new Date().toISOString();

                // Columns: 5 = value_proposition, 6 = category, 7 = last_updated
                sheet.getRange(sheetRow, 5, 1, 3).setValues([[value_proposition, category, last_updated]]);
                updatedCount++;
            });

            AppLogger.info(action, `Applied value_proposition updates to ${updatedCount} startups out of ${updates.length} requested.`);          
        }
}