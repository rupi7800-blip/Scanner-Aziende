// GLEIF (api.gleif.org): entità giuridiche con sede in Italia (LEI). Nome, sede, codice di registro.
// L'API NON filtra per provincia e non permette di scorrere oltre le prime 10.000 righe (pagina 100 × 100).
// Per provincia si usa la ricerca testuale filter[fulltext]=IT-XX e si tiene solo chi ha quella provincia (campo region o "Città (XX)").
// Se una provincia supera 10.000 risultati (es. MI, RM, TO) la copertura è parziale e lo script lo dichiara.
// Uso: node strumenti/gleif.mjs --province VA[,CO]     oppure     node strumenti/gleif.mjs   (solo i primi 10.000 record IT)
import { opzioni, scarica, salva, testo, pausa, pivaValida, sigleValide } from './lib.mjs';

const o = opzioni();
const filtroProv = o.province ? String(o.province).toUpperCase().split(',') : null;
const valide = sigleValide();
const MAX_PAGINE = 100; // limite dell'API: 100 pagine da 100 record

const out = [], visti = new Set();
async function scorri(extra, accetta) {
  let url = 'https://api.gleif.org/api/v1/lei-records?' + new URLSearchParams({
    'filter[entity.legalAddress.country]': 'IT', ...extra, 'page[size]': '100', 'page[number]': '1'
  });
  for (let p = 1; url && p <= MAX_PAGINE; p++) {
    const j = await (await scarica(url)).json();
    if (p === 1) {
      const tot = j.meta.pagination.total;
      console.log(`  risultati dichiarati dall'API: ${tot}` + (tot > MAX_PAGINE * 100 ? ' (OLTRE IL LIMITE: copertura parziale)' : ''));
    }
    for (const r of j.data) {
      const e = r.attributes.entity, a = e.legalAddress || {};
      // La provincia sta in region ("IT-VA") oppure, in alcuni record, nella città ("Verona (VR)").
      const m = /^(.*?)\s*\(([A-Z]{2})\)\s*$/.exec(testo(a.city));
      const rg = /^IT-([A-Z]{2})$/.exec(testo(a.region));
      const prov = rg ? rg[1] : (m ? m[2] : '');
      const citta = (m ? m[1] : testo(a.city)).toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (x, y, z) => y + z.toUpperCase());
      if (!valide.has(prov) || !accetta(prov) || visti.has(r.id)) continue;
      if (e.status && e.status !== 'ACTIVE') continue;
      visti.add(r.id);
      const reg = testo(e.registeredAs);
      out.push({
        id: 'lei-' + r.id, nome: testo(e.legalName && e.legalName.name),
        piva: pivaValida(reg) ? reg : '', provincia: prov, comune: citta,
        indirizzo: testo([...(a.addressLines || []), a.postalCode].filter(Boolean).join(', ')),
        ateco: '', addetti: null, fatturato: null, email: '', pec: '', telefono: '', sito: '',
        fonte: 'GLEIF (LEI)'
      });
    }
    if (p % 10 === 0) console.log(`  pagina ${p}, trovate ${out.length}`);
    url = j.links && j.links.next; await pausa(250);
  }
}

if (filtroProv) {
  for (const sg of filtroProv) { console.log('Provincia', sg); await scorri({ 'filter[fulltext]': `IT-${sg}` }, p => p === sg); }
} else {
  console.log('Nessuna provincia indicata: scarico solo i primi 10.000 record italiani.');
  await scorri({}, () => true);
}
salva(filtroProv ? 'gleif-' + filtroProv.join('-') : 'gleif', out, {
  titolo: 'GLEIF · entità con codice LEI', licenza: 'CC0', url: 'https://www.gleif.org/en/lei-data/gleif-golden-copy',
  nota: 'Senza contatti, settore, addetti né fatturato. Utile per anagrafica e P.IVA. Limite API: 10.000 risultati per ricerca.'
});
