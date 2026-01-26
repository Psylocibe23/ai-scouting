<p align="right"> 
    <strong>Italiano</strong> | <a href="README.en.md">English</a>
</p>

# AI Startup Scouting - Demo per Paprika

Questa repository contiene il codice App Script e la struttura di Google Sheet utilizzati per il caso studio **“AI Scouting (Google Sheets + Apps Script)”** richiesto da Paprika.

**Link al Google Sheet della demo**
👉 [Foglio Google “Ai Scouting - Paprika”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing)

---

## 1. Panoramica del Progetto

L'obiettivo di questo prototipo è **automatizzare lo scouting di acceleratori e startup in Europa** e **generare una value proposition sintetica** per ciascuna startup, utilizzando:

- **Google Sheets** come interfaccia utente e database;
- **Google Apps Script** come backend;
- un **LLM via API** per le parti di comprensione delle informazione e generazione delle descrizioni.

Il prototipo lavora su due sheet principali all'interno dello stesso spreadsheet:

- **accelerators**: contiene i dati degli acceleratori di startup trovati (website, name, country e opzionalmente city e focus);
- **startups**: contiene i dati delle startup collegate agli acceleratori (website, name, country, accelerator, value_proposition e opzionalmente category e last updated).

Il flusso è pensato per essere ripetibile, idempotente e resiliente agli errori: **website** viene usato come chiave primaria sia per gli acceleratori sia per le startup, in modo da evitare duplicati e permettere di eseguire run successive senza la compromissione dei dati.

Tutte le funzionalità principali sono accessibili dal menu personalizzato sul Google sheet **"Startup Scouting AI"**, che contiene quattro comandi:

1. **Scouting Accelerators**: scopre nuovi acceleratori per startup europee (SerpAPI + HTML + Cheerio + Groq LLM API) e li aggiunge al foglio "accelerators";
2. **Update Startups**: visita le pagine degli acceleratori, utilizza metodi euristici per individuare eventuali pagine portfolio/startups/alumni, usa l'LLM per estrarre le startup e le aggiunge al foglio "startups";
3. **Generate Value Propositions**: per le startup prive di value propsotion, visita il sito della startup e chiama Groq API per generare una value propsotion:
    "Startup X helps Y do W so that Z".
4. **Reset Spreadsheet**: reimposta i cursori di tracking e cancella i dati dai fogli (tranne le intestazioni), così da poter testare la demo da "zero".

Struttura del README:

- Guida al setup ed alla configurazione,
- descrizione dell'architettura ad alto livello del prototipo;
- istruzioni per eseguire i comandi del menu;
- descrizione delle principali **scelte progettuali**, dei **trade-off** e dei **limiti del prototipo** con possibili miglioramenti futuri.

--- 

## 2. Setup e configurazione

**Nota Importante**: nel progetto Apps Script collegato al foglio Google sono **già configurate delle API key** per la demo (mie personali) sia per SerpAPI che per Groq. I recruiter possono usare il prototipo direttamente così com'è, senza la necessita di creare chiavi nuove. Se però si preferisce usare API key dedicate, la sezione **2.4** spiega come sostituirle.

### 2.1 Prerequisiti

Per usare la demo servono:

- un **Google Account** (per accedere a Google Sheets e Apps Script);
- l’accesso al foglio: [Foglio Google “AI Scouting – Paprika”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing).

Facoltativo (solo se si vogliono usare **API key proprie** invece di quelle già presenti nel progetto):

- una **API key SerpAPI** (per cercare acceleratori in Europa):
  - registrazione su `https://serpapi.com`;
  - creazione di una API key dal proprio profilo;
- una **API key Groq** (per chiamare l’LLM):
  - registrazione su `https://console.groq.com`;
  - creazione di una API key dal dashboard.

---

### 2.2 Ottenere il proprio Google Sheet

1. Apri il link del foglio:  
   [Foglio Google “AI Scouting – Paprika”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing)
2. Se vuoi lavorare su una **tua copia** (consigliato):
   - vai su **File -> Crea una copia**;
   - scegli la cartella del tuo Google Drive;
   - assegna un nome a piacere (es. `AI Scouting – Paprika (copia personale)`).
3. Nella copia dovresti vedere almeno due schede:
   - `accelerators`
   - `startups`  
   entrambe già con le intestazioni corrette nella prima riga.

Non è necessario creare a mano altri fogli: il codice lavora su questi due tab, e se mancanti li crea ex novo.

---

### 2.3 Aprire l’editor di Apps Script

Tutto il codice vive in un progetto **Apps Script collegato al foglio**.

Per aprirlo:

1. Dalla copia del tuo Google Sheet, vai su **Estensioni -> Apps Script**.
2. Si aprirà una nuova scheda con l’editor di Apps Script, che contiene:
   - i file `.ts` del progetto;
   - le funzioni `runScoutingAccelerators`, `runUpdateStartups`, `runGenerateValueProps`, `runResetSpreadsheet`, ecc.

Per usare la demo **non è necessario modificare il codice**: è già pronto, serve solo (eventualmente) gestire le chiavi API.

---

### 2.4 Configurare (o sostituire) le API key in Script Properties

#### 2.4.1 Chiavi demo già configurate (uso immediato)

Nel progetto Apps Script associato al foglio sono già presenti due proprietà di script:

- `SERPAPI_API_KEY`
- `GROQ_API_KEY`

con valori validi **per la demo**.  

**Nota**: le chiavi demo hanno limiti di utilizzo e sono condivise: per test intensivi o per uso prolungato è consigliabile sostituirle con chiavi proprie.

#### 2.4.2 Sostituzione delle API key

1. Nell’editor di Apps Script, cliccare sull’icona **ingranaggio** (in alto a sinistra) oppure andare su  
   **Project Settings / Impostazioni progetto**.
2. Scorrere fino alla sezione **Script properties / Proprietà script**.
3. Si dovrebbero vedere già due proprietà:

   - `SERPAPI_API_KEY`
   - `GROQ_API_KEY`

4. **sovrascrivere i valori esistenti** con nuove chiavi dedicate.
   

5. Assicurarsi che i nomi siano esattamente:

   - `SERPAPI_API_KEY` (API key SerpAPI)
   - `GROQ_API_KEY` (API key Groq)

6. Cliccare su **Save / Salva**.
