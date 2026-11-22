// IndicePA (www.indicepa.gov.it/ipa-dati): enti pubblici e gestori di pubblici servizi, con PEC/e-mail.
// Uso: node strumenti/ipa.mjs [--limite N]
import { opzioni, scarica, salva, testo, sito, pivaValida } from './lib.mjs';

const o = opzioni();
const limite = o.limite ? Number(o.limite) : Infinity;
const BASE = 'https://www.indicepa.gov.it';
// I link del catalogo puntano a "indicepa.gov.it" (senza www): si riscrivono per l'host con certificato corretto.
let url = BASE + '/ipa-dati/dataset/502ff370-1b2c-4310-94c7-f39ceb7500e3/resource/3ed63523-ff9c-41f6-a6fe-980f3d9e501f/download/amministrazioni.txt';
try {
  const cat = await (await scarica(BASE + '/ipa-dati/catalog.jsonld')).json();
  const tutti = JSON.stringify(cat).match(/https?:\/\/[^"\s]+\/amministrazioni\.txt/g);
  if (tutti && tutti[0]) url = tutti[0].replace('://indicepa.gov.it', '://www.indicepa.gov.it');
} catch (e) { console.error('Catalogo non leggibile, uso l\'URL noto:', e.message); }
console.log('Scarico', url);

const righe = (await (await scarica(url, { timeout: 300000 })).text()).replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const head = righe.shift().split('\t').map(h => h.trim().toLowerCase());
const col = n => head.indexOf(n);
const g = (c, n) => { const i = col(n); return i < 0 ? '' : testo(c[i]).replace(/^"|"$/g, ''); };

const out = [];
for (const riga of righe) {
  if (out.length >= limite) break;
  const c = riga.split('\t');
  let email = '', pec = '';
  for (let i = 1; i <= 5; i++) {
    const m = g(c, 'mail' + i).toLowerCase(), t = g(c, 'tipo_mail' + i).toLowerCase();
    if (!m) continue;
    if (t.includes('pec')) pec = pec || m; else email = email || m;
  }
  const cf = g(c, 'cf');
  out.push({
    id: 'ipa-' + g(c, 'cod_amm'),
    nome: g(c, 'des_amm'),
    piva: pivaValida(cf) ? cf : '',
    provincia: g(c, 'provincia').toUpperCase(),
    comune: g(c, 'comune'),
    indirizzo: testo(g(c, 'indirizzo') + (g(c, 'cap') ? ', ' + g(c, 'cap') : '')),
    ateco: '84',
    addetti: null,
    fatturato: null,
    email, pec, telefono: '',
    sito: sito(g(c, 'sito_istituzionale')),
    fonte: 'IndicePA · ' + (g(c, 'tipologia_amm') || 'enti')
  });
}
salva('indicepa', out, {
  titolo: 'IndicePA · enti e gestori di pubblici servizi', licenza: 'CC-BY 4.0 (IODL)', url: BASE + '/ipa-dati/',
  nota: 'Pubblica amministrazione: non è un registro delle imprese.'
});
