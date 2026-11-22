// Utilità comuni ai connettori. Richiede Node >= 18 (fetch nativo).
// Dietro a un proxy aziendale: NODE_USE_ENV_PROXY=1 (Node >= 22.21) e, se serve, NODE_EXTRA_CA_CERTS=<bundle>.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const RADICE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATI = path.join(RADICE, 'dati');
export const pausa = ms => new Promise(r => setTimeout(r, ms));

export function opzioni(argv = process.argv.slice(2)) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      o[k] = v;
    } else o._.push(argv[i]);
  }
  return o;
}

export function province() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(RADICE, 'js/province.js'), 'utf8'), ctx);
  return ctx.window.PROVINCE;
}
export const sigleValide = () => new Set(province().map(p => p.sigla));

export async function scarica(url, opts = {}, tentativi = 4) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, {
        ...opts,
        headers: { 'User-Agent': 'scanner-aziende/1.0 (client open data)', ...(opts.headers || {}) },
        signal: AbortSignal.timeout(opts.timeout || 120000)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return r;
    } catch (e) {
      if (i >= tentativi) throw e;
      console.error(`  tentativo ${i} fallito (${e.message}); riprovo…`);
      await pausa(1500 * i * i);
    }
  }
}

export const testo = s => (s == null ? '' : String(s).replace(/\s+/g, ' ').trim());
export function sito(s) {
  s = testo(s).toLowerCase();
  if (!s || s === '-' || s === 'n.d.') return '';
  return /^https?:\/\//.test(s) ? s : 'http://' + s;
}
export const pivaValida = s => /^\d{11}$/.test(String(s || '').trim());

// Salva dati/<nome>.json e aggiorna dati/indice.json (elenco delle fonti caricate dall'app).
export function salva(nome, righe, meta) {
  fs.mkdirSync(DATI, { recursive: true });
  fs.writeFileSync(path.join(DATI, nome + '.json'), JSON.stringify(righe));
  const fIdx = path.join(DATI, 'indice.json');
  let idx = { fonti: [] };
  try { idx = JSON.parse(fs.readFileSync(fIdx, 'utf8')); } catch { /* primo salvataggio */ }
  idx.fonti = idx.fonti.filter(f => f.file !== nome + '.json');
  idx.fonti.push({ file: nome + '.json', n: righe.length, aggiornato: new Date().toISOString().slice(0, 10), ...meta });
  fs.writeFileSync(fIdx, JSON.stringify(idx, null, 2));
  console.log(`Salvate ${righe.length} aziende in dati/${nome}.json`);
}
