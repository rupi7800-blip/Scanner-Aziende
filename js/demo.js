// Dataset DEMO interamente fittizio, generato in modo deterministico.
// Nomi, P.IVA, telefoni ed e-mail NON corrispondono ad aziende reali
// (domini .example, prefisso telefonico non assegnato). Serve solo a provare l'app.
window.generaDemo = function (n = 1600) {
  let s = 20240611;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = a => a[Math.floor(rnd() * a.length)];
  const cognomi = ['Aurelia','Bellavista','Cardano','Dorigo','Esposito Nova','Fontanari','Garbin','Isolani','Lunardi','Marzoli','Novelli','Orsetti','Pellizzer','Quadri','Ravasi','Sartorelli','Tonelli','Urbani','Valsecchi','Zanetti'];
  const suffissi = ['S.r.l.','S.p.A.','S.n.c.','S.a.s.','S.r.l.s.','Soc. Coop.'];
  const nomiSett = {
    C: ['Meccanica','Alimentari','Plastica','Tessile','Metalli','Arredi','Packaging'],
    F: ['Costruzioni','Impianti','Edilizia','Restauri'],
    G: ['Commerciale','Distribuzione','Trading','Auto'],
    H: ['Logistica','Trasporti','Spedizioni'],
    I: ['Ristorazione','Hospitality','Catering'],
    J: ['Software','Digital','Sistemi','Telecom'],
    M: ['Consulting','Engineering','Studio Tecnico','Marketing'],
    Q: ['Salute','Servizi Sanitari','Assistenza'],
    default: ['Servizi','Group','Industrie','Soluzioni']
  };
  const comuniDemo = ['Centro','Nord','Sud','Est','Ovest','Industriale'];
  const pesi = { C: 24, G: 18, F: 12, M: 9, I: 8, H: 7, J: 6, Q: 4, N: 4, A: 3, S: 2, L: 1, K: 1, P: 1 };
  const bag = Object.entries(pesi).flatMap(([k, w]) => Array(w).fill(k));
  const provPesate = window.PROVINCE.flatMap(p => Array(['MI','RM','TO','NA','BS','BG','VR','PD','BO','TV','VI','FI'].includes(p.sigla) ? 6 : 1).fill(p));
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = pick(provPesate);
    const codiceSez = pick(bag);
    const sez = window.ATECO.sezioni.find(x => x.codice === codiceSez);
    const divs = Object.keys(sez.divisioni).map(Number);
    const div = pick(divs);
    const r = rnd();
    const addetti = r < .62 ? 1 + Math.floor(rnd() * 9) : r < .87 ? 10 + Math.floor(rnd() * 40) : r < .97 ? 50 + Math.floor(rnd() * 200) : 250 + Math.floor(rnd() * 1500);
    const fatt = rnd() < .15 ? null : Math.round(addetti * (80000 + rnd() * 260000) / 1000) * 1000;
    const base = (pick(cognomi) + ' ' + pick(nomiSett[sez.codice] || nomiSett.default));
    const slug = base.toLowerCase().replace(/[^a-z]+/g, '') + (i % 97);
    const piva = '99' + String(100000000 + Math.floor(rnd() * 899999999)).slice(0, 9);
    const haEmail = rnd() < .8, havePec = rnd() < .7, haTel = rnd() < .9, haSito = rnd() < .6;
    out.push({
      id: 'demo-' + i,
      nome: base + ' ' + pick(suffissi),
      piva,
      provincia: p.sigla,
      comune: p.nome + ' ' + pick(comuniDemo),
      indirizzo: 'Via Demo ' + (1 + Math.floor(rnd() * 120)),
      ateco: String(div).padStart(2, '0') + '.' + String(1 + Math.floor(rnd() * 9)) + String(Math.floor(rnd() * 10)),
      addetti,
      fatturato: fatt,
      email: haEmail ? 'info@' + slug + '.example' : '',
      pec: havePec ? slug + '@pec.' + slug + '.example' : '',
      telefono: haTel ? '+39 000 ' + String(100000 + Math.floor(rnd() * 899999)) : '',
      sito: haSito ? 'https://www.' + slug + '.example' : '',
      fonte: 'DEMO (fittizio)'
    });
  }
  return out;
};
