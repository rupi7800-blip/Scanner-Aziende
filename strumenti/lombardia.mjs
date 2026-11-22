// Imprese artigiane della Lombardia (dati.lombardia.it, Socrata, licenza CC0): un dataset per provincia,
// con ragione sociale, P.IVA, ATECO, addetti, e-mail, telefono, sito.
// Uso: node strumenti/lombardia.mjs [--limite N] [--province CO,SO]
import { opzioni, scarica, salva, testo, sito, sigleValide } from './lib.mjs';

const o = opzioni();
const limite = o.limite ? Number(o.limite) : Infinity;
const filtroProv = o.province ? String(o.province).toUpperCase().split(',') : null;
const valide = sigleValide();
// Toglie gli spazi e scarta tutto ciò che non ha forma di indirizzo e-mail (es. "non si legge").
const emailValida = v => { const e = testo(v).replace(/\s+/g, '').toLowerCase(); return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) ? e : ''; };
const BASE = 'https://dati.lombardia.it';
const COL_ADDETTI = ['titolare_e_soci', 'familiari_e_collaboratori', 'impiegati', 'operai_generici', 'operai_specializzati', 'altri_dipendenti', 'apprendisti']
  .flatMap(c => [c + '_maschi', c + '_femmine']);

// La ricerca libera del catalogo non restituisce più i dataset provinciali: si cercano per titolo esatto
// (le 12 province lombarde) e si aggiungono gli id già verificati.
const NOTI = ['enra-jd4f', 'wmyt-zp5e', 'f8bi-ci4a', 'ngkj-9xic'];
const PROV_LOMBARDE = ['Bergamo', 'Brescia', 'Como', 'Cremona', 'Lecco', 'Lodi', 'Mantova', 'Milano', 'Monza e Brianza', 'Pavia', 'Sondrio', 'Varese'];
const trovati = new Map(NOTI.map(id => [id, { id, name: id }]));
for (const p of PROV_LOMBARDE) {
  try {
    const c = await (await scarica(`${BASE}/api/catalog/v1?names=${encodeURIComponent('Imprese artigiane - Provincia ' + p)}`)).json();
    for (const r of c.results || []) trovati.set(r.resource.id, r.resource);
  } catch (e) { console.error('  ricerca', p, 'non riuscita:', e.message); }
}
const dataset = [...trovati.values()];
console.log(`Dataset provinciali: ${dataset.map(d => d.id).join(', ')} (la fonte copre solo alcune province lombarde).`);

const out = [], visti = new Set();
for (const d of dataset) {
  for (let off = 0; out.length < limite; off += 5000) {
    const righe = await (await scarica(`${BASE}/resource/${d.id}.json?$limit=5000&$offset=${off}&$order=:id`)).json();
    for (const r of righe) {
      const prov = testo(r.sigla_provincia).toUpperCase();
      if (!valide.has(prov) || (filtroProv && !filtroProv.includes(prov))) continue;
      let piva = testo(r.partita_iva).replace(/\D/g, '');
      if (piva.length === 10) piva = '0' + piva; // la fonte perde lo zero iniziale
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
        ateco: testo(r.codice_ateco).replace(',', '.'),
        addetti,
        fatturato: null,
        email: emailValida(r.email),
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
if (!out.length) { console.error('Nessuna riga scaricata: non salvo un file vuoto.'); process.exit(2); }
salva('lombardia', out.slice(0, limite), {
  titolo: 'Regione Lombardia · Imprese artigiane', licenza: 'CC0', url: BASE + '/browse?q=imprese+artigiane',
  nota: 'Solo artigianato di alcune province lombarde (Como, Pavia, Sondrio e altre pubblicate). Contiene anche ditte individuali: dati personali, vedi README.'
});
