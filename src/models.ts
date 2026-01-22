/**
 * Global interfaces for our domain model.
 * No imports/exports here: we use global types because Apps Script
 * doesn't support ES modules directly.
 */

interface Accelerator {
  website: string;
  name: string;
  country: string;
  city?: string;
  focus?: string;
}

interface Startup {
  website: string;
  name: string;
  country?: string;
  accelerator: string; // accelerator website (primary key)
  value_proposition?: string;
  category?: string;
  last_updated?: string;
}
