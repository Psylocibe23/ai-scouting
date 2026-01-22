class AcceleratorRepository {
    private static SHEET_NAME = 'accelerators';
    private static HEADER_ROW = 1;
    private static NUM_COLS = 5; // website, name, country, city, focus

    /**
    * Returns the accelerators sheet, creating it with headers if needed.
    */
    private static getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
        return getOrCreateSheet(
            AcceleratorRepository.SHEET_NAME,
            ['website', 'name', 'country', 'city', 'focus'],
            AcceleratorRepository.HEADER_ROW
        );
    }       

    /**
    * Reads all accelerators from the sheet and returns them as Accelerator objects.
    */
    static getAll(): Accelerator[] {
        const sheet = AcceleratorRepository.getSheet();
        const lastRow = sheet.getLastRow();

        if (lastRow <= AcceleratorRepository.HEADER_ROW) {
            // no data rows
            return [];
        }

        const numRows = lastRow - AcceleratorRepository.HEADER_ROW;
        const values = sheet.getRange(AcceleratorRepository.HEADER_ROW + 1, 1, numRows, AcceleratorRepository.NUM_COLS)
        .getValues();

        const accelerators: Accelerator[] = values.map((row) => {
            const website = String(row[0] || '').trim();
            const name = String(row[1] || '').trim();
            const country = String(row[2] || '').trim();
            const cityRaw = row[3];
            const focusRaw = row[4];

            const city = 
            cityRaw !== null && cityRaw !== undefined && String(cityRaw).trim() !== ''
            ? String(cityRaw).trim(): undefined;

            const focus =
            focusRaw !== null && focusRaw !== undefined && String(focusRaw).trim() !== ''
            ? String(focusRaw).trim(): undefined;

            return {
                website,
                name,
                country,
                city,
                focus
            } as Accelerator;

        }).filter((a) => a.website !== '');

        return accelerators;
    }

    /**
    * Returns a Set of existing accelerator websites (used as primary keys).
    */
    static getExistingWebsites(): Set<string> {
        const existing = AcceleratorRepository.getAll();
        const set = new Set<string>();
        existing.forEach((a) => {
            if (a.website) {
                set.add(a.website);
            }
        });

        return set
    }

    /**
    * Appends multiple accelerators to the sheet in a single batch write
    * and adjusts column widths for readability.
    */
    static appendMany(accels: Accelerator[]): void {
        if (accels.length === 0) {
            return
        }

        const sheet = AcceleratorRepository.getSheet();
        const lastRow = sheet.getLastRow();
        const startRow = lastRow + 1;

        const rows = accels.map((a) => [
            a.website,
            a.name,
            a.country,
            a.city || '',
            a.focus || '',
        ]);

        sheet.getRange(startRow, 1, rows.length, AcceleratorRepository.NUM_COLS).setValues(rows);

        adjustColumnWidths(sheet, AcceleratorRepository.NUM_COLS);
    }


}