// GLEIF (api.gleif.org): entità giuridiche con sede in Italia (LEI). Nome, sede, codice di registro.
// Il filtro per provincia non esiste lato server: si scorre l'Italia (~2.600 pagine da 100) e si filtra qui.
// Uso: node strumenti/gleif.mjs [--max-pagine N] [--province MI,TO]
import { opzioni, scarica, salva, testo, pausa, pivaValida, sigleValide } from './lib.mjs';

const o = opzioni();
const maxPag = o['max-pagine'] ? Number(o['max-pagine']) : Infinity;
const filtroProv = o.province ? String(o.province).toUpperCase().split(',') : null;
const valide = sigleValide();
let url = 'https://api.gleif.org/api/v1/lei-records?' + new URLSearchParams({
  'filter[entity.legalAddress.country]': 'IT', 'page[size]': '100', 'page[number]': '1'
});
const out = [];
for (let p = 1; url && p <= maxPag; p++) {
  const j = await (await scarica(url)).json();
  for (const r of j.data) {
    const e = r.attributes.entity, a = e.legalAddress || {};
    const m = /^(.*?)\s*\(([A-Z]{2})\)\s*$/.exec(testo(a.city));
    const prov = m ? m[2] : '';
    if (!valide.has(prov) || (filtroProv && !filtroProv.includes(prov))) continue;
    if (e.status && e.status !== 'ACTIVE') continue;
    const reg = testo(e.registeredAs);
    out.push({
      id: 'lei-' + r.id, nome: testo(e.legalName && e.legalName.name),
      piva: pivaValida(reg) ? reg : '', provincia: prov, comune: m[1],
      indirizzo: testo([...(a.addressLines || []), a.postalCode].filter(Boolean).join(', ')),
      ateco: '', addetti: null, fatturato: null, email: '', pec: '', telefono: '', sito: '',
      fonte: 'GLEIF (LEI)'
    });
  }
  if (p % 20 === 0) console.log(`  pagina ${p}/${j.meta.pagination.lastPage}, trovate ${out.length}`);
  url = j.links && j.links.next; await pausa(250);
}
salva(filtroProv ? 'gleif-' + filtroProv.join('-') : 'gleif', out, {
  titolo: 'GLEIF · entità con codice LEI', licenza: 'CC0', url: 'https://www.gleif.org/en/lei-data/gleif-golden-copy',
  nota: 'Senza contatti, settore, addetti né fatturato. Utile per anagrafica e P.IVA.'
});
