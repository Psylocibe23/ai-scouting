"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
/**
 * Small curated list of European accelerators used for the prototype.
 * In a real system, this could be replaced or complemented by a search API.
 */
function getCuratedEuropeanAccelerators() {
    var raw = [
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
    return raw.map(function (a) { return ({
        website: normalizeUrl(a.website),
        name: a.name,
        country: a.country,
        city: a.city,
        focus: a.focus,
    }); });
}
function scoutAccelerators(batch_size) {
    if (batch_size === void 0) { batch_size = 10; }
    var action = 'scoutAccelerators';
    var candidates = getCuratedEuropeanAccelerators();
    var totalCandidates = candidates.length;
    // Get existing websites and normalize them to build a robust dedup set
    var existing = AcceleratorRepository.getExistingWebsites();
    var normalizedExisting = new Set();
    existing.forEach(function (w) {
        var n = normalizeUrl(w);
        if (n) {
            normalizedExisting.add(n);
        }
    });
    var newAccelerators = [];
    var alreadyPresent = 0;
    candidates.forEach(function (accel) {
        var norm = normalizeUrl(accel.website);
        if (!norm) {
            AppLogger.warn(action, 'Skipping candidate with invalid website.', { website: accel.website });
            return;
        }
        if (normalizedExisting.has(norm)) {
            alreadyPresent++;
            return;
        }
        // Mark as seen to avoid duplicates within the same run
        normalizedExisting.add(norm);
        newAccelerators.push(__assign(__assign({}, accel), { website: norm }));
    });
    // Respect batch_size
    var toAdd = newAccelerators.slice(0, batch_size);
    if (toAdd.length > 0) {
        AcceleratorRepository.appendMany(toAdd);
    }
    var result = {
        totalCandidates: totalCandidates,
        alreadyPresent: alreadyPresent,
        added: toAdd.length,
    };
    AppLogger.info(action, 'Accelerator scouting completed', result);
    return result;
}
