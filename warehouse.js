/* =====================================================================
   Warehouse Swiss Knife — warehouse model (shared)
   ---------------------------------------------------------------------
   The real size of the warehouse comes from the layout, not from the
   Excel file: racks A–S, sections 00–43, levels 0–6, positions A–D.
   Location A013D = rack A · section 01 · level 3 · position D
   (a 6-character code such as BA013D is read without its first letter).

   Excel: A = location, B = product, C = pallet ID, D = quantity,
          E = status (reserved / blocked), F = pallet type (EU / BLOCK)

   Block-pallet rule (same as the Layout page): one BLOCK pallet makes the
   whole section BLOCK on every level. On each level C is blocked; if C is
   taken, the first free position of A, B, D is blocked instead.
   ===================================================================== */
(function () {
  'use strict';

  var RACKS = 'ABCDEFGHIJKLMNOPQRS'.split('');
  var SECTIONS = 44;          // 00–43
  var LEVELS = 7;             // 0–6 (0 = ground)
  var POSITIONS = ['A', 'B', 'C', 'D'];
  var PER_LEVEL = RACKS.length * SECTIONS * POSITIONS.length;   // 3 344
  var TOTAL = PER_LEVEL * LEVELS;                               // 23 408

  function pad2(n) { return String(n).padStart(2, '0'); }

  function parseLoc(raw) {
    var s = String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (/^[A-Z]{2}\d{3}[A-Z]$/.test(s)) s = s.slice(1);
    var m = s.match(/^([A-Z])(\d{2})(\d)([A-D])$/);
    if (!m) return null;
    var sec = parseInt(m[2], 10), lvl = parseInt(m[3], 10);
    if (RACKS.indexOf(m[1]) === -1 || sec >= SECTIONS || lvl >= LEVELS) return null;
    return { code: s, rack: m[1], sec: sec, lvl: lvl, pos: m[4] };
  }

  function parseStatus(v) {
    var s = String(v == null ? '' : v).trim().toUpperCase();
    if (!s) return null;
    if (/^(RES|REZ|GERES)/.test(s)) return 'reserved';
    if (/^(BLOK|BLOC|BLOCK|GEBLOK)/.test(s)) return 'blocked';
    return null;
  }

  function parseType(v) {
    var s = String(v == null ? '' : v).trim().toUpperCase();
    if (!s) return null;
    if (/BLO[CK]/.test(s)) return 'BLOCK';
    if (/^EU/.test(s) || /EURO/.test(s)) return 'EU';
    return null;
  }

  /* Rack heights from the "Racks" sheet (rows without header: Rack, Client ID, Client, Height).
     Returns {A: 6, B: 6, …}; racks that are not listed keep all levels (6). */
  function heightsFromRacks(rackRows) {
    var h = {};
    (rackRows || []).forEach(function (r) {
      var rack = String(r && r[0] != null ? r[0] : '').trim().toUpperCase();
      var v = parseInt(r && r[3], 10);
      if (RACKS.indexOf(rack) !== -1 && !isNaN(v)) h[rack] = Math.max(0, Math.min(LEVELS - 1, v));
    });
    return h;
  }

  function maxLevel(rack, heights) {
    return heights && heights[rack] != null ? heights[rack] : LEVELS - 1;
  }

  /* rows: Excel rows WITHOUT the header row (arrays A..F)
     opts.heights: optional {rack: highest level} from heightsFromRacks() */
  function analyze(rows, opts) {
    var heights = opts && opts.heights;
    var occupied = new Set(), meta = new Map(), qtyByProduct = new Map();
    var outside = 0;

    rows.forEach(function (r) {
      if (!r || !r.length) return;
      var raw = String(r[0] == null ? '' : r[0]).trim();
      if (!raw) return;
      var loc = parseLoc(raw);
      if (!loc) { outside++; return; }
      var product = String(r[1] == null ? '' : r[1]).trim();
      var pallet = String(r[2] == null ? '' : r[2]).trim();
      var qRaw = r[3];
      var qty = qRaw == null || String(qRaw).trim() === '' ? 0 : (parseFloat(qRaw) || 0);
      var st = parseStatus(r[4]), pt = parseType(r[5]);
      if (st || pt) {
        var m = meta.get(loc.code) || {};
        if (st) m.status = st;
        if (pt) m.ptype = pt;
        meta.set(loc.code, m);
      }
      if (product || pallet || qty) occupied.add(loc.code);
      if (product) qtyByProduct.set(product, (qtyByProduct.get(product) || 0) + qty);
    });

    var count = { empty: 0, occupied: 0, reserved: 0, blocked: 0 };
    var type = { EU: 0, BLOCK: 0, none: 0 };
    var total = 0;

    RACKS.forEach(function (rack) {
      var top = maxLevel(rack, heights);
      total += SECTIONS * (top + 1) * POSITIONS.length;
      for (var s = 0; s < SECTIONS; s++) {
        var key = rack + pad2(s);
        var types = new Set();
        for (var l = 0; l < LEVELS; l++) POSITIONS.forEach(function (p) {
          var mm = meta.get(key + l + p);
          if (mm && mm.ptype) types.add(mm.ptype);
        });
        var secType = types.has('BLOCK') ? 'BLOCK' : types.has('EU') ? 'EU' : 'none';
        type[secType] += (top + 1) * POSITIONS.length;

        for (var lv = 0; lv <= top; lv++) {
          var st = {};
          POSITIONS.forEach(function (p) {
            var code = key + lv + p, mm = meta.get(code);
            st[p] = mm && mm.status === 'blocked' ? 'blocked'
                  : mm && mm.status === 'reserved' ? 'reserved'
                  : occupied.has(code) ? 'occupied' : 'empty';
          });
          if (secType === 'BLOCK' && !POSITIONS.some(function (p) { return st[p] === 'blocked'; })) {
            var auto = st.C === 'empty' ? 'C' : ['A', 'B', 'D'].filter(function (p) { return st[p] === 'empty'; })[0];
            if (auto) st[auto] = 'blocked';
          }
          POSITIONS.forEach(function (p) { count[st[p]]++; });
        }
      }
    });

    var top = Array.from(qtyByProduct.entries())
      .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], undefined, { numeric: true }); })
      .slice(0, 5)
      .map(function (e) { return { product: e[0], qty: e[1] }; });

    return {
      total: total, perLevel: PER_LEVEL, levels: LEVELS,
      products: qtyByProduct.size, top: top,
      type: type, status: count, outside: outside
    };
  }

  window.WSKWarehouse = {
    RACKS: RACKS, SECTIONS: SECTIONS, LEVELS: LEVELS, POSITIONS: POSITIONS,
    PER_LEVEL: PER_LEVEL, TOTAL: TOTAL,
    parseLoc: parseLoc, parseStatus: parseStatus, parseType: parseType, analyze: analyze,
    heightsFromRacks: heightsFromRacks, maxLevel: maxLevel
  };
})();
