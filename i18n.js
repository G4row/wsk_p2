/* =====================================================================
   Warehouse Swiss Knife — shared language + navigation
   ---------------------------------------------------------------------
   Every page loads this file in <head>:  <script src="i18n.js"></script>
   and defines its own texts in  window.PAGE_I18N = { en:{}, nl:{}, hr:{} }

   Markup attributes:
     data-i18n="key"               -> textContent
     data-i18n-placeholder="key"   -> placeholder
     data-i18n-title="key"         -> title
     data-i18n-aria="key"          -> aria-label
     data-lang-switcher            -> EN / NL / HR buttons are built here
     data-nav                      -> bottom navigation is built here
     <body data-page="mod">        -> marks the active nav item

   In JavaScript:
     WSK.t('key', {n: 5})          -> translated text, {n} replaced
     WSK.getLang()                 -> 'en' | 'nl' | 'hr'
     WSK.esc(text)                 -> HTML-escaped text for innerHTML
     document.addEventListener('wsk:langchange', fn)  -> re-render dynamic parts

   The chosen language is stored in localStorage ('appLang'), so it is the
   same on every page and is remembered next time.
   ===================================================================== */
(function () {
  'use strict';

  var LANGS = ['en', 'nl', 'hr'];
  var STORE_KEY = 'appLang';

  var COMMON = {
    en: {
      brand_sub: 'Warehouse operations toolkit',
      lang_label: 'Language',
      nav_label: 'Tools',
      nav_menu: 'Menu', nav_picking: 'Picking', nav_form: 'Checklist', nav_abc: 'ABC',
      nav_inventory: 'Inventory', nav_locations: 'Locations', nav_layout: 'Layout', nav_qr: 'QR / Barcode',
      nav_inbound: 'Inbound', nav_outbound: 'Outbound', nav_mod: 'MOD', nav_timer: 'Timer',
      remove: 'Remove', close: 'Close', no_rows: 'No entries yet.',
      choose_file: 'Choose file', no_file: 'No file chosen',
      install_app: 'Install app',
      excel_loaded: '{n} rows loaded from Excel.',
      excel_error: 'Could not read this file. Check that it is a valid Excel or CSV file.',
      xlsx_missing: 'Excel library (xlsx.full.min.js) could not be loaded.'
    },
    nl: {
      brand_sub: 'Toolkit voor magazijnoperaties',
      lang_label: 'Taal',
      nav_label: 'Tools',
      nav_menu: 'Menu', nav_picking: 'Picking', nav_form: 'Controlelijst', nav_abc: 'ABC',
      nav_inventory: 'Voorraad', nav_locations: 'Locaties', nav_layout: 'Indeling', nav_qr: 'QR / Barcode',
      nav_inbound: 'Inkomend', nav_outbound: 'Uitgaand', nav_mod: 'MOD', nav_timer: 'Timer',
      remove: 'Verwijderen', close: 'Sluiten', no_rows: 'Nog geen invoer.',
      choose_file: 'Bestand kiezen', no_file: 'Geen bestand gekozen',
      install_app: 'App installeren',
      excel_loaded: '{n} regels geladen uit Excel.',
      excel_error: 'Dit bestand kan niet worden gelezen. Controleer of het een geldig Excel- of CSV-bestand is.',
      xlsx_missing: 'Excel-bibliotheek (xlsx.full.min.js) kon niet worden geladen.'
    },
    hr: {
      brand_sub: 'Alati za skladišne operacije',
      lang_label: 'Jezik',
      nav_label: 'Alati',
      nav_menu: 'Izbornik', nav_picking: 'Picking', nav_form: 'Kontrolna lista', nav_abc: 'ABC',
      nav_inventory: 'Inventar', nav_locations: 'Lokacije', nav_layout: 'Raspored', nav_qr: 'QR / Barkod',
      nav_inbound: 'Ulaz', nav_outbound: 'Izlaz', nav_mod: 'MOD', nav_timer: 'Štoperica',
      remove: 'Ukloni', close: 'Zatvori', no_rows: 'Još nema unosa.',
      choose_file: 'Odaberi datoteku', no_file: 'Nije odabrana datoteka',
      install_app: 'Instaliraj aplikaciju',
      excel_loaded: 'Učitano {n} redaka iz Excela.',
      excel_error: 'Datoteku nije moguće pročitati. Provjerite je li ispravna Excel ili CSV datoteka.',
      xlsx_missing: 'Excel biblioteka (xlsx.full.min.js) nije učitana.'
    }
  };

  var ICONS = {
    menu: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    picking: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    form: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    abc: 'M5 9.2h3V19H5zM10.5 5h3v14h-3zM16 13h3v6h-3z',
    inventory: 'M20 13H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1zm-1 5H5v-4h14v4zM20 3H4c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1zm-1 5H5V5h14v3z',
    locations: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    layout: 'M4 11h5V5H4v6zm0 7h5v-6H4v6zm6 0h5v-6h-5v6zm6 0h5v-6h-5v6zm-6-7h5V5h-5v6zm6-6v6h5V5h-5z',
    qr: 'M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm2 2h2v2h-2zm2-2h2v2h-2zm0-4h2v2h-2zm2 2h2v2h-2zm0 4h2v2h-2z',
    inbound: 'M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-8 11l-4-4h3V9h2v4h3l-4 4z',
    outbound: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9 1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    mod: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2z',
    timer: 'M15 1H9v2h6V1zm-2 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z'
  };

  // Order follows the home page: Operations, Inventory, Tools, Administration
  var NAV = [
    { page: 'index', href: 'index.html', key: 'nav_menu', icon: 'menu' },
    { page: 'picking', href: 'picking.html', key: 'nav_picking', icon: 'picking' },
    { page: 'inbound', href: 'inbound.html', key: 'nav_inbound', icon: 'inbound' },
    { page: 'outbound', href: 'outbound.html', key: 'nav_outbound', icon: 'outbound' },
    { page: 'abc', href: 'abc.html', key: 'nav_abc', icon: 'abc' },
    { page: 'inventory', href: 'inventory.html', key: 'nav_inventory', icon: 'inventory' },
    { page: 'locations', href: 'locations.html', key: 'nav_locations', icon: 'locations' },
    { page: 'layout', href: 'layout.html', key: 'nav_layout', icon: 'layout' },
    { page: 'qr', href: 'qr.html', key: 'nav_qr', icon: 'qr' },
    { page: 'mod', href: 'mod.html', key: 'nav_mod', icon: 'mod' },
    { page: 'stopwatch', href: 'stopwatch.html', key: 'nav_timer', icon: 'timer' },
    { page: 'form', href: 'form.html', key: 'nav_form', icon: 'form' }
  ];

  function readStored() {
    var v = null;
    try { v = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (!v) { try { v = sessionStorage.getItem(STORE_KEY); } catch (e) {} }
    return v;
  }

  function writeStored(lang) {
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    try { sessionStorage.setItem(STORE_KEY, lang); } catch (e) {}
  }

  function guessLang() {
    var nav = (navigator.language || 'en').toLowerCase();
    if (nav.indexOf('nl') === 0) return 'nl';
    if (nav.indexOf('hr') === 0 || nav.indexOf('bs') === 0 || nav.indexOf('sr') === 0) return 'hr';
    return 'en';
  }

  var lang = readStored();
  if (LANGS.indexOf(lang) === -1) lang = guessLang();

  function lookup(l, key) {
    var page = window.PAGE_I18N || {};
    if (page[l] && page[l][key] != null) return page[l][key];
    if (COMMON[l] && COMMON[l][key] != null) return COMMON[l][key];
    return null;
  }

  function t(key, vars) {
    var s = lookup(lang, key);
    if (s == null) s = lookup('en', key);
    if (s == null) s = key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.split('{' + k + '}').join(vars[k]);
      });
    }
    return s;
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var vars = null;
      var raw = el.getAttribute('data-i18n-vars');
      if (raw) { try { vars = JSON.parse(raw); } catch (e) {} }
      el.textContent = t(el.getAttribute('data-i18n'), vars);
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    document.querySelectorAll('.lang-btn[data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    document.querySelectorAll('[data-lang-switcher]').forEach(function (box) {
      box.setAttribute('aria-label', t('lang_label'));
    });
    document.querySelectorAll('[data-nav]').forEach(function (nav) {
      nav.setAttribute('aria-label', t('nav_label'));
    });
    document.documentElement.lang = lang;
    if (lookup('en', 'doc_title') != null) {
      document.title = t('doc_title') + ' · Warehouse Swiss Knife';
    }
  }

  /* options.persist === false: switch only temporarily (used for printing) */
  function setLanguage(l, options) {
    if (LANGS.indexOf(l) === -1) return;
    var persist = !(options && options.persist === false);
    lang = l;
    if (persist) writeStored(l);
    apply();
    document.dispatchEvent(new CustomEvent('wsk:langchange', { detail: { lang: l } }));
  }

  function buildSwitchers() {
    document.querySelectorAll('[data-lang-switcher]').forEach(function (box) {
      box.innerHTML = '';
      box.setAttribute('role', 'group');
      LANGS.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lang-btn';
        b.setAttribute('data-lang', l);
        b.setAttribute('aria-pressed', String(l === lang));
        b.textContent = l.toUpperCase();
        b.addEventListener('click', function () { setLanguage(l); });
        box.appendChild(b);
      });
    });
  }

  function buildNav() {
    var current = (document.body && document.body.getAttribute('data-page')) || '';
    document.querySelectorAll('[data-nav]').forEach(function (nav) {
      nav.innerHTML = '';
      NAV.forEach(function (item) {
        var a = document.createElement('a');
        a.href = item.href;
        a.className = 'nav-item' + (item.page === current ? ' active' : '');
        if (item.page === current) a.setAttribute('aria-current', 'page');
        a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONS[item.icon] + '"/></svg>' +
          '<span data-i18n="' + item.key + '"></span>';
        nav.appendChild(a);
      });
      var active = nav.querySelector('.active');
      if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
  }

  /* Status / message text that stays translated when the language changes.
     setText(el, 'key', {n: 3})  — or setText(el, null) to clear. */
  function setText(el, key, vars) {
    if (!el) return;
    if (!key) {
      el.removeAttribute('data-i18n');
      el.removeAttribute('data-i18n-vars');
      el.textContent = '';
      return;
    }
    el.setAttribute('data-i18n', key);
    if (vars) el.setAttribute('data-i18n-vars', JSON.stringify(vars));
    else el.removeAttribute('data-i18n-vars');
    el.textContent = t(key, vars);
  }

  /* The browser's own "Choose file / No file chosen" text follows the
     operating-system language, so file inputs get a translated button. */
  function buildFilePickers() {
    document.querySelectorAll('input[type="file"]:not([data-wsk-file])').forEach(function (input) {
      if (!input.id) return;
      input.setAttribute('data-wsk-file', '');
      input.classList.add('file-native');
      var wrap = document.createElement('div');
      wrap.className = 'file-pick';
      var btn = document.createElement('label');
      btn.className = 'file-btn';
      btn.setAttribute('for', input.id);
      btn.setAttribute('data-i18n', 'choose_file');
      var name = document.createElement('span');
      name.className = 'file-name';
      name.id = input.id + '__name';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      wrap.appendChild(btn);
      wrap.appendChild(name);
      setText(name, 'no_file');
      input.addEventListener('change', function () { updateFileName(input); });
    });
  }

  function updateFileName(input) {
    var name = document.getElementById(input.id + '__name');
    if (!name) return;
    if (input.files && input.files.length) {
      setText(name, null);
      name.textContent = Array.prototype.map.call(input.files, function (f) { return f.name; }).join(', ');
    } else {
      setText(name, 'no_file');
    }
  }

  function resetFile(input) {
    if (!input) return;
    input.value = '';
    updateFileName(input);
  }

  /* Small helper used by all Excel pages: reads the first sheets of a file */
  function readWorkbook(file, onDone, statusEl) {
    if (typeof XLSX === 'undefined') {
      if (statusEl) setText(statusEl, 'xlsx_missing');
      else alert(t('xlsx_missing'));
      return;
    }
    var reader = new FileReader();
    reader.onload = function (evt) {
      try {
        var wb = XLSX.read(new Uint8Array(evt.target.result), { type: 'array' });
        onDone(wb);
      } catch (err) {
        console.error(err);
        if (statusEl) setText(statusEl, 'excel_error');
        else alert(t('excel_error'));
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function sheetRows(wb, index) {
    var name = wb.SheetNames[index || 0];
    if (!name) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
  }

  /* ---------- App (PWA): offline support + install button ---------- */
  var installPrompt = null;

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure) return;
    navigator.serviceWorker.register('service-worker.js').catch(function (err) {
      console.warn('Service worker not registered:', err);
    });
  }

  function showInstallButtons(show) {
    document.querySelectorAll('[data-install-btn]').forEach(function (b) { b.hidden = !show; });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();          // keep the prompt for our own button
    installPrompt = e;
    showInstallButtons(true);
  });

  window.addEventListener('appinstalled', function () {
    installPrompt = null;
    showInstallButtons(false);
  });

  function wireInstallButtons() {
    document.querySelectorAll('[data-install-btn]').forEach(function (b) {
      b.hidden = !installPrompt;
      b.addEventListener('click', function () {
        if (!installPrompt) return;
        installPrompt.prompt();
        installPrompt.userChoice.finally(function () {
          installPrompt = null;
          showInstallButtons(false);
        });
      });
    });
  }

  function init() {
    wireInstallButtons();
    buildFilePickers();
    buildSwitchers();
    buildNav();
    apply();
    document.dispatchEvent(new CustomEvent('wsk:ready', { detail: { lang: lang } }));
  }

  window.WSK = {
    t: t,
    esc: esc,
    apply: apply,
    setText: setText,
    resetFile: resetFile,
    setLanguage: setLanguage,
    getLang: function () { return lang; },
    languages: LANGS.slice(),
    readWorkbook: readWorkbook,
    sheetRows: sheetRows
  };
  // Old pages called setLanguage('hr') directly — keep that working.
  window.setLanguage = setLanguage;

  if (document.readyState === 'complete') registerServiceWorker();
  else window.addEventListener('load', registerServiceWorker);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
