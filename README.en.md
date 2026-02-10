<p align="right"> 
    <a href="README.md">Italiano</a> | <strong>English</strong>
</p>

#  AI Startup Scouting – Google Sheets + Apps Script

This repository contains the Apps Script code and the Google Sheets structure
for an **AI-powered startup scouting** prototype.

The project automates the discovery of accelerators and startups in Europe and generates
a **concise value proposition** for each startup.

**Link to the demo Google Sheet**  
👉 [Google Sheet “AI Scouting”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing)

---

## 1. Project overview

The goal of this prototype is to **automate scouting of accelerators and startups in Europe** and **generate a synthetic value proposition** for each startup, using:

- **Google Sheets** as user interface and “database”;
- **Google Apps Script** as backend;
- an **LLM via API** for information understanding and description generation.

The prototype works on two main sheets within the same spreadsheet:

- **accelerators**: contains data about the startup accelerators found (*website*, *name*, *country* and optionally *city* and *focus*);
- **startups**: contains data about the startups linked to the accelerators (*website*, *name*, *country*, *accelerator*, *value_proposition* and optionally *category* and *last_updated*).

The flow is designed to be **repeatable**, **idempotent** and **resilient to errors**: the **website** field is used as primary key for both accelerators and startups, in order to avoid duplicates and allow subsequent runs without corrupting data.

All main features are accessible from the custom menu in the Google Sheet **“Startup Scouting AI”**, which exposes four commands:

1. **Scouting Accelerators**  
   Discovers new European startup accelerators (SerpAPI + HTML + Cheerio + Groq LLM API) and adds them to the `accelerators` sheet.
2. **Update Startups**  
   Visits accelerator websites, uses heuristics to find *portfolio/startups/alumni* pages, uses the LLM to extract startups and adds them to the `startups` sheet.
3. **Generate Value Propositions**  
   For startups with an empty *value_proposition*, visits the startup website and calls Groq API to generate a sentence in the format:  
   `Startup X helps Y do W so that Z.`
4. **Reset Spreadsheet**  
   Resets tracking cursors and clears data from sheets (except headers), so the demo can be tested again from “scratch”.

README structure:

- [Setup and configuration guide](#2-setup-and-configuration)
- [High-level architecture of the prototype](#3-high-level-architecture-and-menu-functions)
- [How to run the menu commands](#3-high-level-architecture-and-menu-functions)
- [Design choices and trade-offs](#4-design-choices-and-trade-offs)  
- [Limitations and possible improvements](#5-limitations-and-possible-improvements)

### Tech stack

- **Language / runtime**: source in TypeScript, compiled to JavaScript for **Google Apps Script**.
- **Versioning**: Apps Script project versioned with **clasp** and published on GitHub.
- **Data layer**: **Google Sheets** with `accelerators` and `startups` tabs, access encapsulated in typed repositories (`AcceleratorRepository`, `StartupRepository`).
- **HTTP & HTML parsing**: `UrlFetchApp` for fetching pages and **Cheerio** (bundled in `dist/`) for server-side HTML parsing.
- **LLM**: **Groq API** (model `llama-3.1-8b-instant`), configured via `LLM_MODEL` and `LLM_PROVIDER` in Script Properties.
- **External search**: **SerpAPI** to discover accelerators via Google search results, with usage tracking through Script Properties.
- **Configuration & state**: `PropertiesService` for keys, cursors and usage counters.
- **Logging**: custom logger `AppLogger` with `INFO`, `WARN`, `ERROR` levels to trace prototype behaviour explicitly.

---

## 2. Setup and configuration

> **Important note**  
> The Apps Script project bound to the Google Sheet already has **demo API keys configured** (personal keys) for both SerpAPI and Groq.  
> This means the prototype can be used **as-is**, without creating new keys.  
> If you prefer to use dedicated API keys, section **[2.4](#24-configure-or-replace-api-keys-in-script-properties)** explains how to replace them.

### 2.1 Prerequisites

To use the demo you need:

- a **Google Account** (to access Google Sheets and Apps Script);
- access to the sheet:  
  [Google Sheet “AI Scouting”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing).

Optional (only if you want to use **your own API keys** instead of the keys already present in the project):

- a **SerpAPI key** (to search for accelerators in Europe):
  - sign up at `https://serpapi.com`;
  - create an API key from your account dashboard;
- a **Groq API key** (to call the LLM):
  - sign up at `https://console.groq.com`;
  - create an API key from the dashboard.

---

### 2.2 Getting your own Google Sheet

1. Open the sheet link:  
   [Google Sheet “AI Scouting”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing)
2. If you want to work on a **personal copy**:
   - go to **File &rarr; Make a copy**;
   - choose a folder in your Google Drive;
   - give it a name (e.g. `AI Scouting (personal copy)`);
   - **Note**: if you create another copy of the sheet you must configure API keys (see section **[2.4](#24-configure-or-replace-api-keys-in-script-properties)**).
3. In the copy, you should see at least two sheets:
   - `accelerators`
   - `startups`  
   both with the correct headers in the first row.

> **Note**: you can use the shared sheet directly with the demo API keys already configured; a personal copy is only needed if you prefer to work in your own workspace or use different keys. There is no need to manually create other sheets: the code works on these two tabs and will create them automatically if missing.

---

### 2.3 Opening the Apps Script editor

All the code lives in a **container-bound Apps Script project** attached to the sheet.

To open it:

1. From the Google Sheet, go to **Extensions &rarr; Apps Script**.
2. A new tab with the Apps Script editor will open, containing:
   - the project `.ts` files;
   - the functions `runScoutingAccelerators`, `runUpdateStartups`, `runGenerateValueProps`, `runResetSpreadsheet`, etc.

To use the demo **you do not need to modify the code**: it is ready to run; the only optional configuration concerns the API keys.

---

### 2.4 Configure (or replace) API keys in Script Properties

#### 2.4.1 Demo keys already configured (immediate use)

The Apps Script project associated with the sheet already contains two script properties:

- `SERPAPI_API_KEY`
- `GROQ_API_KEY`

with values valid **for the demo**.

This means the prototype can be run immediately without creating new keys.  
Since the demo keys have usage limits and are shared, for intensive testing or long-term use it is recommended to switch to dedicated keys.

---

<details>
<summary><strong>Detailed guide (optional) to use your own API keys and initialize Script Properties</strong></summary>

#### A. Creating API keys

- **SerpAPI**
  1. Go to https://serpapi.com and sign up for a free account.
  2. Once logged in, open the **Dashboard / Account** page and copy your **API Key**.

- **Groq**
  1. Go to https://console.groq.com and sign in with your account.
  2. From the **API Keys** menu, create a new key and copy it.

<p align="center">
  <img 
    src="docs/guide_images/guida - groq api.png" 
    alt="Create Groq API key" 
    width="800"
  >
</p>

> **Important note**: property names must match **exactly** the names indicated in this README (including case), e.g. `SERPAPI_API_KEY`, `GROQ_API_KEY`, `LLM_MODEL`, `LLM_PROVIDER`, `SERPAPI_USAGE_MONTH`. If the name is different (e.g. `SERPAI_USAGE_MONTH`), the property will not be read by the code.

The keys you obtained can then be pasted into Script Properties (`SERPAPI_API_KEY` and `GROQ_API_KEY`).

#### B. Replacing API keys with your own

1. In the Apps Script editor, click the **gear** icon (top left) or go to  
   **Project Settings**.

<p align="center">
  <img 
    src="docs/guide_images/guida - menu apps script.png" 
    alt="Open Apps Script editor" 
    width="800"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - impostazioni progetto.png" 
    alt="Apps Script project settings screen" 
    width="800"
  >
</p>

2. Scroll down to the **Script properties** section.
3. In the properties table you should see:

   - `SERPAPI_API_KEY`
   - `GROQ_API_KEY`

4. Replace the existing values with your own keys:
   - `SERPAPI_API_KEY` &rarr; your SerpAPI key;
   - `GROQ_API_KEY` &rarr; your Groq key.
5. Make sure the **property names** are exactly these (case-sensitive).
6. Click **Save**.

From now on all calls to SerpAPI and Groq will use your personal keys.

---

#### C. Properties to initialize when creating a copy of the sheet

When you create a **copy of the Google Sheet** (File &rarr; Make a copy), the Apps Script project attached to the copy may not have all Script Properties set.

In the Apps Script project of the copy, it is recommended to check, under **Script properties**, the presence of the following configuration keys:

- `LLM_MODEL` &rarr; `llama-3.1-8b-instant`  
- `LLM_PROVIDER` &rarr; `groq`  
- `SERPAPI_USAGE_MONTH` &rarr; `2026-01`  
- `SERPAPI_API_KEY`
- `GROQ_API_KEY`

The value of `SERPAPI_USAGE_MONTH` represents the current usage month in `YYYY-MM` format.  
The code updates and uses this field to track monthly API usage; if it is not present, it is recommended to initialize it with a valid month (for example the current month).

All other tracking properties (indices, cursors, counters) are created automatically by the code on first run and do not require manual intervention.

</details>

---

### 2.5 First run and permissions

On the first run of any menu function, the script will ask for authorization:

1. Go back to the Google Sheet and reload the page: you should see the **“Startup Scouting AI”** menu.
2. Select, for example, **Startup Scouting AI &rarr; Scouting Accelerators**.
3. An authorization dialog will appear:
   - choose the Google account to run the script with;
   - if you see the message **“Google hasn’t verified this app”**:
     1. click **“Advanced”**;
     2. click **“Go to ai-scouting (unsafe)”**.
4. In the next screen, review the requested permissions and click **“Allow”**.

During this step it is important to check that one of the permissions granted to the script allows it to **view and edit Google Sheets** associated with your account (for example “View and manage your spreadsheets in Google Drive”). Without this permission the script will not be able to read/write the `accelerators` and `startups` sheets.

After this procedure the script is authorized and subsequent runs of menu commands will not ask for confirmation again (unless you significantly change the project or revoke permissions).

---

<details>
<summary><strong>Visual guide (with screenshots)</strong></summary>

<p align="center">
  <img 
    src="docs/guide_images/guida - startup scouting ai.png" 
    alt="Custom menu of the demo" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - permessi prima esecuzione.png" 
    alt="Authorization on first run" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - avanzate.png" 
    alt="Authorization – advanced options" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - apri ai-scouting.png" 
    alt="Authorization – go to ai-scouting" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - permessi.png" 
    alt="Authorization – permissions" 
    width="700"
  >
</p>

</details>

---

## 3. High-level architecture and menu functions

The prototype architecture is organized around four main actions exposed in the **“Startup Scouting AI”** custom menu.  
Each action calls one or more Apps Script functions, which in turn use:

- **SerpAPI** to search for accelerators on Google;
- **UrlFetchApp** (Apps Script) to retrieve HTML pages;
- **Cheerio** (bundled in `dist/`) for server-side HTML parsing;
- **Groq LLM API** to extract structured information and generate text;
- **PropertiesService** to track state, cursors, usage and key management;
- typed **repositories** (`AcceleratorRepository`, `StartupRepository`) to read/write the sheets.


To run the demo commands you can use the dedicated menu in Google Sheets:
<p align="center">
  <img 
    src="docs/guide_images/guida - startup scouting ai.png" 
    alt="Use custom menu commands" 
    width="800"
  >
</p>

Or run the code directly from the Apps Script editor:
<p align="center">
  <img 
    src="docs/guide_images/guida - esegui apps script editor.png" 
    alt="Run functions from Apps Script editor" 
    width="800"
  >
</p>

Below is a high-level description of what each command does.

---

### 3.1 Scouting Accelerators

Menu command: **Startup Scouting AI &rarr; Scouting Accelerators**  
Main function: `runScoutingAccelerators` &rarr; `scoutAcceleratorsSmart(...)`

This action **populates the `accelerators` sheet** with new European accelerators.

In summary:

- It uses **SerpAPI** to run queries like `startup accelerator in europe` and receives results as JSON.
- It filters results:
  - discards articles, generic directories and media domains;
  - keeps only links that look like **official accelerator websites**.
- For each candidate:
  - uses **UrlFetchApp** to download the HTML page;
  - uses **Cheerio** to extract title, meta tags and basic text;
  - calls **Groq LLM API** with a prompt designed to obtain a JSON containing:
    - `name` (official accelerator name),
    - `country` and optionally `city`,
    - `focus` (e.g. “early-stage tech startups”).
- It normalizes URLs (`normalizeUrl(...)`) and uses **`website` as primary key**:
  - checks if the accelerator already exists in `accelerators`;
  - if not, adds it via `AcceleratorRepository.appendMany(...)`.
- It uses **PropertiesService** to:
  - track the SerpAPI offset (start index) so it does not always repeat the same results;
  - monitor monthly API usage (field `SERPAPI_USAGE_MONTH`).

The action ends by showing a short summary via `SpreadsheetApp.toast(...)` (new accelerators, already present, SerpAPI vs curated list).

---

### 3.2 Update Startups

Menu command: **Startup Scouting AI &rarr; Update Startups**  
Main function: `runUpdateStartups` &rarr; `updateStartupsFromAccelerators(...)`

This action connects accelerators to startups, filling the **`startups`** sheet.

High-level flow:

- Reads all accelerators from `accelerators` via `AcceleratorRepository.getAll()`.
- Uses a **cursor saved in `ScriptProperties`** (`STARTUP_ACCEL_CURSOR_KEY`) to:
  - process only a small **batch of accelerators per run** (e.g. 2 at a time);
  - avoid always starting from the beginning;
  - make scanning “scrolling”/paginated and robust to timeouts.
- For each accelerator in the batch:
  1. Downloads the homepage (`UrlFetchApp`).
  2. Uses **Cheerio** and heuristics (`findStartupListLinks(...)`) to find links to:
     - **portfolio** pages,
     - **startups** pages,
     - **alumni** pages.  
     It limits the number of pages per accelerator (e.g. 3) to respect Apps Script limits.
  3. For each portfolio page:
     - downloads HTML with `fetchHtml(...)`;
     - builds a textual context;
     - calls **Groq LLM API** via `inferStartupsFromPortfolioPage(...)` to obtain a JSON list of startups:
       - `website`, `name`, `country`, optional `category` or `last_updated`.
- For each startup returned by the LLM:
  - normalizes `website` (`normalizeUrl(...)`);
  - applies an **HTTP health check** with `fetchHtml(...)`:
    - if the site returns **HTTP ≥ 400**, it is discarded;
    - if the content looks like a **parked domain page** (“This domain is for sale”, “HugeDomains”, etc.), it is discarded;
  - checks for duplicates:
    - queries `StartupRepository.getExistingWebsites()` (startups already in the sheet);
    - checks a local `Set` of startups added in the current run;
  - if it passes all filters, it is added to the collection of new records.
- If, for a given batch, the number of new startups is below a minimum threshold (e.g. 3), the algorithm falls back to a **curated list of sample startups** (`getCuratedDemoStartups(...)`) to ensure that the demo always produces some new records while keeping control over the data.

At the end:

- all new startups are inserted in **a single batch write** via `StartupRepository.appendMany(...)`, which also:
  - centers cell content,
  - adjusts column widths.
- the accelerator cursor is updated in `ScriptProperties`;
- a summary is shown via toast (accelerators scanned, startups discovered/inserted, accelerators without portfolio pages).

---

### 3.3 Generate Value Propositions

Menu command: **Startup Scouting AI &rarr; Generate Value Propositions**  
Main function: `runGenerateValueProps` &rarr; `generateMissingValueProps(...)`

This action focuses on startups already present in `startups` and, when missing, generates a **synthetic value proposition**.

The behaviour is:

- Reads all startups using `StartupRepository.getAll()`.
- Filters only those with an empty `value_proposition`.
- Applies a **limited batch per run** (e.g. 5 startups at a time) to avoid Apps Script timeouts.
- For each startup to process:
  1. Normalizes `website` and checks that it is valid.
  2. Performs an **HTML fetch** of the site:
     - if the site is not reachable (HTTP ≥ 400), the startup is skipped;
     - if the content looks like a parked domain, it is skipped.
  3. Builds a **compact textual context** (title, meta description, headings, possibly “about” / “privacy” pages).
  4. Calls **Groq LLM API** with a **structured prompt** asking for a JSON output with:
     - `name` (startup),
     - `target` (who it helps),
     - `what` (what it enables them to do),
     - `benefit` (why it is useful).
  5. Converts the JSON into a standardized sentence:  
     `Startup X helps Y do W so that Z.`
  6. Prepares an update object with:
     - `website` (key),
     - generated `value_proposition`,
     - optional `category`,
     - `last_updated` (ISO timestamp).

- All updates are applied **in batch** via `StartupRepository.updateValuePropsByWebsite(...)`, which:
  - finds the correct rows by `website`,
  - updates only `value_proposition`, `category`, `last_updated`,
  - leaves the rest unchanged (name, country, accelerator, manual edits if any).

In this way the action is:

- **idempotent**: once `value_proposition` is filled, the startup is not processed again;
- **safe** with respect to manual edits: it does not overwrite other fields.

> **Note**: LLM prompts are designed with prompt-engineering techniques (role prompting, few-shot prompting, structured output) to reduce hallucinations and keep the sentence format as stable as possible.

---

### 3.4 Reset Spreadsheet

Menu command: **Startup Scouting AI &rarr; Reset Spreadsheet**  
Main function: `runResetSpreadsheet` &rarr; `resetTrackingProperties(...)` + `resetSheets(...)`

This action allows you to **start the demo from scratch** without recreating the file.

In detail:

- `resetTrackingProperties(...)`:
  - uses **PropertiesService** to delete and re-initialize the tracking properties used by the prototype (for example the SerpAPI index and the accelerator cursor);
  - **does not touch** sensitive configuration properties:
    - `SERPAPI_API_KEY`,
    - `GROQ_API_KEY`,
    - `LLM_MODEL`,
    - `LLM_PROVIDER`,
    - and monthly usage fields.
- `resetSheets(...)`:
  - finds the `accelerators` and `startups` sheets;
  - deletes all **data rows** starting from the second one, preserving:
    - the header row,
    - basic formatting.

The result is a spreadsheet ready for a new end-to-end run of the pipeline, with:

- configuration and API keys still in place;
- no residual data in `accelerators` and `startups`;
- internal tracking reset to its initial state.

The main execution parameters are easy to tweak in the code:
- in `main.ts` you can change batch sizes for menu commands (e.g. number of accelerators per run and startup/VP batch sizes).

---

> **Note on error handling and execution times**  
> The code is designed to **handle errors without stopping the whole flow**. If something goes wrong (site not reachable, HTTP 4xx/5xx, parked domain, LLM error, etc.) the single entry is **skipped**, a log message is written and execution continues with the remaining items.  
> Logs are visible from the Apps Script editor in the **Executions** section: each run shows its status (completed / with errors / failed) and, by opening the details, you can read messages produced by `AppLogger` (INFO, WARN, ERROR).  
> Since the prototype combines multiple heuristic layers (portfolio link search, URL normalization, health checks, parked-domain detection) and calls to an external LLM, **execution times may vary** depending on site complexity and API latency. In any case, functions are designed to **not get stuck on a single error**: to understand what is happening during a run, just inspect the logs in **Executions**.

<details>
<summary><strong>Visual guide (with screenshots)</strong></summary>

<p align="center">
  <img 
    src="docs/guide_images/guida - menu apps script.png" 
    alt="Open Apps Script editor" 
    width="800"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - esecuzioni.png" 
    alt="Executions menu to inspect logs" 
    width="400"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - logs.png" 
    alt="Logs output" 
    width="800"
  >
</p>

</details>

---

## 4. Design choices and trade-offs

- **Limited batch sizes**  
   - <ins>trade-off</ins>: lower risk of timeouts / rate limits (free API plans), but requires more runs of the same functions.

- **HTTP health checks + parked domains**  
   - <ins>trade-off</ins>: avoids inserting “broken” sites or domains for sale, at the cost of a few extra calls.

- **Optional extra columns**  
   - <ins>trade-off</ins>: sheets are ready for future extensions of the prototype, at the price of some empty columns in the demo.

- **LLM API for metadata/context extraction**  
   - <ins>trade-off</ins>: lower cost and fewer hallucinations, but requires more structured prompts and slightly more complex logic.

- **Errors logged instead of stopping the flow**  
   - <ins>trade-off</ins>: the flow keeps going, but diagnosis requires manually inspecting logs in “Executions”.

- **Heuristics + LLM instead of advanced scraping**  
  - <ins>trade-off</ins>: more compact code and fully Apps Script-based, but less robust than a custom web-scraping layer (e.g. Node.js + Puppeteer).

- **Simple tracking via Script Properties**  
   - <ins>trade-off</ins>: simple, easy-to-manage tracking, but requires care when working on copies of the sheet and would need to be extended for real-world scaling.

---

## 5. Limitations and possible improvements

- **Limitations [Apps Script development]**  
  - Limitations: synchronous environment (no `async/await`), cannot wait for client-side JS rendering, single-module structure without native `import/export`, limited external libraries, scraping only via `UrlFetchApp` on static HTML.  
  - <ins>Improvements</ins>: add a dedicated backend (e.g. Node.js + Puppeteer/Playwright or Python + Requests + BeautifulSoup) exposed via API to Apps Script, keeping Google Sheets as the interface.

- **Limitations [data acquisition / scraping]**  
  - <ins>Limitations</ins>: generic heuristics to find portfolio/startups pages, often poorly structured HTML, potential missing startups or incomplete fields on highly custom or complex sites.  
  - <ins>Improvements</ins>: dedicated scrapers for key accelerators, headless browsers for dynamic content, more typed parsing to improve recall and data quality.

- **Limitations [LLM and free plan]**  
  - <ins>Limitations</ins>: rate and token limits of the free plan, `llama-3.1-8b-instant` chosen for cost/latency but potentially less performant than larger models.  
  - <ins>Improvements</ins>: move to paid APIs (Groq or other providers), use bigger models, cache results to reduce repeated calls.

- **Limitations [heuristic components]**  
  - <ins>Limitations</ins>: use of simple rules (filters on articles/directories, parked-domain detection, basic country/focus mapping) leading to possibly suboptimal data quality (missing startups, empty or generic fields).  
  - <ins>Improvements</ins>: introduce more advanced web-scraping techniques to reduce heuristic weight and, on small or critical datasets, add a manual validation step for data coherence and quality.

- **Limitations [policies / legal aspects]**  
  - <ins>Limitations</ins>: the demo is intended for internal use and does not yet implement `robots.txt` parsing nor systematic enforcement of site terms of use.  
  - <ins>Improvements</ins>: add a layer that reads and respects `robots.txt`, limit crawling per site/domain and perform legal review of how data is collected and used.

- **Limitations [product / business features]**  
  - <ins>Limitations</ins>: focus is on populating the sheets and generating value propositions, without advanced filters (e.g. by country/vertical) or analytics and insight modules over the collected data.  
  - <ins>Improvements</ins>: add search parameters (e.g. country, industry), analysis scripts (Python + pandas / scikit-learn) and LLM integration to generate portfolio insights (clusters, gaps, outreach priorities).
