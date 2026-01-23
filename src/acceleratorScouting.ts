/**
 * Small curated list of European accelerators used for the prototype.
 * In a real system, this could be replaced or complemented by a search API.
 */
function getCuratedEuropeanAccelerators(): Accelerator[] {
  const raw: {
    website: string;
    name: string;
    country: string;
    city?: string;
    focus?: string;
  }[] = [
    {
      website: 'https://seedcamp.com',
      name: 'Seedcamp',
      country: 'United Kingdom',
      city: 'London',
      focus: 'Pre-seed and seed tech startups',
    },
    {
      website: 'https://stationf.co',
      name: 'STATION F',
      country: 'France',
      city: 'Paris',
      focus: 'Early-stage startups across multiple verticals',
    },
    {
      website: 'https://rockstart.com',
      name: 'Rockstart',
      country: 'Netherlands',
      city: 'Amsterdam',
      focus: 'Energy, agrifood and emerging tech',
    },
    {
      website: 'https://www.startupbootcamp.org',
      name: 'Startupbootcamp',
      country: 'Netherlands',
      city: 'Amsterdam',
      focus: 'Vertical-focused accelerator programs in Europe',
    },
    {
      website: 'https://www.joinef.com',
      name: 'Entrepreneur First',
      country: 'United Kingdom',
      city: 'London',
      focus: 'Talent-focused pre-company accelerator',
    },
    {
      website: 'https://www.eitdigital.eu',
      name: 'EIT Digital Accelerator',
      country: 'Belgium',
      city: 'Brussels',
      focus: 'Digital deep-tech scaleups in Europe',
    },
    {
      website: 'https://www.techstars.com/accelerators/london',
      name: 'Techstars London',
      country: 'United Kingdom',
      city: 'London',
      focus: 'Early-stage tech startups',
    },
    {
      website: 'https://www.startuplisboa.com',
      name: 'Startup Lisboa',
      country: 'Portugal',
      city: 'Lisbon',
      focus: 'Early-stage startups across sectors',
    },
  ];

  // Normalize URLs so they are ready to be used as primary keys.
  return raw.map((a) => ({
    website: normalizeUrl(a.website),
    name: a.name,
    country: a.country,
    city: a.city,
    focus: a.focus,
  }));
}

/**
 * Runs accelerator scouting on the given list:
 * - normalizes URLs
 * - checks existing accelerators (idempotent)
 * - appends up to `batch_size` accelerators to the sheet.
 */
interface ScoutAceleratorResult {
    totalCandidates: number;
    alreadyPresent: number;
    added: number;
}

function scoutAccelerators(batch_size: number = 10): ScoutAceleratorResult {
    const action = 'scoutAccelerators';
    const candidates = getCuratedEuropeanAccelerators();
    const totalCandidates = candidates.length;
    // Get existing websites and normalize them to build a robust dedup set
    const existing = AcceleratorRepository.getExistingWebsites();
    const normalizedExisting = new Set<string>();

    existing.forEach((w) => {
        const n = normalizeUrl(w);
        if (n) {
            normalizedExisting.add(n);
        }
    });

    const newAccelerators: Accelerator[] = [];
    let alreadyPresent = 0;

    candidates.forEach((accel) => {
        const norm = normalizeUrl(accel.website);
        
        if (!norm) {
            AppLogger.warn(action, 'Skipping candidate with invalid website.', {website: accel.website});
            return;
        }

        if (normalizedExisting.has(norm)) {
            alreadyPresent++;
            return;
        }

        // Mark as seen to avoid duplicates within the same run
        normalizedExisting.add(norm);

        newAccelerators.push({...accel, website: norm});
    });
        // Respect batch_size
        const toAdd = newAccelerators.slice(0, batch_size);
        if (toAdd.length > 0) {
            AcceleratorRepository.appendMany(toAdd);
        }

        const result: ScoutAceleratorResult = {
            totalCandidates,
            alreadyPresent,
            added: toAdd.length,
        };

        AppLogger.info(action, 'Accelerator scouting completed', result);
        
        return result;
    
}

