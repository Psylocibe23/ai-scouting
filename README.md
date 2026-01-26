<p align="right"> 
    <strong>Italiano</strong> | <a href="README.en.md">English</a>
</p>

# AI Startup Scouting - Demo per Paprika

Questa repository contiene il codice **Apps Script** e la struttura di **Google Sheets** utilizzati per il caso studio **“AI Scouting (Google Sheets + Apps Script)”** richiesto da Paprika.

**Link al Google Sheet della demo**  
👉 [Foglio Google “AI Scouting - Paprika”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing)

---

## 1. Panoramica del progetto

L’obiettivo di questo prototipo è **automatizzare lo scouting di acceleratori e startup in Europa** e **generare una value proposition sintetica** per ciascuna startup, utilizzando:

- **Google Sheets** come interfaccia utente e “database”;
- **Google Apps Script** come backend;
- un **LLM via API** per la comprensione delle informazioni e la generazione delle descrizioni.

Il prototipo lavora su due schede principali all’interno dello stesso spreadsheet:

- **accelerators**: contiene i dati degli acceleratori di startup trovati (*website*, *name*, *country* e opzionalmente *city* e *focus*);
- **startups**: contiene i dati delle startup collegate agli acceleratori (*website*, *name*, *country*, *accelerator*, *value_proposition* e opzionalmente *category* e *last_updated*).

Il flusso è pensato per essere **ripetibile**, **idempotente** e **resiliente agli errori**: il campo **website** viene usato come chiave primaria sia per gli acceleratori sia per le startup, in modo da evitare duplicati e permettere di eseguire run successive senza compromettere i dati.

Tutte le funzionalità principali sono accessibili dal menu personalizzato sul Google Sheet **“Startup Scouting AI”**, che contiene quattro comandi:

1. **Scouting Accelerators**  
   Scopre nuovi acceleratori per startup europee (SerpAPI + HTML + Cheerio + Groq LLM API) e li aggiunge alla scheda `accelerators`.
2. **Update Startups**  
   Visita le pagine degli acceleratori, utilizza euristiche per individuare pagine *portfolio/startups/alumni*, usa l’LLM per estrarre le startup e le aggiunge alla scheda `startups`.
3. **Generate Value Propositions**  
   Per le startup prive di *value_proposition*, visita il sito della startup e chiama Groq API per generare una frase nel formato:  
   `Startup X helps Y do W so that Z.`
4. **Reset Spreadsheet**  
   Reimposta i cursori di tracking e cancella i dati dai fogli (tranne le intestazioni), così da poter testare la demo da “zero”.

Struttura del README:

- guida al setup e alla configurazione;
- descrizione dell’architettura ad alto livello del prototipo;
- istruzioni per eseguire i comandi del menu;
- descrizione delle principali **scelte progettuali**, dei **trade-off** e dei **limiti del prototipo** con possibili miglioramenti futuri.

---

## 2. Setup e configurazione

> **Nota importante**  
> Nel progetto Apps Script collegato al foglio Google sono **già configurate delle API key** per la demo (chiavi personali) sia per SerpAPI sia per Groq.  
> È quindi possibile usare il prototipo direttamente così com’è, senza creare nuove chiavi.  
> Se si preferisce usare API key dedicate, la sezione **2.4** spiega come sostituirle.

### 2.1 Prerequisiti

Per usare la demo servono:

- un **Google Account** (per accedere a Google Sheets e Apps Script);
- l’accesso al foglio:  
  [Foglio Google “AI Scouting – Paprika”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing).

Facoltativo (solo se si vogliono usare **API key proprie** invece di quelle già presenti nel progetto):

- una **API key SerpAPI** (per cercare acceleratori in Europa):
  - registrazione su `https://serpapi.com`;
  - creazione di una API key dal proprio profilo;
- una **API key Groq** (per chiamare l’LLM):
  - registrazione su `https://console.groq.com`;
  - creazione di una API key dal dashboard.

---

### 2.2 Ottenere il proprio Google Sheet

1. Aprire il link del foglio:  
   [Foglio Google “AI Scouting – Paprika”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing)
2. Se si vuole lavorare su una **copia personale**:
   - andare su **File &rarr; Crea una copia**;
   - scegliere la cartella del proprio Google Drive;
   - assegnare un nome a piacere (es. `AI Scouting – Paprika (copia personale)`)
   - **Nota**: se si crea un'altra copia del foglio è necessario impostare le API key (vedere sezione **2.4**).
3. Nella copia dovrebbero essere presenti almeno due schede:
   - `accelerators`
   - `startups`  
   entrambe già con le intestazioni corrette nella prima riga.

Non è necessario creare manualmente altri fogli: il codice lavora su questi due tab e, se mancanti, li crea automaticamente.

---

### 2.3 Apertura dell’editor di Apps Script

Tutto il codice vive in un progetto **Apps Script collegato al foglio** (“container-bound script”).

Per aprirlo:

1. Dalla copia del Google Sheet, andare su **Estensioni &rarr; Apps Script**.
2. Si aprirà una nuova scheda con l’editor di Apps Script, che contiene:
   - i file `.ts` del progetto;
   - le funzioni `runScoutingAccelerators`, `runUpdateStartups`, `runGenerateValueProps`, `runResetSpreadsheet`, ecc.

Per usare la demo **non è necessario modificare il codice**: è già pronto; l’unica configurazione opzionale riguarda le chiavi API.

---

### 2.4 Configurare (o sostituire) le API key in Script Properties

#### 2.4.1 Chiavi demo già configurate (uso immediato)

Nel progetto Apps Script associato al foglio sono già presenti due proprietà di script:

- `SERPAPI_API_KEY`
- `GROQ_API_KEY`

con valori validi **per la demo**.

Questo significa che il prototipo può essere eseguito subito, senza dover creare nuove chiavi.  
Poiché le chiavi demo hanno limiti di utilizzo e sono condivise, per test intensivi o per uso prolungato è comunque consigliabile usare API key dedicate.

---

<details>
<summary><strong>Guida dettagliata (opzionale) per usare API key proprie e inizializzare le Script Properties</strong></summary>

#### A. Sostituire le API key con chiavi proprie

1. Nell’editor di Apps Script, cliccare sull’icona **ingranaggio** (in alto a sinistra) oppure andare su  
   **Project Settings / Impostazioni progetto**.

<p align="center">
  <img 
    src="docs/guide_images/guida - impostazioni progetto.png" 
    alt="Schermata impostazioni progetto Apps Script" 
    width="700"
  >
</p>

2. Scorrere fino alla sezione **Script properties / Proprietà script**.
3. Nella tabella delle proprietà dovrebbero comparire:

   - `SERPAPI_API_KEY`
   - `GROQ_API_KEY`

4. Sostituire i valori esistenti con le proprie chiavi:
   - `SERPAPI_API_KEY` → API key SerpAPI;
   - `GROQ_API_KEY` → API key Groq.
5. Assicurarsi che i **nomi delle proprietà** siano esattamente questi (maiuscole comprese).
6. Cliccare su **Save / Salva**.

Da questo momento tutte le chiamate a SerpAPI e Groq useranno le chiavi personali.

---

#### B. Proprietà da inizializzare quando si crea una copia del foglio

Quando si crea una **copia del Google Sheet** (File &rarr; Crea una copia), il progetto Apps Script collegato alla copia potrebbe non avere tutte le Script Properties impostate.

Nel progetto Apps Script della copia è opportuno verificare, nella stessa sezione **Script properties**, la presenza delle seguenti chiavi di configurazione:

- `LLM_MODEL` &rarr; `llama-3.1-8b-instant`  
- `LLM_PROVIDER` &rarr; `groq`  
- `SERPAI_USAGE_MONTH` &rarr; `2026-01`  
- `SERPAPI_USAGE_MONTH` &rarr; `2026-01`  

I valori `SERPAI_USAGE_MONTH` e `SERPAPI_USAGE_MONTH` rappresentano il mese di utilizzo corrente in formato `YYYY-MM`.  
Il codice aggiorna e utilizza questi campi per tracciare l’uso mensile delle API; se non sono presenti, è consigliabile inizializzarli con un mese valido (ad esempio il mese corrente).

Tutte le altre proprietà di tracking (come indici, cursori, contatori) vengono create automaticamente dal codice alla prima esecuzione e non richiedono interventi manuali.

</details>

---

### 2.5 Prima esecuzione e autorizzazioni

Alla prima esecuzione di una funzione dal menu viene richiesto di autorizzare lo script:

1. Tornare al Google Sheet e ricaricare la pagina: dovrebbe comparire il menu **“Startup Scouting AI”**.
2. Selezionare, ad esempio, **Startup Scouting AI &rarr; Scouting Accelerators**.
3. Si aprirà una finestra di autorizzazione:
   - scegliere l’account Google con cui eseguire lo script;
   - se compare il messaggio **“Google non ha verificato questa app”**:
     1. cliccare su **“Avanzate”**;
     2. cliccare su **“Vai a ai-scouting-paprika (non sicura)”**.
4. Nella schermata successiva, scorrere i permessi richiesti e cliccare su **“Consenti”**.

Durante questo passaggio è importante verificare che tra i permessi concessi allo script ci sia anche la voce che consente di **visualizzare e modificare i fogli di calcolo Google** associati all’account (ad esempio “Visualizzare e gestire i tuoi fogli di calcolo Google”). Senza questo permesso lo script non può leggere/scrivere nelle schede `accelerators` e `startups`.

Dopo questa procedura lo script risulta autorizzato e le esecuzioni successive dei comandi dal menu non richiederanno ulteriori conferme (a meno di modifiche significative al progetto o revoca dei permessi).
