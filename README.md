# Scanner Aziende Italia

Web app statica (HTML + JavaScript puro, nessuna build) per cercare aziende italiane per **provincia**, **dimensione**,
**settore** e **sottosettore** (ATECO), con **fatturato** e **contatti** dove disponibili. Esporta in CSV.

## Avvio

```bash
npm run dati        # (facoltativo) scarica le fonti gratuite in dati/ — vedi sotto
npm start           # avvia il server locale su http://127.0.0.1:8080 (solo questo computer) e poi aprilo nel browser
```

Senza dati scaricati né importati l'app mostra un dataset **DEMO interamente fittizio**. Puoi anche importare un tuo
CSV/JSON dal pulsante nella pagina (colonne: `ragione_sociale, partita_iva, provincia, comune, indirizzo, ateco, addetti, fatturato, email, pec, telefono, sito`).

## Fonti gratuite collegate

I connettori in `strumenti/` scaricano i dati **sul tuo computer** (`dati/`, escluso da git) e l'app li carica da `dati/indice.json`,
unendo i duplicati per P.IVA. Verificate con richieste reali il 22/11/2026.

| Fonte | Comando | Cosa dà | Limiti |
|---|---|---|---|
| Regione Lombardia · Imprese artigiane (CC0) | `npm run dati:lombardia` | Nominativo: ragione sociale, P.IVA, ATECO, addetti, **e-mail, telefono, sito** | Solo artigianato di alcune province lombarde (Como, Pavia, Sondrio e poche altre); include ditte individuali |
| IndicePA (CC-BY) | `npm run dati:ipa` | Enti pubblici e gestori di servizi: sede, **PEC/e-mail**, sito | Pubblica amministrazione, non imprese |
| GLEIF (CC0) | `npm run dati:gleif` | Entità con LEI: nome, sede, P.IVA | Nessun contatto/settore/fatturato; filtro provincia solo lato client (~2.600 pagine) |
| Wikidata (CC0) | `npm run dati:wikidata` | Sito, **fatturato** e dipendenti (solo in una minoranza di record: in un campione 11% e 17%) | Poche e grandi aziende |
| VIES (UE) | `node strumenti/vies.mjs dati/<file>.json` | Verifica P.IVA, ragione sociale e sede; scrive `dati/vies-verifiche.json` (l'app non lo usa ancora) | Una P.IVA alla volta, con pausa |

Non raggiungibili/non utilizzati: **ANAC** (blocco anti-bot del sito), **Overpass/OpenStreetMap** (connessione interrotta
dall'ambiente di test), **ISTAT SDMX** (solo statistiche aggregate per provincia/ATECO/classe di addetti, nessuna azienda;
dataflow `183_1163_DF_DICA_ASIAULP_TERRIFDATA_6`, non ancora integrato), **Registro Imprese / bilanci** (a pagamento).
Non esiste una fonte gratuita nazionale con **fatturato per singola azienda**: per quello serve un archivio a pagamento
(Cerved, Infocamere, ecc.) da importare in CSV.

In ambienti con proxy: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<bundle> npm run dati`.

## Camere di Commercio e provincia di Varese

Le Camere di Commercio (Registro Imprese, InfoCamere) **non pubblicano gratuitamente l'elenco nominativo delle imprese**: online
ci sono solo dati aggregati (conteggi, report PDF). Gli elenchi con nomi e contatti si ottengono a pagamento (le tariffe le
fissa ogni Camera, in genere a nominativo) o con una convenzione con InfoCamere. Per Varese il percorso consigliato è quindi:

1. `npm run dati:varese` — scarica tutto ciò che è gratuito per VA: mercato ISTAT (unità locali e addetti per settore ATECO),
   enti IndicePA, aziende Wikidata e entità GLEIF della provincia.
2. Quando l'app è su Varese mostra il pannello **Mercato** (ISTAT): quante unità locali esistono per settore/sottosettore e
   quanta parte ne copri con i tuoi dati.
3. Per i contatti commerciali: richiedere alla Camera di Commercio di Varese (o via Registro Imprese) un **elenco imprese
   per ATECO/comune** e **importarlo come CSV** dal pulsante nella pagina. Nel CSV usa le colonne indicate sopra; il fatturato
   arriva solo se l'estrazione lo include (di norma proviene dai bilanci depositati, a pagamento).

## Privacy e uso dei contatti

**Licenza aperta (CC0, CC-BY) non significa libero uso per marketing**: gli obblighi GDPR restano.

I dati lombardi contengono anche e-mail e telefoni di **ditte individuali e piccole società**, cioè dati personali. Per questo `dati/*.json`
non è nel repository. L'uso per offerte commerciali richiede base giuridica, informativa (art. 14 GDPR), rispetto
dell'opposizione e del Registro delle Opposizioni, e delle regole del Garante sul marketing. Verifica prima di inviare.

Punti da non trascurare prima di scrivere a qualcuno:

- **E-mail commerciali a ditte individuali e piccole società**: sono dati personali; per l'invio di offerte per e-mail serve di regola il consenso preventivo (art. 130 Codice Privacy), salvo le eccezioni previste (es. *soft spam* verso clienti esistenti).
- **Registro Pubblico delle Opposizioni**: riguarda telefono e posta cartacea, non le e-mail.
- **PEC di IndicePA**: sono indirizzi di enti pubblici per comunicazioni ufficiali; il Garante ha sanzionato il loro uso per marketing. Non usarle per offerte commerciali.
- Serve comunque l'informativa (art. 14 GDPR) e il rispetto immediato di ogni opposizione.

Questo non è un parere legale: verifica con il tuo consulente privacy.

Dimensione d'impresa secondo la raccomandazione UE 2003/361 (addetti e fatturato). Classificazione ATECO 2007.
