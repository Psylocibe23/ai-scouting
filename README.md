<p align="right"> 
    <strong>Italiano</strong> | <a href="README.en.md">English</a>
</p>

# AI Startup Scouting - Demo per Paprika

Questa repository contiene il codice App Script e la struttura di Google Sheet utilizzati per il caso studio **“AI Scouting (Google Sheets + Apps Script)”** richiesto da Paprika.

**Link al Google Sheet della demo**
👉 [Foglio Google “Ai Scouting - Paprika”](https://docs.google.com/spreadsheets/d/1k2gIxV_vYbieDqE6UBpY1tElrLzizRgwpyGtXXm07Ck/edit?usp=sharing)

---

## 1. Panoramica del Progetto

L'obbiettivo di questo prototipo è **automatizzare lo scouting di acceleratori e startup in Europa** e **generare una value proposition sintetica** per ciascuna startup, utilizzando:

- **Google Sheets**come interfaccia utente e database;
- **Google Apps Script** come backend;
- un **LLM via API** per le parti di comprensione delle informazione e generazione delle descrizioni.

Il prototipo lavora su due sheet principali all'interno dello stesso spreadsheet:

- **accelerators**: contiene i dati degli acceleratori di startup trovati (website, name, country e opzionalmente city e focus);
- **startups**: contiente i dati delle startup collegate agli acceleratori (website, name, country, accelerator, value proposition e opzionalmente category e last updated).

Il flusso è pensato per essere ripetibile, idempotente e resiliente agli errori: **website** viene usato come chiave primaria sia per gli acceleratori che per le startup, in modo da evitare duplicati e permette run successive senza la compromissione dei dati.

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