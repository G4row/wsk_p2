/* =====================================================================
   Warehouse Swiss Knife — session data (shared)
   ---------------------------------------------------------------------
   The master workbook is read ONCE at sign-in and kept in the browser
   (IndexedDB) until sign-out. Every module reads it from here, so a big
   file is never parsed twice.

   A module can load its own Excel file. That file then applies to THAT
   module only (an "override"), until the user presses [Use main].

     WSKSession.ready                  -> Promise<session|null>
     WSKSession.user()                 -> 'marko' | ''
     WSKSession.sheet(name)            -> rows without header ([] if missing)
     WSKSession.hasSheet(name)
     WSKSession.parseFile(file)        -> Promise<{name, sheets}>
     WSKSession.signIn(user, parsed)   -> Promise
     WSKSession.signOut()              -> Promise
     WSKSession.getOverride(page)      -> Promise<{fileName, sheets}|null>
     WSKSession.setOverride(page, fileName, sheets) / clearOverride(page)
     WSKSession.bindSource(el, page, onUseMain)  -> source line in a card
   ===================================================================== */
(function () {
  'use strict';

  var DB = 'wsk', STORE = 'kv', USER_KEY = 'wskUser';

  /* English sheet names, plus the Croatian names of the first template */
  var ALIASES = {
    instructions: ['instructions', 'upute'],
    settings: ['settings', 'postavke'],
    clients: ['clients', 'klijenti'],
    racks: ['racks', 'rackovi'],
    masterdata: ['masterdata', 'master data', 'products', 'proizvodi'],
    stock: ['stock', 'zalihe', 'inventory', 'inventar'],
    inbound: ['inbound', 'ulaz'],
    orders: ['orders', 'narudzbe', 'narudžbe'],
    outbound: ['outbound', 'izlaz']
  };

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { reject(new Error('no indexedDB')); return; }
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode), st = t.objectStore(STORE), out;
        out = fn(st);
        t.oncomplete = function () { resolve(out && 'result' in out ? out.result : undefined); db.close(); };
        t.onerror = function () { reject(t.error); db.close(); };
      });
    });
  }
  var get = function (k) { return tx('readonly', function (s) { return s.get(k); }); };
  var put = function (k, v) { return tx('readwrite', function (s) { s.put(v, k); }); };
  var del = function (k) { return tx('readwrite', function (s) { s.delete(k); }); };
  var clearAll = function () { return tx('readwrite', function (s) { s.clear(); }); };

  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }

  /* ---------- reading an Excel file ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function cellValue(v) {
    if (v instanceof Date) {
      // time-only cells come back as 1899-12-30 hh:mm
      if (v.getFullYear() < 1901) return pad(v.getHours()) + ':' + pad(v.getMinutes());
      return v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(v.getDate());
    }
    return v;
  }

  function parseFile(file) {
    return new Promise(function (resolve, reject) {
      if (typeof XLSX === 'undefined') { reject(new Error('xlsx_missing')); return; }
      var reader = new FileReader();
      reader.onload = function (e) {
        try { resolve(parseBuffer(e.target.result, file.name)); }
        catch (err) { reject(err); }
      };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsArrayBuffer(file);
    });
  }

  function parseBuffer(buffer, name) {
    var wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
    var sheets = {}, order = [];
    wb.SheetNames.forEach(function (sn) {
      var rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, blankrows: false });
      sheets[sn] = rows.map(function (r) { return (r || []).map(cellValue); });
      order.push(sn);
    });
    return { name: name, sheets: sheets, order: order };
  }

  /* find a sheet by its English or Croatian name, case-insensitive */
  function findSheet(sheets, key) {
    if (!sheets) return null;
    var wanted = ALIASES[key] || [key];
    var names = Object.keys(sheets);
    for (var i = 0; i < names.length; i++) {
      if (wanted.indexOf(names[i].trim().toLowerCase()) !== -1) return sheets[names[i]];
    }
    return null;
  }

  /* ---------- the session ---------- */
  var current = null;

  var ready = get('session').then(function (s) {
    current = s || null;
    if (!current && lsGet(USER_KEY)) lsSet(USER_KEY, '');
    return current;
  }).catch(function () { current = null; return null; });

  function signIn(user, parsed) {
    var s = { user: String(user || '').trim() || 'demo', fileName: parsed ? parsed.name : '',
              loadedAt: new Date().toISOString(), sheets: parsed ? parsed.sheets : {} };
    return clearAll().then(function () { return put('session', s); }).then(function () {
      current = s; lsSet(USER_KEY, s.user); return s;
    });
  }

  function signOut() {
    current = null; lsSet(USER_KEY, '');
    return clearAll().catch(function () {});
  }

  function sheet(key) {
    var rows = current ? findSheet(current.sheets, key) : null;
    return rows ? rows.slice(1) : [];
  }
  function rawSheet(key) {
    var rows = current ? findSheet(current.sheets, key) : null;
    return rows ? rows.slice() : [];
  }
  function hasSheet(key) { return !!(current && findSheet(current.sheets, key)); }

  /* ---------- per-module override ---------- */
  function getOverride(page) { return get('override:' + page).then(function (v) { return v || null; }).catch(function () { return null; }); }
  function setOverride(page, fileName, data) { return put('override:' + page, { fileName: fileName, data: data }).catch(function () {}); }
  function clearOverride(page) { return del('override:' + page).catch(function () {}); }

  /* ---------- "data source" line shown in a module ---------- */
  var COMMON = {
    en: { src_main: 'Data: {f} (master workbook)', src_own: 'Data for this module: {f}', src_none: 'No master workbook loaded. Upload a file or sign in on the start page.', src_use_main: 'Use master workbook' },
    nl: { src_main: 'Gegevens: {f} (hoofdbestand)', src_own: 'Gegevens voor deze module: {f}', src_none: 'Geen hoofdbestand geladen. Upload een bestand of log in op de startpagina.', src_use_main: 'Hoofdbestand gebruiken' },
    hr: { src_main: 'Podaci: {f} (glavni Excel)', src_own: 'Podaci za ovaj modul: {f}', src_none: 'Glavni Excel nije učitan. Učitajte datoteku ili se prijavite na početnoj stranici.', src_use_main: 'Koristi glavni Excel' }
  };
  if (window.PAGE_I18N) {
    ['en', 'nl', 'hr'].forEach(function (l) {
      window.PAGE_I18N[l] = window.PAGE_I18N[l] || {};
      Object.keys(COMMON[l]).forEach(function (k) { if (!(k in window.PAGE_I18N[l])) window.PAGE_I18N[l][k] = COMMON[l][k]; });
    });
  }

  function bindSource(el, page, onUseMain) {
    if (!el) return { refresh: function () {} };
    var api = { own: null };
    function render() {
      el.innerHTML = '';
      var line = document.createElement('span');
      el.appendChild(line);
      if (api.own) {
        WSK.setText(line, 'src_own', { f: api.own });
        if (current) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'btn btn-secondary btn-sm src-main';
          b.setAttribute('data-i18n', 'src_use_main'); b.textContent = WSK.t('src_use_main');
          b.addEventListener('click', function () {
            clearOverride(page).then(function () { api.own = null; render(); if (onUseMain) onUseMain(); });
          });
          el.appendChild(b);
        }
      } else if (current) {
        WSK.setText(line, 'src_main', { f: current.fileName || 'demo' });
      } else {
        WSK.setText(line, 'src_none');
      }
    }
    api.refresh = function (ownName) { api.own = ownName || null; render(); };
    document.addEventListener('wsk:langchange', render);
    return api;
  }

  /* ---------- one call per module ----------
     o.page      module key ('picking', 'mod', …)
     o.srcEl     element for the "data source" line
     o.fromMain  () => data | null   data from the master workbook (same shape as an upload)
     o.load      (data) => void      show the data in the module (replaces what was loaded)
     o.clear     () => void          optional: empty the module before [Use main]
     returns { saved(fileName, data) } — call it after the module's own upload */
  function wireModule(o) {
    var src = bindSource(o.srcEl, o.page, function () { if (o.clear) o.clear(); loadMain(); });
    function loadMain() {
      var d = current ? o.fromMain() : null;
      if (d) o.load(d, true);
      src.refresh(null);
    }
    ready.then(function () { return getOverride(o.page); }).then(function (ov) {
      if (ov && ov.data) { o.load(ov.data, false); src.refresh(ov.fileName); }
      else loadMain();
    });
    return {
      saved: function (fileName, data) { setOverride(o.page, fileName, data); src.refresh(fileName); }
    };
  }

  window.WSKSession = {
    ready: ready,
    rawSheet: rawSheet,
    user: function () { return current ? current.user : lsGet(USER_KEY); },
    fileName: function () { return current ? current.fileName : ''; },
    loadedAt: function () { return current ? current.loadedAt : ''; },
    isSignedIn: function () { return !!current; },
    sheet: sheet, hasSheet: hasSheet, findSheet: findSheet,
    parseFile: parseFile, parseBuffer: parseBuffer,
    signIn: signIn, signOut: signOut,
    getOverride: getOverride, setOverride: setOverride, clearOverride: clearOverride,
    bindSource: bindSource, wireModule: wireModule
  };
})();
