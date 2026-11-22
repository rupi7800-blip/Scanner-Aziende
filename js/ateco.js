// Classificazione ATECO 2007: sezioni (settori) e divisioni (sottosettori).
// Le divisioni sono le prime due cifre del codice ATECO.
window.ATECO = (function () {
  const sezioni = [
    ['A', 'Agricoltura, silvicoltura e pesca', 1, 3, { 1: 'Coltivazioni e allevamento', 2: 'Silvicoltura', 3: 'Pesca e acquacoltura' }],
    ['B', 'Estrazione di minerali', 5, 9, { 8: 'Cave e altre estrazioni' }],
    ['C', 'Attività manifatturiere', 10, 33, {
      10: 'Industrie alimentari', 11: 'Bevande', 13: 'Industrie tessili', 14: 'Abbigliamento',
      15: 'Pelle e calzature', 16: 'Legno e sughero', 17: 'Carta', 18: 'Stampa', 20: 'Chimica',
      21: 'Farmaceutica', 22: 'Gomma e plastica', 23: 'Minerali non metalliferi', 24: 'Metallurgia',
      25: 'Prodotti in metallo', 26: 'Elettronica e ottica', 27: 'Apparecchi elettrici',
      28: 'Macchinari', 29: 'Autoveicoli', 31: 'Mobili', 32: 'Altre manifatturiere', 33: 'Riparazione e installazione macchine'
    }],
    ['D', 'Energia elettrica e gas', 35, 35, { 35: 'Fornitura di energia e gas' }],
    ['E', 'Acqua, rifiuti e risanamento', 36, 39, { 36: 'Acqua', 38: 'Raccolta e smaltimento rifiuti' }],
    ['F', 'Costruzioni', 41, 43, { 41: 'Costruzione di edifici', 42: 'Ingegneria civile', 43: 'Lavori specializzati' }],
    ['G', 'Commercio', 45, 47, { 45: 'Commercio e riparazione auto', 46: 'Commercio all\'ingrosso', 47: 'Commercio al dettaglio' }],
    ['H', 'Trasporto e magazzinaggio', 49, 53, { 49: 'Trasporto terrestre', 50: 'Trasporto marittimo', 52: 'Magazzinaggio e logistica', 53: 'Servizi postali e corrieri' }],
    ['I', 'Alloggio e ristorazione', 55, 56, { 55: 'Alloggio', 56: 'Ristorazione' }],
    ['J', 'Informazione e comunicazione', 58, 63, { 58: 'Editoria', 59: 'Produzione audiovisiva', 61: 'Telecomunicazioni', 62: 'Software e consulenza IT', 63: 'Servizi di informazione' }],
    ['K', 'Attività finanziarie e assicurative', 64, 66, { 64: 'Servizi finanziari', 65: 'Assicurazioni', 66: 'Attività ausiliarie finanziarie' }],
    ['L', 'Attività immobiliari', 68, 68, { 68: 'Attività immobiliari' }],
    ['M', 'Attività professionali e tecniche', 69, 75, { 69: 'Legale e contabilità', 70: 'Consulenza gestionale', 71: 'Architettura e ingegneria', 72: 'Ricerca e sviluppo', 73: 'Pubblicità e ricerche di mercato', 74: 'Altre attività professionali' }],
    ['N', 'Noleggio e servizi alle imprese', 77, 82, { 77: 'Noleggio', 78: 'Selezione del personale', 79: 'Agenzie di viaggio', 80: 'Vigilanza', 81: 'Servizi per edifici e paesaggio', 82: 'Servizi di supporto alle imprese' }],
    ['O', 'Amministrazione pubblica', 84, 84, { 84: 'Amministrazione pubblica e difesa' }],
    ['P', 'Istruzione', 85, 85, { 85: 'Istruzione e formazione' }],
    ['Q', 'Sanità e assistenza sociale', 86, 88, { 86: 'Assistenza sanitaria', 87: 'Assistenza residenziale', 88: 'Assistenza sociale non residenziale' }],
    ['R', 'Arte, sport e intrattenimento', 90, 93, { 90: 'Attività creative e artistiche', 93: 'Sport e intrattenimento' }],
    ['S', 'Altre attività di servizi', 94, 96, { 94: 'Organizzazioni associative', 95: 'Riparazione di beni personali', 96: 'Servizi alla persona' }]
  ].map(([codice, nome, da, a, divisioni]) => ({ codice, nome, da, a, divisioni }));

  function sezioneDaDivisione(div) {
    const s = sezioni.find(x => div >= x.da && div <= x.a);
    return s ? s.codice : null;
  }
  function sezioneDaCodice(ateco) {
    const m = String(ateco || '').match(/^\s*(\d{2})/);
    return m ? sezioneDaDivisione(parseInt(m[1], 10)) : null;
  }
  function divisioneDaCodice(ateco) {
    const m = String(ateco || '').match(/^\s*(\d{2})/);
    return m ? parseInt(m[1], 10) : null;
  }
  function nomeDivisione(div) {
    const s = sezioni.find(x => div >= x.da && div <= x.a);
    return (s && s.divisioni[div]) || 'Divisione ' + String(div).padStart(2, '0');
  }
  return { sezioni, sezioneDaCodice, divisioneDaCodice, nomeDivisione };
})();
