// Imprese artigiane della Lombardia (dati.lombardia.it, Socrata, licenza CC0): un dataset per provincia,
// con ragione sociale, P.IVA, ATECO, addetti, e-mail, telefono, sito.
// Uso: node strumenti/lombardia.mjs [--limite N] [--province CO,SO]
import { opzioni, scarica, salva, testo, sito, sigleValide } from './lib.mjs';

const o = opzioni();
const limite = o.limite ? Number(o.limite) : Infinity;
const filtroProv = o.province ? String(o.province).toUpperCase().split(',') : null;
const valide = sigleValide();
const BASE = 'https://dati.lombardia.it';
const COL_ADDETTI = ['titolare_e_soci', 'familiari_e_collaboratori', 'impiegati', 'operai_generici', 'operai_specializzati', 'altri_dipendenti', 'apprendisti']
  .flatMap(c => [c + '_maschi', c + '_femmine']);

const cat = await (await scarica(`${BASE}/api/catalog/v1?q=${encodeURIComponent('imprese artigiane')}&only=datasets&limit=100`)).json();
const dataset = cat.results.map(r => r.resource).filter(r => /^Imprese artigiane - Provincia/i.test(r.name));
console.log(`Trovati ${dataset.length} dataset provinciali.`);

const out = [], visti = new Set();
for (const d of dataset) {
  for (let off = 0; out.length < limite; off += 5000) {
    const righe = await (await scarica(`${BASE}/resource/${d.id}.json?$limit=5000&$offset=${off}&$order=:id`)).json();
    for (const r of righe) {
      const prov = testo(r.sigla_provincia).toUpperCase();
      if (!valide.has(prov) || (filtroProv && !filtroProv.includes(prov))) continue;
      const piva = testo(r.partita_iva).replace(/\D/g, '');
      const chiave = piva || testo(r.ragione_sociale) + prov;
      if (visti.has(chiave)) continue; visti.add(chiave);
      const addetti = COL_ADDETTI.reduce((s, c) => s + (Number(r[c]) || 0), 0);
      out.push({
        id: 'lom-' + (piva || out.length),
        nome: testo(r.ragione_sociale),
        piva: piva.length === 11 ? piva : '',
        provincia: prov,
        comune: testo(r.comune),
        indirizzo: testo([r.indirizzo_impresa, r.n_civico].filter(Boolean).join(' ') + (r.cap ? ', ' + r.cap : '')),
        ateco: testo(r.codice_ateco),
        addetti,
        fatturato: null,
        email: testo(r.email).toLowerCase(),
        pec: '',
        telefono: testo(r.telefono),
        sito: sito(r.sito_web),
        fonte: 'Regione Lombardia · Imprese artigiane (CC0)'
      });
    }
    console.log(`  ${d.name}: offset ${off}, righe ${righe.length}, totale ${out.length}`);
    if (righe.length < 5000) break;
  }
  if (out.length >= limite) break;
}
salva('lombardia', out.slice(0, limite), {
  titolo: 'Regione Lombardia · Imprese artigiane', licenza: 'CC0', url: BASE + '/browse?q=imprese+artigiane',
  nota: 'Solo artigianato lombardo. Contiene anche ditte individuali: dati personali, vedi README.'
});
