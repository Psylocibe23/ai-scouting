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
    src="docs/guide_images/guida - menu apps script.png" 
    alt="Aprire editor Apps Script" 
    width="700"
  >
</p>

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
   - `SERPAPI_API_KEY` &rarr; API key SerpAPI;
   - `GROQ_API_KEY` &rarr; API key Groq.
5. Assicurarsi che i **nomi delle proprietà** siano esattamente questi (maiuscole comprese).
6. Cliccare su **Save / Salva**.

Da questo momento tutte le chiamate a SerpAPI e Groq useranno le chiavi personali.

---

#### B. Proprietà da inizializzare quando si crea una copia del foglio

Quando si crea una **copia del Google Sheet** (File &rarr; Crea una copia), il progetto Apps Script collegato alla copia non averà tutte le Script Properties impostate.

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

---

<details>
<summary><strong>Guida dettagliata (con screenshot)</strong></summary>

<p align="center">
  <img 
    src="docs/guide_images/guida - startup scouting ai.png" 
    alt="Menu personalizzato della demo" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - permessi prima esecuzione.png" 
    alt="Autorizzazione prima esecuzione" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - avanzate.png" 
    alt="Autorizzazione prima esecuzione - avanzate" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - apri ai-scouting-paprika.png" 
    alt="Autorizzazione prima esecuzione - apri ai-scouting-paprika" 
    width="700"
  >
</p>

<p align="center">
  <img 
    src="docs/guide_images/guida - permessi.png" 
    alt="Autorizzazione prima esecuzione - permessi" 
    width="700"
  >
</p>

</details>

---

## 3. Architettura ad alto livello e funzioni del menu

L’architettura del prototipo è organizzata intorno a quattro azioni principali, esposte nel menu personalizzato **“Startup Scouting AI”**.  
Ogni azione richiama una o più funzioni Apps Script, che a loro volta usano:

- **SerpAPI** per la ricerca di acceleratori su Google;
- **UrlFetchApp** (Apps Script) per recuperare le pagine HTML;
- **Cheerio** (bundled in `dist/`) per fare parsing HTML lato server;
- **Groq LLM API** per estrarre informazioni strutturate e generare testo;
- **PropertiesService** per tracciare stato, cursori, utilizzo e gestione delle chiavi;
- **Repository** tipizzati (`AcceleratorRepository`, `StartupRepository`) per leggere/scrivere sui fogli.

Di seguito una descrizione high-level di cosa fa ciascun comando.

---

### 3.1 Scouting Accelerators

Comando: **Startup Scouting AI &rarr; Scouting Accelerators**  
Funzione principale: `runScoutingAccelerators` &rarr; `scoutAcceleratorsSmart(...)`

Questa azione si occupa di **popolare la scheda `accelerators`** con nuovi acceleratori europei.

In sintesi:

- Usa **SerpAPI** per eseguire query come `startup accelerator in europe` e ricevere i risultati in formato JSON.
- Filtra i risultati:
  - scarta articoli, directory generiche e domini media;
  - seleziona solo link che sembrano essere **siti ufficiali di acceleratori**.
- Per ogni candidato:
  - usa **UrlFetchApp** per scaricare la pagina HTML;
  - usa **Cheerio** per estrarre titolo, meta tag e testi di base;
  - chiama **Groq LLM API** con un prompt pensato per ottenere un JSON con:
    - `name` (nome ufficiale dell’acceleratore),
    - `country` e opzionalmente `city`,
    - `focus` (es. “early-stage tech startups”).
- Normalizza gli URL (`normalizeUrl(...)`) e usa **`website` come chiave primaria**:
  - controlla se l’acceleratore esiste già in `accelerators`;
  - in caso contrario, lo aggiunge tramite `AcceleratorRepository.appendMany(...)`.
- Usa **PropertiesService** per:
  - tracciare l’offset di SerpAPI (start index) e non ripetere sempre gli stessi risultati;
  - monitorare l’uso mensile dell’API (campo `SERPAPI_USAGE_MONTH`).

L’azione termina mostrando un breve riepilogo via `SpreadsheetApp.toast(...)` (nuovi acceleratori trovati, già presenti, provenienza SerpAPI vs lista curata).

---

### 3.2 Update Startups

Comando: **Startup Scouting AI &rarr; Update Startups**  
Funzione principale: `runUpdateStartups` &rarr; `updateStartupsFromAccelerators(...)`

Questa azione collega gli acceleratori alle startup, riempiendo la scheda **`startups`**.

Il flusso high-level:

- Legge tutti gli acceleratori da `accelerators` tramite `AcceleratorRepository.getAll()`.
- Usa un **cursore salvato in `ScriptProperties`** (`STARTUP_ACCEL_CURSOR_KEY`) per:
  - processare solo un piccolo **batch di acceleratori per run** (ad es. 2 per volta);
  - evitare di ripartire sempre dall’inizio;
  - rendere la scansione "a scorrimento" (paginata) e robusta ai timeout.
- Per ogni acceleratore del batch:
  1. Scarica la homepage (`UrlFetchApp`).
  2. Usa **Cheerio** ed euristiche (`findStartupListLinks(...)`) per individuare link a:
     - pagine **portfolio**,
     - pagine **startups**,
     - pagine **alumni/batch**.
     Si limita a un numero massimo di pagine per acceleratore (es. 3) per rimanere nei limiti di Apps Script.
  3. Per ogni pagina portfolio:
     - scarica l’HTML con `fetchHtml(...)`;
     - costruisce un contesto testuale;
     - invoca **Groq LLM API** tramite `inferStartupsFromPortfolioPage(...)` per ottenere una lista JSON di startup:
       - `website`, `name`, `country`, eventuale `category` o `last_updated`.
- Per ogni startup proposta dall’LLM:
  - normalizza `website` (`normalizeUrl(...)`);
  - applica una **health check HTTP** con `fetchHtml(...)`:
    - se il sito restituisce **HTTP ≥ 400**, viene scartato;
    - se il contenuto sembra una **pagina di dominio parcheggiato** (“This domain is for sale”, “HugeDomains”, ecc.), viene scartato;
  - verifica duplicati:
    - controlla in `StartupRepository.getExistingWebsites()` (startup già presenti);
    - controlla in un `Set` locale di startup già aggiunte in questo run;
  - se passa tutti i filtri, viene aggiunta nella collezione di nuovi record.
- Se, per un certo batch, il numero di nuove startup è inferiore a una soglia minima (es. 3), l’algoritmo usa una **lista curata di startup di esempio** (`getCuratedDemoStartups(...)`) per garantire che la demo produca sempre qualche nuovo record, mantenendo comunque il controllo sui dati.

Alla fine:

- tutte le nuove startup vengono inserite in **un’unica scrittura batch** tramite `StartupRepository.appendMany(...)`, che si occupa anche di:
  - centrare il contenuto delle celle,
  - adattare la larghezza delle colonne.
- il cursore sugli acceleratori viene aggiornato in `ScriptProperties`;
- un riepilogo viene mostrato via toast (acceleratori scansionati, startup scoperte/inserite, eventuali casi senza portfolio).

---

### 3.3 Generate Value Propositions

Comando: **Startup Scouting AI &rarr; Generate Value Propositions**  
Funzione principale: `runGenerateValueProps` &rarr; `generateMissingValueProps(...)`

Questa azione si concentra sulle startup già presenti nella scheda `startups` e genera, quando mancante, una **value proposition sintetica**.

Il comportamento è il seguente:

- Legge tutte le startup tramite `StartupRepository.getAll()`.
- Filtra solo quelle con `value_proposition` vuota.
- Applica un **batch limitato per run** (es. 5 startup alla volta) per evitare timeout di Apps Script.
- Per ogni startup da processare:
  1. Normalizza `website` e verifica che sia valido.
  2. Effettua un **fetch HTML** del sito:
     - se il sito non è raggiungibile (HTTP ≥ 400), la startup viene saltata;
     - se il contenuto sembra un dominio parcheggiato, viene saltata.
  3. Costruisce un **contesto testuale compatto** (titolo, meta description, headings, eventuali pagine “about” / “privacy”).
  4. Chiama **Groq LLM API** con un **prompt strutturato** che chiede un output JSON nelle componenti:
     - `target` (chi aiuta),
     - `what` (cosa permette di fare),
     - `benefit` (perché è utile),
     - eventuale `category`.
  5. Converte il JSON in una frase standardizzata del tipo:  
     `Startup X helps Y do W so that Z.`
  6. Prepara un oggetto di aggiornamento con:
     - `website` (chiave),
     - `value_proposition` generata,
     - eventuale `category`,
     - `last_updated` (timestamp ISO).

- Tutti gli aggiornamenti vengono applicati in **batch** tramite `StartupRepository.updateValuePropsByWebsite(...)`, che:
  - individua le righe corrette per `website`,
  - aggiorna solo le colonne `value_proposition`, `category`, `last_updated`,
  - lascia invariato il resto (nome, country, accelerator, eventuali modifiche manuali).

In questo modo l’azione è:

- **idempotente**: una volta popolata `value_proposition`, la startup non viene più processata;
- **sicura** rispetto a modifiche manuali: non sovrascrive altri campi.

**Nota**: I prompt verso l’LLM sono progettati con tecniche di prompt engineering (role prompting, few-shot prompting, structured output) per ridurre le allucinazioni e mantenere il formato della frase il più possibile stabile

---

### 3.4 Reset Spreadsheet

Comando: **Startup Scouting AI &rarr; Reset Spreadsheet**  
Funzione principale: `runResetSpreadsheet` &rarr; `resetTrackingProperties(...)` + `resetSheets(...)`

Questa azione serve a **ripartire da zero** con la demo, senza dover ricreare il file.

In dettaglio:

- `resetTrackingProperties(...)`:
  - usa **PropertiesService** per eliminare e re-inizializzare le proprietà di tracking usate dal prototipo (ad esempio l’indice di SerpAPI e il cursore sugli acceleratori);
  - **non tocca** le proprietà di configurazione sensibili:
    - `SERPAPI_API_KEY`,
    - `GROQ_API_KEY`,
    - `LLM_MODEL`,
    - `LLM_PROVIDER`,
    - e i campi di usage mensile.
- `resetSheets(...)`:
  - individua le schede `accelerators` e `startups`;
  - cancella tutte le **righe di dati** a partire dalla seconda, preservando:
    - la riga di intestazione,
    - la formattazione di base.

Il risultato è uno spreadsheet pronto per una nuova esecuzione end-to-end della pipeline, con:

- configurazione e API key ancora in place;
- nessun dato residuo in `accelerators` e `startups`;
- tracking interno riportato allo stato iniziale.


I principali parametri di esecuzione sono facilmente modificabili dal codice:
- nel file `main.ts` si possono cambiare i valori di batch per i comandi di menu (es. numero di acceleratori per run e dimensione dei batch di startup/VP).

--- 

### Nota su gestione errori e tempi di esecuzione

Il codice è organizzato in modo da **gestire gli errori senza interrompere l’intero flusso**.  
In caso di problemi (sito non raggiungibile, HTTP 4xx/5xx, dominio parcheggiato, errore LLM, ecc.) la singola voce viene **saltata**, viene scritto un messaggio nei log e l’esecuzione prosegue con gli altri elementi.

I log sono visibili dall’editor di Apps Script, nella sezione **Esecuzioni**:

- ogni run mostra lo stato (completata / con errori / interrotta);
- aprendo il dettaglio di una esecuzione si possono leggere i messaggi generati da `AppLogger` (INFO, WARN, ERROR) e seguire passo per passo ciò che è successo.

Dato che il prototipo combina:

- più layer euristici (ricerca link portfolio, normalizzazione URL, health check, rilevamento domini parcheggiati) e  
- chiamate a un LLM esterno,

i **tempi di esecuzione possono variare** in base alla complessità delle strutture HTML dei siti web e alla latenza delle API.  
In ogni caso, le funzioni sono pensate per **non bloccarsi su un singolo errore**: se si desidera capire meglio cosa sta succedendo durante un run, è sufficiente consultare i log nella sezione **Esecuzioni** di Apps Script.

<p align="center">
  <img 
    src="docs/guide_images/guida - esecuzioni.png" 
    alt="Menu esecuzioni per controllo Logs" 
    width="400"
  >
</p>

---

## 4. Scelte progettuali e trade-off

- **Batch size limitati**
_trade_-_off_: meno rischio timeout / rate-limit (free API plan), ma servono più run delle stesse funzioni.

- **Health-check HTTP + domini scaduti**
_trade_-_off_: si evita di inserire siti "rotti" o con dominio scaduto, ma serve qualche chiamata in più.

- **Colonne extra opzionali**
_trade_-_off_: fogli pronti per estensioni future del prototipo, accettando alcune colonne vuote nella demo.

- **LLM API per estrazione metadat/contesto**
_trade_-_off_: meno costo e meno allucinazioni, ma richiede prompt più strutturati e logica più complessa.

- **Errori non bloccati ma flag nei Logs**
_trade_-_off_: