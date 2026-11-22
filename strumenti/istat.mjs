// ISTAT ASIA (esploradati.istat.it, SDMX): unità locali e addetti per provincia e divisione ATECO.
// NON sono aziende: serve a stimare la dimensione del mercato locale e la copertura dei tuoi dati.
// Uso: node strumenti/istat.mjs --provincia VA [--nuts ITC41]   → dati/mercato-VA.json
import { opzioni, scarica, salva, DATI } from './lib.mjs';
import fs from 'node:fs';
import path from 'node:path';

const NUTS = { VA: 'ITC41' }; // verificato; per altre province passare --nuts (es. Como ITC42)
const o = opzioni();
const sigla = String(o.provincia || '').toUpperCase();
const nuts = o.nuts || NUTS[sigla];
if (!sigla || !nuts) { console.error('Uso: node strumenti/istat.mjs --provincia VA [--nuts ITC41]'); process.exit(1); }

const FLOW = 'IT1,183_1163_DF_DICA_ASIAULP_TERRIFDATA_6,1.0';
const url = `https://esploradati.istat.it/SDMXWS/rest/data/${FLOW}/A.${nuts}.LU+LUEMPDAA..TOTAL?startPeriod=2021&dimensionAtObservation=AllDimensions`;
console.log('Interrogo ISTAT (può richiedere circa un minuto)…');
const csv = await (await scarica(url, { headers: { Accept: 'application/vnd.sdmx.data+csv;version=1.0.0' }, timeout: 240000 }, 3)).text();

const righe = csv.split(/\r?\n/).filter(Boolean);
const head = righe.shift().split(',');
const ix = n => head.indexOf(n);
const [iT, iE, iY, iV] = [ix('DATA_TYPE'), ix('ECON_ACTIVITY_NACE_2007'), ix('TIME_PERIOD'), ix('OBS_VALUE')];
const dati = {}; // codice -> {anno, unita, addetti}
let annoMax = 0;
for (const r of righe) {
  const c = r.split(',');
  const cod = c[iE], anno = Number(c[iY]), v = Number(c[iV]);
  if (!(/^\d{2}$/.test(cod) || cod === '0010') || !isFinite(v)) continue;
  const e = dati[cod] || (dati[cod] = { anno: 0, unita: null, addetti: null });
  if (anno < e.anno) continue;
  if (anno > e.anno) { e.anno = anno; e.unita = null; e.addetti = null; }
  if (c[iT] === 'LU') e.unita = Math.round(v); else if (c[iT] === 'LUEMPDAA') e.addetti = Math.round(v);
  annoMax = Math.max(annoMax, anno);
}
const totale = dati['0010']; delete dati['0010'];
if (!totale || !Object.keys(dati).length) { console.error('Risposta ISTAT senza dati utilizzabili.'); process.exit(2); }
fs.mkdirSync(DATI, { recursive: true });
fs.writeFileSync(path.join(DATI, `mercato-${sigla}.json`), JSON.stringify({
  provincia: sigla, nuts, anno: annoMax, totale, divisioni: dati,
  fonte: 'ISTAT · Archivio Statistico delle Imprese Attive (ASIA), unità locali', licenza: 'CC-BY 3.0 IT'
}));
console.log(`Salvato dati/mercato-${sigla}.json: ${totale.unita} unità locali, ${totale.addetti} addetti (${annoMax}), ${Object.keys(dati).length} divisioni ATECO.`);
