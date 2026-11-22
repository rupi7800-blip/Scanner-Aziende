// Wikidata (query.wikidata.org, CC0): aziende italiane con sito, fatturato (P2139), dipendenti (P1128), settore.
// Copertura bassa e sbilanciata verso grandi aziende. Uso: node strumenti/wikidata.mjs [--limite N]
import { opzioni, scarica, salva, testo, sito, sigleValide } from './lib.mjs';

const o = opzioni();
const limite = o.limite ? Number(o.limite) : 6000;
const valide = sigleValide();
const q = `SELECT ?c ?cLabel ?site ?rev ?emp ?comuneLabel ?iso WHERE {
  ?c wdt:P17 wd:Q38 ; wdt:P31 wd:Q4830453 .
  FILTER EXISTS { { ?c wdt:P856 ?x } UNION { ?c wdt:P2139 ?x } UNION { ?c wdt:P1128 ?x } }
  OPTIONAL { ?c wdt:P856 ?site } OPTIONAL { ?c wdt:P2139 ?rev } OPTIONAL { ?c wdt:P1128 ?emp }
  OPTIONAL { ?c wdt:P159 ?comune . OPTIONAL { ?comune wdt:P131 ?prov . ?prov wdt:P300 ?iso } }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "it,en". }
} LIMIT ${limite * 2}`;
const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({ query: q, format: 'json' });
const j = await (await scarica(url, { headers: { Accept: 'application/sparql-results+json' }, timeout: 180000 })).json();

const per = new Map();
for (const b of j.results.bindings) {
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
const out = [...per.values()].filter(x => x.nome && !/^Q\d+$/.test(x.nome)).slice(0, limite);
salva('wikidata', out, {
  titolo: 'Wikidata · aziende italiane', licenza: 'CC0', url: 'https://www.wikidata.org',
  nota: 'Copertura bassa: fatturato e addetti presenti solo in una minoranza di record (da un campione: 11% e 17%), prevalentemente grandi aziende.'
});
