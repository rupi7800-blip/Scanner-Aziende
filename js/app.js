(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const PAGINA = 50;
  const DIM = { micro: 'Micro', piccola: 'Piccola', media: 'Media', grande: 'Grande', nd: 'Non determinabile' };
  let dati = [];
  let filtrati = [];
  let ordine = { campo: 'fatturato', dir: -1 };
  let pagina = 0;

  // ---------- utilità ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = v => v == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' }).format(v);
  // Legge numeri anche in formato italiano ("1.250.000", "1250000,50", "€ 1.250,5").
  function num(v) {
    if (v == null || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    let s = String(v).replace(/[€\s]/g, '');
    if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(',', '.');
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s);
    return s === '' || !isFinite(n) ? null : n;
  }
  // Accetta solo sigle valide o nomi di provincia (convertiti in sigla); altrimenti vuoto.
  function siglaProvincia(v) {
    const t = String(v || '').trim();
    if (!t) return '';
    const up = t.toUpperCase();
    const p = window.PROVINCE.find(x => x.sigla === up) ||
      window.PROVINCE.find(x => x.nome.toLowerCase() === t.toLowerCase());
    return p ? p.sigla : '';
  }
  const urlSicuro = u => /^https?:\/\//i.test(u) ? u : (u ? 'https://' + u : '');

  // Dimensione secondo la raccomandazione UE 2003/361 (addetti + fatturato).
  function dimensione(a) {
    const add = a.addetti, f = a.fatturato;
    if (add == null && f == null) return 'nd';
    const livelli = [['micro', 10, 2e6], ['piccola', 50, 10e6], ['media', 250, 50e6]];
    for (const [k, maxAdd, maxF] of livelli) {
      const okAdd = add == null || add < maxAdd;
      const okF = f == null || f <= maxF;
      if (okAdd && okF && (add != null || f != null)) return k;
    }
    return 'grande';
  }

  function normalizza(r, i, fonte) {
    const t = v => (v == null ? '' : String(v));
    const ateco = t(r.ateco || r.codice_ateco);
    return {
      id: r.id || fonte + '-' + i,
      nome: t(r.nome || r.ragione_sociale || r.denominazione) || '(senza nome)',
      piva: t(r.piva || r.partita_iva),
      provincia: siglaProvincia(r.provincia || r.prov),
      comune: t(r.comune || r.citta),
      indirizzo: t(r.indirizzo),
      ateco,
      addetti: num(r.addetti != null && r.addetti !== '' ? r.addetti : r.dipendenti),
      fatturato: num(r.fatturato),
      email: t(r.email),
      pec: t(r.pec),
      telefono: t(r.telefono || r.tel),
      sito: t(r.sito || r.sito_web),
      fonte: t(r.fonte) || fonte,
      archivio: fonte
    };
  }

  // ---------- import CSV / JSON ----------
  function parseCSV(testo) {
    const sep = (testo.split('\n')[0].match(/;/g) || []).length > (testo.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const righe = []; let cur = [], campo = '', q = false;
    for (let i = 0; i < testo.length; i++) {
      const c = testo[i];
      if (q) {
        if (c === '"' && testo[i + 1] === '"') { campo += '"'; i++; }
        else if (c === '"') q = false;
        else campo += c;
      } else if (c === '"') q = true;
      else if (c === sep) { cur.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && testo[i + 1] === '\n') i++;
        cur.push(campo); campo = '';
        if (cur.some(x => x !== '')) righe.push(cur);
        cur = [];
      } else campo += c;
    }
    cur.push(campo); if (cur.some(x => x !== '')) righe.push(cur);
    const head = righe.shift().map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    return righe.map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }

  async function importa(e) {
    const file = e.target.files[0];
    const testo = await file.text();
    let righe;
    try {
      righe = /\.json$/i.test(file.name) ? JSON.parse(testo) : parseCSV(testo);
      if (!Array.isArray(righe)) throw new Error('Il JSON deve essere un elenco di aziende');
    } catch (e) { alert('File non valido: ' + e.message); return; }
    const nuovi = righe.filter(r => r && typeof r === 'object').map((r, i) => normalizza(r, i, file.name));
    const senzaProv = nuovi.filter(d => !d.provincia).length;
    // Reimportare lo stesso file sostituisce le righe precedenti invece di duplicarle.
    dati = dati.filter(d => !d.fonte.startsWith('DEMO') && d.archivio !== file.name).concat(nuovi);
    e.target.value = '';
    salva(); iniziaFiltri(); applica();
    $('fonteInfo').textContent = `Caricate ${nuovi.length} aziende da ${file.name}.` +
      (senzaProv ? ` Attenzione: ${senzaProv} senza provincia riconoscibile (usa la sigla, es. MI).` : '');
  }

  async function svuota() {
    if (!confirm('Cancellare dal browser tutti gli archivi importati?')) return;
    try {
      const d = await db();
      await new Promise((ok, ko) => {
        const tx = d.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete('importati');
        tx.oncomplete = ok; tx.onerror = () => ko(tx.error);
      });
    } catch (e) { alert('Impossibile cancellare l\'archivio locale: ' + (e && e.message || e)); return; }
    dati = window.generaDemo();
    $('fonteInfo').textContent = 'Archivio locale svuotato. Dati DEMO interamente fittizi.';
    iniziaFiltri(); applica();
  }

  // Persistenza locale (IndexedDB) degli archivi importati.
  const db = () => new Promise((ok, ko) => {
    const r = indexedDB.open('scanner-aziende', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
  });
  async function salva() {
    try {
      const d = await db();
      d.transaction('kv', 'readwrite').objectStore('kv').put(dati.filter(x => !x.fonte.startsWith('DEMO')), 'importati');
    } catch (e) { /* storage non disponibile: i dati restano in memoria */ }
  }
  async function carica() {
    try {
      const d = await db();
      return await new Promise(ok => {
        const r = d.transaction('kv').objectStore('kv').get('importati');
        r.onsuccess = () => ok(r.result || []); r.onerror = () => ok([]);
      });
    } catch (e) { return []; }
  }

  // ---------- filtri ----------
  function iniziaFiltri() {
    const selP = $('provincia');
    const cont = {};
    dati.forEach(d => cont[d.provincia] = (cont[d.provincia] || 0) + 1);
    const perRegione = {};
    window.PROVINCE.forEach(p => (perRegione[p.regione] = perRegione[p.regione] || []).push(p));
    selP.innerHTML = '<option value="">Tutte le province</option>' + Object.keys(perRegione).sort().map(reg =>
      `<optgroup label="${esc(reg)}">` + perRegione[reg].map(p =>
        `<option value="${p.sigla}">${esc(p.nome)} (${p.sigla}) · ${cont[p.sigla] || 0}</option>`).join('') + '</optgroup>').join('');

    const contS = {};
    dati.forEach(d => { const s = ATECO.sezioneDaCodice(d.ateco); if (s) contS[s] = (contS[s] || 0) + 1; });
    $('settore').innerHTML = '<option value="">Tutti i settori</option>' + ATECO.sezioni.map(s =>
      `<option value="${s.codice}">${s.codice} · ${esc(s.nome)} · ${contS[s.codice] || 0}</option>`).join('');
    aggiornaSottosettori();
  }

  function aggiornaSottosettori() {
    const sez = $('settore').value, sel = $('sottosettore');
    if (!sez) { sel.innerHTML = '<option value="">Scegli prima un settore</option>'; sel.disabled = true; return; }
    const cont = {};
    dati.forEach(d => { if (ATECO.sezioneDaCodice(d.ateco) === sez) { const v = ATECO.divisioneDaCodice(d.ateco); cont[v] = (cont[v] || 0) + 1; } });
    const voci = Object.keys(cont).map(Number).sort((a, b) => a - b);
    sel.innerHTML = '<option value="">Tutti i sottosettori</option>' + (voci.length
      ? voci.map(v => `<option value="${v}">${String(v).padStart(2, '0')} · ${esc(ATECO.nomeDivisione(v))} · ${cont[v]}</option>`).join('')
      : '');
    sel.disabled = !voci.length;
    if (!voci.length) sel.innerHTML = '<option value="">Nessun sottosettore nei dati</option>';
  }

  function applica() {
    const prov = $('provincia').value, sez = $('settore').value, sub = $('sottosettore').value;
    const dims = [...document.querySelectorAll('input[name=dim]:checked')].map(x => x.value);
    const q = $('cerca').value.trim().toLowerCase();
    const fMin = num($('fattMin').value), fMax = num($('fattMax').value);
    const soloContatti = $('soloContatti').checked, soloFatt = $('soloFatturato').checked;
    filtrati = dati.filter(d => {
      if (prov && d.provincia !== prov) return false;
      if (sez && ATECO.sezioneDaCodice(d.ateco) !== sez) return false;
      if (sub && String(ATECO.divisioneDaCodice(d.ateco)) !== sub) return false;
      if (dims.length && !dims.includes(dimensione(d))) return false;
      if (soloFatt && d.fatturato == null) return false;
      if (fMin != null && (d.fatturato == null || d.fatturato < fMin * 1000)) return false;
      if (fMax != null && (d.fatturato == null || d.fatturato > fMax * 1000)) return false;
      if (soloContatti && !(d.email || d.pec || d.telefono)) return false;
      if (q && !(d.nome + ' ' + d.piva + ' ' + d.comune).toLowerCase().includes(q)) return false;
      return true;
    });
    ordina(); pagina = 0; disegna();
  }

  function ordina() {
    const { campo, dir } = ordine;
    filtrati.sort((a, b) => {
      let x = a[campo], y = b[campo];
      if (campo === 'dimensione') { x = dimensione(a); y = dimensione(b); }
      if (x == null || x === '') return 1;           // i valori mancanti vanno sempre in fondo
      if (y == null || y === '') return -1;
      return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'it')) * dir;
    });
  }

  // ---------- rendering ----------
  function disegna() {
    const tot = filtrati.length;
    const conF = filtrati.filter(d => d.fatturato != null);
    const somma = conF.reduce((s, d) => s + d.fatturato, 0);
    $('riepilogo').innerHTML = `<b>${tot.toLocaleString('it-IT')}</b> aziende · con contatti <b>${filtrati.filter(d => d.email || d.pec || d.telefono).length.toLocaleString('it-IT')}</b> · fatturato noto per <b>${conF.length.toLocaleString('it-IT')}</b> (somma ${eur(somma)})`;
    const da = pagina * PAGINA, fetta = filtrati.slice(da, da + PAGINA);
    $('righe').innerHTML = fetta.map(d => {
      const k = dimensione(d);
      const contatti = [
        d.email && `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>`,
        d.pec && `<span title="PEC">PEC: <a href="mailto:${esc(d.pec)}">${esc(d.pec)}</a></span>`,
        d.telefono && `<a href="tel:${esc(d.telefono.replace(/\s/g, ''))}">${esc(d.telefono)}</a>`,
        d.sito && `<a href="${esc(urlSicuro(d.sito))}" target="_blank" rel="noopener noreferrer">sito</a>`
      ].filter(Boolean).join('<br>') || '<span class="muto">nessun contatto</span>';
      const div = ATECO.divisioneDaCodice(d.ateco);
      return `<tr>
        <td data-l="Azienda"><b>${esc(d.nome)}</b><br><span class="muto">P.IVA ${esc(d.piva || 'n.d.')} · ${esc(d.fonte)}</span></td>
        <td data-l="Sede">${esc(d.comune)}<br><span class="muto">${esc(d.provincia || 'prov. n.d.')}</span></td>
        <td data-l="Settore">${esc(ATECO.sezioneDaCodice(d.ateco) || '—')} · ${div != null ? esc(ATECO.nomeDivisione(div)) : '—'}<br><span class="muto">ATECO ${esc(d.ateco || 'n.d.')}</span></td>
        <td data-l="Dimensione"><span class="badge ${k}">${DIM[k]}</span><br><span class="muto">${d.addetti != null ? d.addetti + ' addetti' : 'addetti n.d.'}</span></td>
        <td data-l="Fatturato" class="dx">${eur(d.fatturato)}</td>
        <td data-l="Contatti">${contatti}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="vuoto">Nessuna azienda corrisponde ai filtri.</td></tr>';
    const pagine = Math.max(1, Math.ceil(tot / PAGINA));
    $('pagInfo').textContent = `Pagina ${pagina + 1} di ${pagine}`;
    $('prec').disabled = pagina === 0; $('succ').disabled = pagina >= pagine - 1;
    document.querySelectorAll('th[data-k]').forEach(th => {
      th.setAttribute('aria-sort', th.dataset.k === ordine.campo ? (ordine.dir > 0 ? 'ascending' : 'descending') : 'none');
    });
  }

  function esporta() {
    const col = ['nome', 'piva', 'provincia', 'comune', 'indirizzo', 'ateco', 'addetti', 'fatturato', 'email', 'pec', 'telefono', 'sito'];
    // Neutralizza formule per Excel/Sheets (CSV injection).
    const cella = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const righe = [col.concat('dimensione').join(';')].concat(filtrati.map(d => col.map(c => cella(d[c])).concat(cella(DIM[dimensione(d)])).join(';')));
    const blob = new Blob(['﻿' + righe.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'aziende-filtrate.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- avvio ----------
  async function avvia() {
    const importati = await carica();
    dati = importati.length ? importati : window.generaDemo();
    $('fonteInfo').textContent = importati.length
      ? `Caricate ${importati.length} aziende dai tuoi archivi importati.`
      : 'Dati DEMO interamente fittizi: importa un tuo archivio CSV/JSON per lavorare su dati reali.';
    iniziaFiltri(); applica();

    ['provincia', 'sottosettore', 'fattMin', 'fattMax', 'soloContatti', 'soloFatturato'].forEach(id => $(id).addEventListener('input', applica));
    $('settore').addEventListener('input', () => { aggiornaSottosettori(); applica(); });
    $('cerca').addEventListener('input', applica);
    document.querySelectorAll('input[name=dim]').forEach(x => x.addEventListener('change', applica));
    $('azzera').addEventListener('click', () => { $('filtri').reset(); aggiornaSottosettori(); applica(); });
    $('prec').addEventListener('click', () => { pagina--; disegna(); window.scrollTo(0, $('tabella').offsetTop - 10); });
    $('succ').addEventListener('click', () => { pagina++; disegna(); window.scrollTo(0, $('tabella').offsetTop - 10); });
    $('esporta').addEventListener('click', esporta);
    $('file').addEventListener('change', e => e.target.files[0] && importa(e));
    $('svuota').addEventListener('click', svuota);
    document.querySelectorAll('th[data-k]').forEach(th => {
      const ordinaPer = () => {
        const k = th.dataset.k;
        ordine = { campo: k, dir: ordine.campo === k ? -ordine.dir : (k === 'fatturato' || k === 'addetti' ? -1 : 1) };
        ordina(); pagina = 0; disegna();
      };
      th.tabIndex = 0;
      th.addEventListener('click', ordinaPer);
      th.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ordinaPer(); } });
    });
  }
  avvia();
})();
