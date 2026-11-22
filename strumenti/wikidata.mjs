// Wikidata (query.wikidata.org, CC0): aziende italiane con sito, fatturato (P2139), dipendenti (P1128), settore.
// Copertura bassa e sbilanciata verso grandi aziende. Uso: node strumenti/wikidata.mjs [--limite N] [--province VA]
import { opzioni, scarica, salva, testo, sito, sigleValide, pausa } from './lib.mjs';

const o = opzioni();
const limite = o.limite ? Number(o.limite) : 6000;
const filtroProv = o.province ? String(o.province).toUpperCase().split(',') : null;
const valide = sigleValide();
const PAGINA = 800;
const query = (off, lim) => `SELECT ?c ?cLabel ?site ?rev ?emp ?comuneLabel ?iso WHERE {
  ?c wdt:P17 wd:Q38 ; wdt:P31 wd:Q4830453 .
  FILTER EXISTS { { ?c wdt:P856 ?x } UNION { ?c wdt:P2139 ?x } UNION { ?c wdt:P1128 ?x } }
  OPTIONAL { ?c wdt:P856 ?site } OPTIONAL { ?c wdt:P2139 ?rev } OPTIONAL { ?c wdt:P1128 ?emp }
  OPTIONAL { ?c wdt:P159 ?comune . OPTIONAL { ?comune wdt:P131 ?prov . ?prov wdt:P300 ?iso } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". }
} ORDER BY ?c LIMIT ${lim} OFFSET ${off}`;
// Query a pagine: una sola richiesta grande va in timeout (504) sul servizio pubblico.
const bindings = [];
// Con --province serve scorrere tutte le righe nazionali (la provincia si filtra dopo): tetto alto e avviso se raggiunto.
const MAX_RIGHE = filtroProv ? 40000 : limite * 2;
let troncato = false;
for (let off = 0; ; off += PAGINA) {
  if (off >= MAX_RIGHE) { troncato = true; console.error(`ATTENZIONE: raggiunto il tetto di ${MAX_RIGHE} righe: la copertura può essere parziale.`); break; }
  const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({ query: query(off, PAGINA), format: 'json' });
  const j = await (await scarica(url, { headers: { Accept: 'application/sparql-results+json' }, timeout: 120000 }, 6)).json();
  bindings.push(...j.results.bindings);
  console.log(`  righe ${bindings.length}`);
  if (j.results.bindings.length < PAGINA) break;
  await pausa(2500);
}

const per = new Map();
for (const b of bindings) {
  const id = b.c.value.split('/').pop();
  const x = per.get(id) || { id: 'wd-' + id, nome: testo(b.cLabel && b.cLabel.value), piva: '', provincia: '', comune: '',
    indirizzo: '', ateco: '', addetti: null, fatturato: null, email: '', pec: '', telefono: '', sito: '', fonte: 'Wikidata (CC0)' };
  if (b.site && !x.sito) x.sito = sito(b.site.value);
  if (b.rev && x.fatturato == null) x.fatturato = Number(b.rev.value);
  if (b.emp && x.addetti == null) x.addetti = Math.round(Number(b.emp.value));
  if (b.comuneLabel && !x.comune) x.comune = testo(b.comuneLabel.value);
  const sg = b.iso && b.iso.value.replace(/^IT-/, '');
  if (sg && valide.has(sg) && !x.provincia) x.provincia = sg;
  per.set(id, x);
}
const out = [...per.values()].filter(x => x.nome && !/^Q\d+$/.test(x.nome) && (!filtroProv || filtroProv.includes(x.provincia))).slice(0, limite);
salva(filtroProv ? 'wikidata-' + filtroProv.join('-') : 'wikidata', out, {
  titolo: 'Wikidata · aziende italiane', licenza: 'CC0', url: 'https://www.wikidata.org',
  nota: 'Copertura bassa: fatturato e addetti presenti solo in una minoranza di record (da un campione: 11% e 17%), prevalentemente grandi aziende. Il fatturato è preso senza controllare valuta e anno: può non essere in euro né il più recente.'
});
