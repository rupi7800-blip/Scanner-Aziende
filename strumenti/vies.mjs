// VIES (Commissione UE): verifica che una P.IVA italiana sia valida e attiva; restituisce ragione sociale e sede.
// Non esiste un elenco scaricabile: si interroga una P.IVA alla volta, con pausa tra le richieste.
// Uso: node strumenti/vies.mjs <file.json> [--max 200]   (scrive dati/vies-verifiche.json, mappa P.IVA -> esito)
import fs from 'node:fs';
import { opzioni, scarica, pausa, DATI } from './lib.mjs';
import path from 'node:path';

const o = opzioni();
if (!o._[0]) { console.error('Indica il file JSON di aziende da verificare.'); process.exit(1); }
const max = o.max ? Number(o.max) : 200;
const aziende = JSON.parse(fs.readFileSync(o._[0], 'utf8')).filter(a => /^\d{11}$/.test(a.piva)).slice(0, max);
const fOut = path.join(DATI, 'vies-verifiche.json');
let esiti = {};
try { esiti = JSON.parse(fs.readFileSync(fOut, 'utf8')); } catch { /* nuovo */ }
for (const a of aziende) {
  if (esiti[a.piva]) continue;
  try {
    const r = await (await scarica('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ countryCode: 'IT', vatNumber: a.piva })
    })).json();
    esiti[a.piva] = { valida: !!r.valid, nome: r.name, indirizzo: r.address, data: r.requestDate };
    console.log(a.piva, r.valid ? 'valida' : 'NON valida');
  } catch (e) { console.error(a.piva, e.message); }
  await pausa(1200);
}
fs.writeFileSync(fOut, JSON.stringify(esiti, null, 1));
console.log('Salvato', fOut);
