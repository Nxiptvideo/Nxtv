/* NxTv 5 - player IPTV para Samsung Tizen e Fire TV (ES5). O mesmo arquivo roda nas duas TVs. */
(function () {
  'use strict';

  var ROWS = 12;
  var CACHE_TTL = 12 * 3600 * 1000; // lista salva na TV vale 12 h
  var K = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27, BKSP: 8,
    RED: 403, GREEN: 404, YELLOW: 405, BLUE: 406, CHUP: 427, CHDOWN: 428, INFO: 457,
    PLAYPAUSE: 10252, PLAY: 415, PAUSE: 19, FF: 417, RW: 412, DONE: 65376, CANCEL: 65385, PGUP: 33, PGDN: 34, MENU: 1082 };
  window.NX_APP_OK = true;
  var ANDROID = !!window.NxAndroid || /android=1/.test(location.search);
  var APP_VER = '5.1.7';
  var UPD_BASE = 'https://raw.githubusercontent.com/Nxiptvideo/nxtv/main/';
  function bridge(fn) { try { if (window.NxAndroid && NxAndroid[fn]) NxAndroid[fn](); } catch (e) {} }
  function focusIn(el) { el.focus(); if (ANDROID) bridge('showKeyboard'); }

  var NAV = [
    { id: 'search', label: 'Pesquisa', ic: 'search' },
    { id: 'live', label: 'TV ao Vivo', ic: 'tv' },
    { id: 'movie', label: 'Filmes', ic: 'film' },
    { id: 'series', label: 'Séries', ic: 'series' },
    { id: 'fav', label: 'Favoritos', ic: 'star' },
    { id: 'events', label: 'Eventos', ic: 'ball' }
  ];
  var SEC_TITLE = { search: 'Resultados', live: 'TV ao Vivo', movie: 'Filmes', series: 'Séries', fav: 'Favoritos', events: 'Eventos do dia' };

  var ICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10" cy="10" r="6.5"/><line x1="15" y1="15" x2="21" y2="21"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="2.5" y="5" width="19" height="12.5" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>',
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="3.5" width="18" height="17" rx="2"/><line x1="7.5" y1="3.5" x2="7.5" y2="20.5"/><line x1="16.5" y1="3.5" x2="16.5" y2="20.5"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    series: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><rect x="2.5" y="7.5" width="15" height="13" rx="2"/><path d="M6.5 4h13a2 2 0 0 1 2 2v10"/><path d="M8.5 11v6l5-3z" fill="currentColor"/></svg>',
    ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.2l4.3 3.1-1.6 5h-5.4l-1.6-5z" fill="currentColor"/><path d="M12 2.5v4.7M16.3 10.3l4.6-1.5M14.7 15.3l2.8 4M9.3 15.3l-2.8 4M7.7 10.3L3.1 8.8"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.1 20.1l1.5-6.4-4.9-4.3 6.5-.6z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>'
  };

  var S = {
    lists: [], activeId: null, ch: [], series: [], groups: {}, favs: {}, watched: {},
    pin: '0000', unlocked: false,
    sec: 'live', navIdx: 1, zone: 'nav', hd: 0, prevZone: 'nav',
    pos: newPos(),
    ep: null, mode: 'splash', cur: null, live: null, fullKind: null, zap: null, vod: null,
    query: '', edIdx: -1, edTab: 'm3u', formIdx: 0, delArm: 0, backTime: 0, epg: {}
  };
  function newPos() { return { search: { c: 0, i: 0 }, live: { c: 0, i: 0 }, movie: { c: 0, i: 0 }, series: { c: 0, i: 0 }, fav: { c: 0, i: 0 }, events: { c: 0, i: 0 } }; }

  /* ================= utilitários ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function trim(s) { return String(s).replace(/^\s+|\s+$/g, ''); }
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function hasClass(el, c) { return (' ' + el.className + ' ').indexOf(' ' + c + ' ') > -1; }
  function addClass(el, c) { if (!hasClass(el, c)) el.className = trim(el.className + ' ' + c); }
  function rmClass(el, c) { el.className = trim((' ' + el.className + ' ').replace(' ' + c + ' ', ' ')); }
  function setClass(el, c, on) { if (on) addClass(el, c); else rmClass(el, c); }
  function show(el) { rmClass(el, 'hidden'); }
  function hide(el) { addClass(el, 'hidden'); }
  function ic(name) { return '<span class="ic">' + ICONS[name] + '</span>'; }
  function lk() { return '<span class="lk">' + ICONS.lock + '</span>'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function now() { return new Date().getTime(); }
  var ACC = { 'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'é': 'e', 'ê': 'e', 'è': 'e', 'ë': 'e', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c', 'ñ': 'n' };
  function norm(s) { return String(s).toLowerCase().replace(/[áàâãäéêèëíìîïóòôõöúùûüçñ]/g, function (c) { return ACC[c]; }); }
  var HASDIG = /\d/, LEADJUNK = /^[^a-z0-9]/;
  function sortKey(n) { // ordem alfabética "natural": Canal 2 antes de Canal 10
    if (!HASDIG.test(n) && !LEADJUNK.test(n)) return n;
    return n.replace(/^[^a-z0-9]+/, '').replace(/\d+/g, function (d) { return d.length >= 8 ? d : ('00000000' + d).slice(-8); });
  }
  function fmtTime(ms) {
    var s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ':' + pad2(m) : m) + ':' + pad2(x);
  }
  function hhmm(ts) { var d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function fmtMB(b) { return (b / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
  function b64(s) { if (!s) return ''; try { return decodeURIComponent(escape(atob(s))); } catch (e) { try { return atob(s); } catch (e2) { return s; } } }

  var toastT;
  function toast(msg, ms) {
    var t = $('toast'); t.innerHTML = esc(msg); show(t);
    clearTimeout(toastT); toastT = setTimeout(function () { hide(t); }, ms || 3000);
  }
  function fillIcons() {
    var els = document.querySelectorAll('[data-ic]');
    for (var i = 0; i < els.length; i++) els[i].innerHTML = ICONS[els[i].getAttribute('data-ic')] || '';
  }

  /* ================= teclas ================= */
  function registerKeys() {
    if (ANDROID) return;
    var keys = ['ChannelUp', 'ChannelDown', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue', 'Info',
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'MediaPlayPause', 'MediaPlay', 'MediaPause', 'MediaStop', 'MediaFastForward', 'MediaRewind'];
    for (var i = 0; i < keys.length; i++) { try { tizen.tvinputdevice.registerKey(keys[i]); } catch (e) {} }
  }
  function exitApp() {
    Player.stop();
    if (ANDROID) { if (window.NxAndroid) bridge('exit'); else toast('Sair (somente na TV)'); return; }
    try { tizen.application.getCurrentApplication().exit(); } catch (e) { toast('Sair (somente na TV)'); }
  }

  /* ================= cache da lista (IndexedDB) ================= */
  var DB = {
    db: null,
    open: function (cb) {
      var done = false; function fin(d) { if (!done) { done = true; DB.db = d; cb(); } }
      setTimeout(function () { fin(null); }, 2500);
      try {
        if (!window.indexedDB) return fin(null);
        var r = indexedDB.open('nxtv', 1);
        r.onupgradeneeded = function () { try { r.result.createObjectStore('lists'); } catch (e) {} };
        r.onsuccess = function () { fin(r.result); };
        r.onerror = function () { fin(null); };
      } catch (e) { fin(null); }
    },
    get: function (key, cb) {
      if (!DB.db) return cb(null);
      try { var q = DB.db.transaction('lists', 'readonly').objectStore('lists').get(key); q.onsuccess = function () { cb(q.result || null); }; q.onerror = function () { cb(null); }; }
      catch (e) { cb(null); }
    },
    put: function (key, val, cb) {
      if (!DB.db) { if (cb) cb(false); return; }
      try {
        var tx = DB.db.transaction('lists', 'readwrite');
        tx.oncomplete = function () { if (cb) cb(true); };
        tx.onerror = tx.onabort = function () { if (cb) cb(false); };
        tx.objectStore('lists').put(val, key);
      } catch (e) { if (cb) cb(false); }
    },
    del: function (key) { if (!DB.db) return; try { DB.db.transaction('lists', 'readwrite').objectStore('lists')['delete'](key); } catch (e) {} }
  };

  /* ================= listas salvas ================= */
  function loadLists() {
    S.lists = load('nx_lists', null);
    S.activeId = load('nx_active', null);
    if (!S.lists) {
      S.lists = [];
      var old = load('nx_cfg', null);
      if (old) { old.id = 'l' + now(); old.name = 'Minha lista'; S.lists.push(old); S.activeId = old.id; saveLists(); }
    }
    if (S.lists.length && !activeList()) S.activeId = S.lists[0].id;
  }
  function saveLists() { save('nx_lists', S.lists); save('nx_active', S.activeId); }
  function activeList() { for (var i = 0; i < S.lists.length; i++) if (S.lists[i].id === S.activeId) return S.lists[i]; return null; }
  function fixServer(s) { s = trim(s).replace(/\/+$/, ''); return /^https?:\/\//i.test(s) ? s : 'http://' + s; }
  function buildUrl(cfg) {
    if (cfg.type === 'xtream')
      return fixServer(cfg.server) + '/get.php?username=' + encodeURIComponent(cfg.user) + '&password=' + encodeURIComponent(cfg.pass) + '&type=m3u_plus&output=ts';
    return cfg.url;
  }

  /* ================= classificação ================= */
  var EP1 = /^(.*?)[\s._\-|:]*[ST](\d{1,2})[\s._\-]*EP?(\d{1,4})/i;
  var EP3 = /^(.*?)[\s._\-|:]*temporada\s*(\d{1,2}).*?epis[oó]dio\s*(\d{1,4})/i;
  var EP2 = /^(.*?)[\s._\-|:]+(\d{1,2})x(\d{1,3})(?!\d)/i;
  var VODEXT = /\.(mp4|mkv|avi|mov|wmv|m4v|flv|mpg)(\?|$)/;
  var ADULT_G = /(^|[^a-z0-9])(adult[a-z]*|xxx|\+ ?18|18 ?\+|porn[a-z]*|erotic[a-z]*|sex|sexy|hot|playboy)([^a-z0-9]|$)/;
  var ADULT_N = /(^|[^a-z0-9])(adult[a-z]*|xxx|\+ ?18|18 ?\+|porn[a-z]*|erotic[a-z]*|sexy|playboy|brasileirinhas|hustler)([^a-z0-9]|$)/;

  function epInfo(name) {
    var m = EP1.exec(name) || EP3.exec(name) || EP2.exec(name);
    if (m && trim(m[1]).length > 0) return { title: trim(m[1]).replace(/[\s\-:|.]+$/, ''), s: parseInt(m[2], 10), e: parseInt(m[3], 10) };
    return { title: name, s: 0, e: 0 };
  }
  function classify(c) {
    var u = c.url.toLowerCase(), g = norm(c.group), isEp = EP1.test(c.name) || EP3.test(c.name);
    if (u.indexOf('/series/') > -1) return 'series';
    if (u.indexOf('/movie/') > -1 || u.indexOf('/movies/') > -1) return isEp ? 'series' : 'movie';
    if (VODEXT.test(u) || isEp) return (isEp || /serie|temporada|novela|dorama|anime/.test(g)) ? 'series' : 'movie';
    return 'live';
  }

  /* ================= parser M3U ================= */
  function parseAsync(txt, onProg, done) {
    var n = txt.length, pos = 0, out = [], cur = null, re = /([\w-]+)="([^"]*)"/g, gi = {};
    function step() {
      var stop = Math.min(n, pos + 1500000), l, m, c, k, e;
      while (pos < n && pos < stop) {
        e = txt.indexOf('\n', pos); if (e < 0) e = n;
        l = txt.substring(pos, e); pos = e + 1;
        if (l.length < 2) continue;
        if (l.charCodeAt(l.length - 1) === 13) l = l.substring(0, l.length - 1);
        l = trim(l);
        if (!l) continue;
        if (l.charAt(0) === '#') {
          if (l.indexOf('#EXTINF') === 0) {
            cur = { name: '', logo: '', group: '', tn: '' };
            re.lastIndex = 0;
            while ((m = re.exec(l)) !== null) {
              k = m[1].toLowerCase();
              if (k === 'tvg-logo') cur.logo = m[2];
              else if (k === 'group-title') cur.group = m[2];
              else if (k === 'tvg-name') cur.tn = m[2];
              else if (k === 'tvg-id') cur.tid = m[2];
            }
            var st = l.replace(re, ''), ci = st.indexOf(',');
            cur.name = ci > -1 ? trim(st.substring(ci + 1)) : '';
            if (!cur.name) cur.name = cur.tn || 'Sem nome';
          } else if (l.indexOf('#EXTGRP:') === 0 && cur && !cur.group) cur.group = l.substring(8);
        } else {
          c = cur || { name: l, logo: '', group: '' };
          var gname = c.group || 'Sem categoria';
          if (gi['g_' + gname]) gname = gi['g_' + gname]; else gi['g_' + gname] = gname;
          out.push({ name: c.name, logo: c.logo, group: gname, url: l, eid: c.tid || '' });
          cur = null;
        }
      }
      if (pos < n) { onProg(pos / n); setTimeout(step, 0); } else { txt = null; done(out); }
    }
    step();
  }

  /* ================= índice (ordem A-Z, adultos por último) ================= */
  function chObj(x) { return S.ch[x]; }
  function seObj(x) { return S.series[x]; }
  function partAdult(arr, isAdult) { // mantém a ordem original, só joga o conteúdo adulto para o fim
    var a = [], b = [];
    for (var i = 0; i < arr.length; i++) (isAdult(arr[i]) ? b : a).push(arr[i]);
    return b.length ? a.concat(b) : a;
  }
  function sortIdx(arr, objOf) { // ordena índices sem guardar a chave em cada item (economiza memória)
    if (S.order !== 'az') return partAdult(arr, function (x) { return objOf(x).adult; });
    var n = arr.length, keys = new Array(n), pos = new Array(n), i, o, out = new Array(n);
    for (i = 0; i < n; i++) { o = objOf(arr[i]); keys[i] = (o.adult ? '1' : '0') + sortKey(o.n || norm(o.name)); pos[i] = i; }
    pos.sort(function (a, b) { var A = keys[a], B = keys[b]; return A < B ? -1 : (A > B ? 1 : 0); });
    for (i = 0; i < n; i++) out[i] = arr[pos[i]];
    return out;
  }
  function sortGroups(order) {
    if (S.order !== 'az') return partAdult(order, function (g) { return g.adult; });
    for (var j = 0; j < order.length; j++) if (!order[j].k) order[j].k = sortKey(norm(order[j].name));
    order.sort(function (A, B) { if (A.adult !== B.adult) return A.adult ? 1 : -1; return A.k < B.k ? -1 : (A.k > B.k ? 1 : 0); });
    return order;
  }
  // grupos montados a partir das listas já ordenadas
  function groupsFrom(sorted, kind, objOf, gnorm) {
    var map = {}, order = [], j, g, o, gk;
    for (j = 0; j < sorted.length; j++) {
      o = objOf(sorted[j]); gk = 'g_' + o.group; g = map[gk];
      if (!g) { g = map[gk] = { name: o.group, kind: kind, items: [], adult: gnorm ? gnorm[gk] === 1 : ADULT_G.test(norm(o.group)), na: 0 }; order.push(g); }
      g.items.push(sorted[j]); if (o.adult) g.na++;
    }
    for (j = 0; j < order.length; j++) if (order[j].na === order[j].items.length) order[j].adult = true;
    return sortGroups(order);
  }
  function resetData() { S.ch = []; S.series = []; S.sKey = {}; S.byUrl = null; S.api = null; S.epg = {}; S.bg = null; Cat.reset(); }
  function seriesFor(title, logo, group, id) {
    var sn = norm(title), key = 's_' + sn, s = S.sKey[key];
    if (s === undefined) {
      s = S.series.length; S.sKey[key] = s;
      S.series.push({ name: title, logo: logo, group: group, eps: id ? null : [], id: id || null, n: sn, adult: false, seasons: null });
    }
    return s;
  }

  /* ---- lista M3U ---- */
  function buildIndexAsync(list, onProg, done) {
    resetData(); S.ch = list;
    var live = [], movie = [], allS = [], gnorm = {}, i = 0, n = list.length;
    function step() {
      var end = Math.min(n, i + 10000), c, info, s, gk, gn;
      for (; i < end; i++) {
        c = list[i]; c.type = classify(c);
        gk = 'g_' + c.group; gn = gnorm[gk];
        if (gn === undefined) gn = gnorm[gk] = ADULT_G.test(norm(c.group)) ? 1 : 0;
        c.adult = gn === 1 || ADULT_N.test(norm(c.name));
        if (c.type === 'live') live.push(i);
        else if (c.type === 'movie') movie.push(i);
        else {
          info = epInfo(c.name);
          var before = S.series.length;
          s = seriesFor(info.title, c.logo, c.group, null);
          if (S.series.length > before) allS.push(s);
          c.se = info.s; c.ep = info.e; c.sid = s;
          if (c.adult) S.series[s].adult = true;
          S.series[s].eps.push(i);
          if (!S.series[s].logo && c.logo) S.series[s].logo = c.logo;
        }
      }
      if (i < n) { onProg(0.75 * i / n); setTimeout(step, 0); return; }
      onProg(0.8); setTimeout(sortStep, 0);
    }
    function sortStep() {
      live = sortIdx(live, chObj);
      for (var j = 0; j < live.length; j++) S.ch[live[j]].num = j + 1;
      onProg(0.86); setTimeout(function () {
        movie = sortIdx(movie, chObj); onProg(0.93);
        setTimeout(function () { allS = sortIdx(allS, seObj); onProg(0.97); setTimeout(groupStep, 0); }, 0);
      }, 0);
    }
    function groupStep() {
      S.groups.live = [{ name: 'Todos os canais', kind: 'live', items: live }].concat(groupsFrom(live, 'live', chObj, gnorm));
      S.groups.movie = [{ name: 'Todos os filmes', kind: 'movie', items: movie }].concat(groupsFrom(movie, 'movie', chObj, gnorm));
      S.groups.series = [{ name: 'Todas as séries', kind: 'series', items: allS }].concat(groupsFrom(allS, 'series', seObj, gnorm));
      S.groups.search = [{ name: 'Digite no campo de pesquisa', kind: 'none', items: [] }];
      S.query = '';
      buildFav(); buildRecent();
      onProg(1); done();
    }
    step();
  }
  function sortEps(ser) {
    if (ser.sorted || !ser.eps) return; ser.sorted = true;
    ser.eps.sort(function (a, b) { var A = S.ch[a], B = S.ch[b]; return (A.se - B.se) || (A.ep - B.ep) || (a - b); });
  }

  /* ---- servidor Xtream (API): carrega só o necessário ---- */
  function credsOf(L) {
    if (!L) return null;
    if (L.type === 'xtream') return { base: fixServer(L.server), u: L.user, p: L.pass };
    var m = /^(https?:\/\/[^\/?#]+)\/get\.php\?(.*)$/i.exec(L.url || ''); if (!m) return null;
    var u = /(?:^|&)username=([^&]*)/.exec(m[2]), p = /(?:^|&)password=([^&]*)/.exec(m[2]);
    if (!u || !p) return null;
    try { return { base: m[1], u: decodeURIComponent(u[1]), p: decodeURIComponent(p[1]) }; } catch (e) { return null; }
  }
  function apiUrl(cr, action, extra) {
    return cr.base + '/player_api.php?username=' + encodeURIComponent(cr.u) + '&password=' + encodeURIComponent(cr.p) + '&action=' + action + (extra || '');
  }
  function getText(url, timeout, cb, onProg) {
    var x = new XMLHttpRequest(), fin = false;
    function end(t, st) { if (fin) return; fin = true; x.onreadystatechange = null; x.onprogress = null; cb(t, st); }
    x.open('GET', url, true); x.timeout = timeout || 60000;
    if (onProg) x.onprogress = onProg;
    x.onreadystatechange = function () { if (x.readyState === 4) end(x.status >= 200 && x.status < 400 ? x.responseText : null, x.status); };
    x.ontimeout = function () { end(null, 0); };
    try { x.send(); } catch (e) { end(null, 0); }
  }
  function streamBase(cr, kind) { return cr.base + '/' + kind + '/' + encodeURIComponent(cr.u) + '/' + encodeURIComponent(cr.p) + '/'; }

  function loadApi(L, cr, force) {
    var key = 'api_' + L.id, sig = cr.base + '|' + cr.u + '|' + cr.p;
    Cat.force = !!force;
    splash('Conectando ao servidor', L.name, 4);
    if (!force) {
      readCacheKey(key, sig, function (text) {
        var d = null;
        if (text) { try { d = JSON.parse(text); } catch (e) { d = null; } }
        if (d && d.ls) useApi(L, cr, d, null, null); else fetchApi();
      });
    } else fetchApi();
    function fetchApi() {
      var steps = [['lc', 'get_live_categories', 'categorias'], ['vc', 'get_vod_categories', 'categorias de filmes'], ['sc', 'get_series_categories', 'categorias de séries'], ['ls', 'get_live_streams', 'canais ao vivo']];
      var raw = {}, i = 0;
      function next() {
        if (i >= steps.length) {
          var d = {}, cacheTxt = '{"lc":' + raw.lc + ',"vc":' + raw.vc + ',"sc":' + raw.sc + ',"ls":' + raw.ls + '}';
          try { d.lc = JSON.parse(raw.lc); d.vc = JSON.parse(raw.vc); d.sc = JSON.parse(raw.sc); d.ls = JSON.parse(raw.ls); } catch (e) { d = null; }
          raw = null;
          if (!d || !d.ls || !d.ls.length) { download(L, buildUrl(L)); return; }
          useApi(L, cr, d, key, cacheTxt + ''); return;
        }
        var st = steps[i];
        splash('Carregando ' + st[2], L.name, 8 + i * 20);
        getText(apiUrl(cr, st[1]), 90000, function (t) {
          var ok = false; if (t) { var c0 = t.replace(/^\s+/, '').charAt(0); ok = c0 === '[' || c0 === '{'; }
          if (!ok) {
            if (i === 0) { download(L, buildUrl(L)); return; } // servidor sem API: usa a lista M3U
            t = '[]';
          }
          if (t.replace(/^\s+/, '').charAt(0) === '{') t = '[]'; // resposta inesperada
          raw[st[0]] = t; i++; next();
        }, function (e) { $('sp-sub').innerHTML = esc(L.name + ' · ' + fmtMB(e.loaded)); });
      }
      next();
    }
  }
  function useApi(L, cr, d, cacheKey, cacheTxt) {
    splash('Organizando canais', L.name, 90);
    setTimeout(function () {
      resetData(); S.api = cr; S.byUrl = {};
      var catName = {}, catAdult = {}, i, a, nm, url, live = [], lb = streamBase(cr, 'live');
      var catPos = {};
      for (i = 0; i < d.lc.length; i++) {
        a = d.lc[i]; catName['c' + a.category_id] = a.category_name || 'Sem categoria'; catAdult['c' + a.category_id] = ADULT_G.test(norm(a.category_name || '')) ? 1 : 0;
        if (catPos['g_' + catName['c' + a.category_id]] === undefined) catPos['g_' + catName['c' + a.category_id]] = i;
      }
      var gnorm = {};
      for (i = 0; i < d.ls.length; i++) {
        a = d.ls[i]; nm = a.name || 'Sem nome';
        var cid = 'c' + a.category_id, gname = catName[cid] || 'Sem categoria';
        url = lb + a.stream_id + '.ts';
        var c = { name: nm, logo: a.stream_icon || '', group: gname, url: url, type: 'live', adult: catAdult[cid] === 1 || a.is_adult == 1 || ADULT_N.test(norm(nm)), o: parseInt(a.num, 10) || (i + 1), eid: a.epg_channel_id || '', noepg: !a.epg_channel_id };
        gnorm['g_' + gname] = catAdult[cid] === 1 ? 1 : 0;
        S.byUrl[url] = S.ch.length; live.push(S.ch.length); S.ch.push(c);
      }
      if (S.order !== 'az') live.sort(function (x, y) { return (S.ch[x].o - S.ch[y].o) || (x - y); }); // numeração do servidor
      live = sortIdx(live, chObj);
      for (i = 0; i < live.length; i++) S.ch[live[i]].num = i + 1;
      function cats(arr, kind, act) {
        var out = [];
        for (var j = 0; j < arr.length; j++) {
          var n2 = arr[j].category_name || 'Sem categoria';
          out.push({ name: n2, kind: kind, items: null, lazy: { act: act, cat: arr[j].category_id }, adult: ADULT_G.test(norm(n2)) });
        }
        return sortGroups(out);
      }
      var lg = groupsFrom(live, 'live', chObj, gnorm);
      if (S.order !== 'az') { // categorias na mesma sequência que o servidor envia
        lg.sort(function (x, y) { var px = catPos['g_' + x.name], py = catPos['g_' + y.name]; if (px === undefined) px = 1e9; if (py === undefined) py = 1e9; return px - py; });
        lg = sortGroups(lg);
      }
      S.groups.live = [{ name: 'Todos os canais', kind: 'live', items: live }].concat(lg);
      S.groups.movie = cats(d.vc || [], 'movie', 'get_vod_streams');
      S.groups.series = cats(d.sc || [], 'series', 'get_series');
      S.groups.search = [{ name: 'Digite no campo de pesquisa', kind: 'none', items: [] }];
      S.query = '';
      d = null;
      buildFav(); buildRecent();
      openMain(true);
      Cat.armed = true; // o catálogo de filmes e séries só é baixado quando você abre Filmes, Séries ou Pesquisa
      if (cacheKey && cacheOn()) { pendingCache = { key: cacheKey, url: cr.base + '|' + cr.u + '|' + cr.p, text: cacheTxt }; saveCacheLater(); }
    }, 30);
  }

  /* ================= catálogo de filmes e séries (servidor Xtream) =================
     Baixa todos os filmes e todas as séries de uma vez, em segundo plano, e guarda na TV.
     Assim as categorias abrem na hora e a pesquisa não precisa abrir categoria por categoria. */
  var CAT_FRESH = 12 * 3600 * 1000, CAT_MAX = 7 * 24 * 3600 * 1000;
  var Cat = {
    st: {}, gen: 0, force: false, waiters: [],
    reset: function () { Cat.gen++; Cat.st = {}; Cat.waiters = []; Cat.armed = false; },
    maybeStart: function () { if (Cat.armed && (S.sec === 'movie' || S.sec === 'series' || S.sec === 'search')) { Cat.armed = false; Cat.start(); } },
    busy: function () { return Cat.st.movie === 'loading' || Cat.st.series === 'loading'; },
    whenDone: function (fn) { if (Cat.busy()) Cat.waiters.push(fn); else fn(); },
    fire: function () { if (Cat.busy()) return; var w = Cat.waiters; Cat.waiters = []; for (var i = 0; i < w.length; i++) { try { w[i](); } catch (e) {} } },
    start: function () {
      if (!S.api) return;
      var g = Cat.gen, cr = S.api, force = Cat.force; Cat.force = false;
      Cat.st = { movie: 'loading', series: 'loading' };
      setTimeout(function () {
        if (g !== Cat.gen) return;
        Cat.load('movie', cr, force, g, function () { if (g === Cat.gen) Cat.load('series', cr, force, g, function () {}); });
      }, 1500);
    },
    key: function (kind) { return 'cat_' + kind + '_' + S.activeId; },
    load: function (kind, cr, force, g, cb) {
      var sig = cr.base + '|' + cr.u + '|' + cr.p;
      function fin(ok) { if (g !== Cat.gen) return; Cat.st[kind] = ok ? 'ok' : 'fail'; Cat.after(); cb(); }
      if (force || !cacheOn()) { Cat.fetch(kind, cr, sig, g, true, fin); return; }
      DB.get(Cat.key(kind), function (rec) {
        if (g !== Cat.gen) return;
        if (!rec || rec.url !== sig || !rec.blob || now() - rec.t > CAT_MAX) { Cat.fetch(kind, cr, sig, g, true, fin); return; }
        var age = now() - rec.t;
        try {
          var fr = new FileReader();
          fr.onload = function () {
            if (g !== Cat.gen) return;
            var data = null; try { data = JSON.parse(fr.result); } catch (e) { data = null; }
            if (!data) { Cat.fetch(kind, cr, sig, g, true, fin); return; }
            Cat.apply(kind, data); data = null;
            fin(true);
            // salvo há mais de 12 h: atualiza em segundo plano para a próxima vez
            if (age > CAT_FRESH) setTimeout(function () { if (g === Cat.gen && !Player.active) Cat.fetch(kind, cr, sig, g, false, function () {}); }, 20000);
          };
          fr.onerror = function () { Cat.fetch(kind, cr, sig, g, true, fin); };
          fr.readAsText(rec.blob);
        } catch (e) { Cat.fetch(kind, cr, sig, g, true, fin); }
      });
    },
    fetch: function (kind, cr, sig, g, use, cb) {
      getText(apiUrl(cr, kind === 'movie' ? 'get_vod_streams' : 'get_series'), 240000, function (t) {
        if (g !== Cat.gen) return;
        var arr = null, i, a, out = [];
        if (t && t.length < 120000000) { try { arr = JSON.parse(t); } catch (e) { arr = null; } }
        t = null;
        if (!arr || !arr.length) { cb(false); return; }
        for (i = 0; i < arr.length; i++) {
          a = arr[i]; if (!a) continue;
          var cats = a.category_ids && a.category_ids.length ? a.category_ids : [a.category_id];
          if (kind === 'movie') out.push([a.name || 'Sem nome', a.stream_icon || '', a.stream_id, a.container_extension || 'mp4', cats, a.is_adult == 1 ? 1 : 0]);
          else out.push([a.name || 'Sem nome', a.cover || '', a.series_id, cats]);
        }
        arr = null;
        if (use) Cat.apply(kind, out);
        cb(true);
        if (cacheOn()) {
          var txt = JSON.stringify(out); out = null;
          if (txt.length < 60000000) {
            var blob = null; try { blob = new Blob([txt], { type: 'text/plain' }); } catch (e) { blob = null; }
            txt = null;
            if (blob) DB.put(Cat.key(kind), { url: sig, t: now(), blob: blob });
          }
        }
      });
    },
    // preenche as categorias que ainda não foram abertas
    apply: function (kind, data) {
      var gs = S.groups[kind] || [], byCat = {}, i, j, g, r, c;
      for (i = 0; i < gs.length; i++) { g = gs[i]; if (g.lazy && !g.items) byCat['c' + g.lazy.cat] = []; }
      if (kind === 'movie') {
        var mb = streamBase(S.api, 'movie');
        for (i = 0; i < data.length; i++) {
          r = data[i]; c = r[4];
          for (j = 0; j < c.length; j++) {
            var lst = byCat['c' + c[j]]; if (!lst) continue;
            var url = mb + r[2] + '.' + r[3], k = S.byUrl[url];
            if (k === undefined) { k = S.ch.length; S.byUrl[url] = k; S.ch.push({ name: r[0], logo: r[1], group: null, url: url, type: 'movie', adult: r[5] === 1, catAdult: false }); }
            lst.push(k);
          }
        }
      } else {
        for (i = 0; i < data.length; i++) {
          r = data[i]; c = r[3];
          for (j = 0; j < c.length; j++) {
            var ls2 = byCat['c' + c[j]]; if (!ls2) continue;
            ls2.push(seriesFor(r[0], r[1], null, r[2]));
          }
        }
      }
      for (i = 0; i < gs.length; i++) {
        g = gs[i]; if (!g.lazy || g.items) continue;
        var idx = byCat['c' + g.lazy.cat];
        if (!idx || !idx.length) continue; // categoria fora do catálogo: abre pelo jeito antigo
        for (j = 0; j < idx.length; j++) {
          if (kind === 'movie') { c = S.ch[idx[j]]; if (c.group === null) c.group = g.name; if (g.adult || ADULT_N.test(norm(c.name))) c.adult = true; }
          else { c = S.series[idx[j]]; if (c.group === null) c.group = g.name; if (g.adult || ADULT_N.test(c.n)) c.adult = true; }
        }
        g.items = kind === 'movie' ? sortIdx(idx, chObj) : sortIdx(idx, seObj);
      }
      if (S.mode === 'main' && S.sec === kind) renderAll();
    },
    after: function () {
      Cat.fire();
      if (!Cat.busy() && S.sec === 'search' && S.query && S.mode === 'main') doSearch(S.query, true);
    }
  };
  function loadGroup(g, cb) {
    if (g.items) { if (cb) cb(); return; }
    if (g.loading || !S.api) return;
    g.loading = true;
    var cr = S.api;
    getText(apiUrl(cr, g.lazy.act, '&category_id=' + encodeURIComponent(g.lazy.cat)), 90000, function (t) {
      g.loading = false;
      if (S.api !== cr) return;
      var arr = null, idx = [], i, a, nm;
      try { arr = JSON.parse(t); } catch (e) { arr = null; }
      if (!arr || !arr.length) arr = [];
      if (g.kind === 'movie') {
        var mb = streamBase(cr, 'movie');
        for (i = 0; i < arr.length; i++) {
          a = arr[i]; nm = a.name || 'Sem nome';
          var url = mb + a.stream_id + '.' + (a.container_extension || 'mp4'), j = S.byUrl[url];
          if (j === undefined) {
            j = S.ch.length; S.byUrl[url] = j;
            S.ch.push({ name: nm, logo: a.stream_icon || '', group: g.name, url: url, type: 'movie', adult: g.adult || a.is_adult == 1 || ADULT_N.test(norm(nm)) });
          }
          idx.push(j);
        }
        g.items = sortIdx(idx, chObj);
      } else {
        for (i = 0; i < arr.length; i++) {
          a = arr[i]; nm = a.name || 'Sem nome';
          var s = seriesFor(nm, a.cover || '', g.name, a.series_id);
          if (g.adult || ADULT_N.test(S.series[s].n)) S.series[s].adult = true;
          idx.push(s);
        }
        g.items = sortIdx(idx, seObj);
      }
      arr = null;
      if (cb) cb();
      if (S.mode === 'main') renderAll();
    });
  }
  function loadSeriesInfo(s, cb, quiet) {
    var ser = S.series[s];
    if (ser.eps) { cb(ser.eps.length > 0); return; }
    if (ser.loading) { (ser.cbs = ser.cbs || []).push(cb); if (!quiet) toast('Carregando episódios...', 2500); return; }
    if (!S.api || !ser.id) { ser.eps = []; cb(false); return; }
    ser.loading = true; if (!quiet) toast('Carregando episódios...', 2500);
    var cr = S.api;
    getText(apiUrl(cr, 'get_series_info', '&series_id=' + encodeURIComponent(ser.id)), 90000, function (t) {
      ser.loading = false;
      var d = null, eps = [], sb = streamBase(cr, 'series');
      try { d = JSON.parse(t); } catch (e) { d = null; }
      var E = d && d.episodes ? d.episodes : null;
      if (d && d.info && !ser.info) ser.info = infoOf(d.info);
      if (E) {
        for (var key in E) {
          if (!E.hasOwnProperty(key) || !E[key] || !E[key].length) continue;
          for (var i = 0; i < E[key].length; i++) {
            var e = E[key][i], se = parseInt(e.season || key, 10) || 0, en = parseInt(e.episode_num, 10) || (i + 1);
            var j = S.ch.length;
            S.ch.push({ name: e.title || ('Episódio ' + en), logo: (e.info && e.info.movie_image) || ser.logo, group: ser.group,
              url: sb + e.id + '.' + (e.container_extension || 'mp4'), type: 'series', se: se, ep: en, sid: s, adult: ser.adult,
              info: e.info ? infoOf(e.info) : null });
            eps.push(j);
          }
        }
      }
      ser.eps = eps; ser.sorted = false; ser.seasons = null;
      var more = ser.cbs || []; ser.cbs = null;
      cb(eps.length > 0);
      for (var w = 0; w < more.length; w++) more[w](eps.length > 0);
      if (S.mode === 'main' && quiet) { renderSide(); Det.refresh(); }
    });
  }

  /* ================= conteúdo adulto / senha ================= */
  function itemAdult(kind, idx) {
    if (kind === 'series') return S.series[idx].adult;
    if (kind === 'ep') return S.series[S.ep.s].adult;
    if (kind === 'live' || kind === 'movie') return S.ch[idx].adult;
    return false;
  }
  function locked(kind, idx) { return !S.unlocked && itemAdult(kind, idx); }
  function groupLocked(g) { return !S.unlocked && g && g.adult; }

  var pin = { buf: '', check: null, after: null, prev: null };
  function pinDialog(title, sub, check, after) {
    if (S.mode !== 'pin') pin.prev = S.mode;
    pin.buf = ''; pin.cur = 0; pin.check = check; pin.after = after || null;
    sub = sub.replace(' com os números do controle', '');
    $('pin-title').innerHTML = esc(title); $('pin-msg').innerHTML = '';
    $('pin-sub').innerHTML = esc(sub) + '<br><span class="pin-help">▲ ▼ escolhe o número · OK confirma · ◀ apaga' + (ANDROID ? '' : ' (ou use os números do controle)') + '</span>';
    pinDots(); show($('pin')); S.mode = 'pin';
  }
  function pinDots() {
    var d = $('pin-dots').getElementsByTagName('span');
    for (var i = 0; i < d.length; i++) {
      setClass(d[i], 'on', i < pin.buf.length);
      var cur = i === pin.buf.length;
      setClass(d[i], 'cur', cur); d[i].innerHTML = cur ? String(pin.cur || 0) : '';
    }
  }
  function closePin() { hide($('pin')); if (S.mode === 'pin') S.mode = pin.prev; }
  function pinKey(k, e) {
    e.preventDefault();
    var d = -1;
    if (k >= 48 && k <= 57) d = k - 48; else if (k >= 96 && k <= 105) d = k - 96;
    if (k === K.UP || k === K.DOWN) { pin.cur = ((pin.cur || 0) + (k === K.UP ? 1 : 9)) % 10; pinDots(); return; }
    if (k === K.ENTER || k === K.RIGHT) { d = pin.cur || 0; }
    if (d >= 0) pin.cur = 0;
    if (d >= 0) {
      if (pin.buf.length >= 4) return;
      pin.buf += d; pinDots();
      if (pin.buf.length === 4) {
        var v = pin.buf, chk = pin.check;
        setTimeout(function () {
          var r = chk(v);
          if (r === true) { closePin(); var a = pin.after; pin.after = null; if (a) a(); }
          else if (r !== 'next') { pin.buf = ''; pin.cur = 0; pinDots(); $('pin-msg').innerHTML = esc(r || 'Senha incorreta'); }
        }, 150);
      }
    } else if (k === K.LEFT || (k === K.BKSP && pin.buf)) { pin.buf = pin.buf.slice(0, -1); pinDots(); }
    else if (k === K.BACK || k === K.ESC || k === K.BKSP) { pin.after = null; closePin(); }
  }
  function needPin(fn) {
    if (S.unlocked) { fn(); return; }
    pinDialog('Conteúdo adulto', 'Digite a senha com os números do controle', function (v) {
      if (v === S.pin) { S.unlocked = true; toast('Conteúdo adulto liberado até fechar o app'); return true; }
      return 'Senha incorreta';
    }, function () { if (S.mode === 'main') renderAll(); fn(); });
  }
  function changePin() {
    pinDialog('Alterar senha', 'Digite a senha ATUAL', function (v) {
      if (v !== S.pin) return 'Senha atual incorreta';
      var nv = '';
      pinDialog('Alterar senha', 'Digite a NOVA senha (4 números)', function (v2) {
        nv = v2;
        pinDialog('Alterar senha', 'Digite a NOVA senha de novo para confirmar', function (v3) {
          if (v3 !== nv) return 'As senhas não conferem, digite a confirmação de novo';
          S.pin = v3; save('nx_pin', v3); toast('Senha alterada'); return true;
        }, function () { if (S.mode === 'settings') openSettings(); });
        return 'next';
      });
      return 'next';
    });
  }

  /* ================= favoritos e assistidos ================= */
  function favKeyCh(c) { return 'u:' + c.url; }
  function favKeyS(s) { return 's:' + s.n; }
  function buildFav() {
    var l = [], m = [], se = [], found = {}, i, k, v, j, c;
    if (S.byUrl) { for (k in S.favs) if (S.favs.hasOwnProperty(k) && k.indexOf('u:') === 0 && S.byUrl[k.substring(2)] !== undefined) found[k] = S.byUrl[k.substring(2)]; }
    else for (i = 0; i < S.ch.length; i++) { c = S.ch[i]; if (c.type !== 'series' && S.favs['u:' + c.url]) found['u:' + c.url] = i; }
    for (k in S.favs) {
      if (!S.favs.hasOwnProperty(k)) continue;
      v = S.favs[k];
      if (k.indexOf('u:') === 0) {
        j = found[k];
        if (j === undefined) {
          if (typeof v !== 'object' || !S.byUrl) continue;
          j = S.ch.length; S.byUrl[k.substring(2)] = j;
          S.ch.push({ name: v.n, logo: v.l || '', group: v.g || '', url: k.substring(2), type: v.t || 'movie', adult: !!v.a });
        }
        (S.ch[j].type === 'live' ? l : m).push(j);
      } else if (k.indexOf('s:') === 0) {
        var s = S.sKey['s_' + k.substring(2)];
        if (s === undefined) {
          if (typeof v !== 'object' || !v.id || !S.api) continue;
          s = seriesFor(v.n, v.l || '', v.g || '', v.id); S.series[s].adult = !!v.a;
        }
        se.push(s);
      }
    }
    S.groups.fav = [{ name: 'Canais', kind: 'live', items: sortIdx(l, chObj) }, { name: 'Filmes', kind: 'movie', items: sortIdx(m, chObj) }, { name: 'Séries', kind: 'series', items: sortIdx(se, seObj) }];
  }

  /* ================= assistidos recentemente (5 por seção) ================= */
  var REC_N = 5, REC_NAME = 'Recém assistidos', recLiveT;
  function allLiveIdx() { var g = S.groups.live || []; return g[0] && g[0].recent ? 1 : 0; }
  function allLive() { return (S.groups.live || [])[allLiveIdx()]; }
  function recAdd(sec, key, o) {
    if (!S.recent) S.recent = {};
    var arr = S.recent[sec] || [], i;
    for (i = arr.length - 1; i >= 0; i--) if (arr[i].k === key) arr.splice(i, 1);
    arr.unshift({ k: key, n: o.name, l: o.logo || '', g: o.group || '', id: o.id || null, a: o.adult ? 1 : 0 });
    if (arr.length > REC_N) arr.length = REC_N;
    S.recent[sec] = arr; save('nx_recent', S.recent);
    buildRecent(sec);
    if (S.mode === 'main' && S.sec === sec) renderAll();
  }
  // canal ao vivo entra nos recentes depois de 10 s em tela cheia (zapeando rápido não conta)
  function recLiveWatch() {
    clearTimeout(recLiveT);
    recLiveT = setTimeout(function () {
      var c = S.cur;
      if (c && c.type !== 'movie' && c.type !== 'series' && S.mode === 'full' && S.fullKind === 'live') recAdd('live', 'u:' + c.url, c);
    }, 10000);
  }
  function recVod(c) {
    if (c.type === 'series') {
      var se = S.series[c.sid];
      if (se) recAdd('series', favKeyS(se), { name: se.name, logo: se.logo, group: se.group, id: se.id, adult: se.adult });
    } else recAdd('movie', 'u:' + c.url, c);
  }
  function recResolve(sec) {
    var arr = (S.recent && S.recent[sec]) || [], out = [], want = {}, got = {}, i, v, j;
    if (sec !== 'series') {
      for (i = 0; i < arr.length; i++) want[arr[i].k.substring(2)] = 1;
      if (S.byUrl) { for (var u in want) if (S.byUrl[u] !== undefined) got[u] = S.byUrl[u]; }
      else for (i = 0; i < S.ch.length; i++) if (want[S.ch[i].url] && got[S.ch[i].url] === undefined && S.ch[i].type !== 'series') got[S.ch[i].url] = i;
    }
    for (i = 0; i < arr.length; i++) {
      v = arr[i];
      if (sec === 'series') {
        var s = S.sKey['s_' + v.k.substring(2)];
        if (s === undefined) { if (!v.id || !S.api) continue; s = seriesFor(v.n, v.l, v.g, v.id); if (v.a) S.series[s].adult = true; }
        out.push(s);
      } else {
        var url = v.k.substring(2);
        j = got[url];
        if (j === undefined) {
          if (sec === 'live' || !S.byUrl) continue;
          j = S.ch.length; S.byUrl[url] = j;
          S.ch.push({ name: v.n, logo: v.l, group: v.g, url: url, type: 'movie', adult: !!v.a });
        }
        out.push(j);
      }
    }
    return out;
  }
  // grupo "Assistidos recentemente" sempre no topo de TV ao Vivo, Filmes e Séries
  function buildRecent(only) {
    var secs = only ? [only] : ['live', 'movie', 'series'];
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i], gs = S.groups[sec]; if (!gs) continue;
      var g = gs[0] && gs[0].recent ? gs[0] : null;
      if (!g) { g = { name: REC_NAME, kind: sec, items: [], recent: true }; gs.unshift(g); if (only && S.pos[sec]) S.pos[sec].c++; }
      g.items = recResolve(sec);
      if (only && S.pos[sec] && S.pos[sec].c === 0) S.pos[sec].i = 0;
    }
  }
  function isFav(kind, idx) {
    if (kind === 'series') return !!S.favs[favKeyS(S.series[idx])];
    if (kind === 'ep') return !!S.favs[favKeyS(S.series[S.ep.s])];
    return !!S.favs[favKeyCh(S.ch[idx])];
  }
  function toggleFav() {
    var it = curItem(); if (it === null) return;
    var kind = curKind(), k;
    if (locked(kind, it)) return;
    if (kind === 'series') k = favKeyS(S.series[it]);
    else if (kind === 'ep') k = favKeyS(S.series[S.ep.s]);
    else if (kind === 'live' || kind === 'movie') k = favKeyCh(S.ch[it]);
    else return;
    if (S.favs[k]) { delete S.favs[k]; toast('Removido dos favoritos'); }
    else {
      var o = kind === 'live' || kind === 'movie' ? S.ch[it] : S.series[kind === 'ep' ? S.ep.s : it];
      S.favs[k] = { n: o.name, l: o.logo, g: o.group, t: o.type, id: o.id || null, a: o.adult ? 1 : 0 };
      toast('Adicionado aos favoritos');
    }
    save('nx_favs', S.favs); buildFav();
    if (S.sec === 'fav') { var p = S.pos.fav, g = S.groups.fav[p.c]; if (p.i >= g.items.length) p.i = Math.max(0, g.items.length - 1); }
    renderAll();
  }
  function wKey(c) { var s = S.series[c.sid]; return 'w:' + (s ? s.n : '') + '|' + c.se + '|' + c.ep + (c.se || c.ep ? '' : '|' + norm(c.name)); }
  function isSeen(c) { return !!S.watched[wKey(c)]; }
  function markSeen(c) {
    if (!c || c.type !== 'series' || isSeen(c)) return;
    S.watched[wKey(c)] = 1; save('nx_watched', S.watched);
  }
  function seenCount(arr) { var n = 0; if (!arr) return 0; for (var i = 0; i < arr.length; i++) if (isSeen(S.ch[arr[i]])) n++; return n; }
  function seasonsOf(s) {
    var ser = S.series[s]; if (ser.seasons) return ser.seasons;
    if (!ser.eps) return [];
    sortEps(ser);
    var map = {}, arr = [];
    for (var i = 0; i < ser.eps.length; i++) {
      var c = S.ch[ser.eps[i]], se = c.se || 0;
      if (!map['s' + se]) { map['s' + se] = { se: se, eps: [] }; arr.push(map['s' + se]); }
      map['s' + se].eps.push(ser.eps[i]);
    }
    ser.seasons = arr; return arr;
  }
  function epLabel(c, i) { return c.ep ? 'E' + pad2(c.ep) : '#' + (i + 1); }
  function seasonName(se) { return se ? 'Temporada ' + se : 'Episódios'; }

  /* ================= pesquisa ================= */
  var searchT;
  function doSearch(q, keepPos) {
    S.query = trim(q); var nq = norm(S.query), MAX = 400;
    var l = [], m = [], se = [], i, c;
    if (nq.length < 2) {
      S.groups.search = [{ name: 'Digite ao menos 2 letras', kind: 'none', items: [] }];
    } else {
      for (i = 0; i < S.ch.length; i++) {
        c = S.ch[i];
        if (c.type === 'series' || (c.adult && !S.unlocked)) continue;
        if (c.type === 'live' ? l.length >= MAX : m.length >= MAX) continue;
        if ((c.nn || (c.nn = norm(c.name))).indexOf(nq) < 0) continue;
        (c.type === 'live' ? l : m).push(i);
      }
      for (i = 0; i < S.series.length && se.length < MAX; i++) if (S.series[i].n.indexOf(nq) > -1 && (S.unlocked || !S.series[i].adult)) se.push(i);
      var st = Cat.busy() ? ' · carregando…' : (S.bg && S.bg.running ? ' · buscando ' + S.bg.done + '/' + S.bg.total : '');
      S.groups.search = [{ name: 'TV ao Vivo', kind: 'live', items: sortIdx(l, chObj) }, { name: 'Filmes' + st, kind: 'movie', items: sortIdx(m, chObj) }, { name: 'Séries' + st, kind: 'series', items: sortIdx(se, seObj) }];
    }
    var gs = S.groups.search;
    if (keepPos && S.sec === 'search') {
      var p = S.pos.search; if (p.c >= gs.length) p.c = 0;
      if (p.i >= gs[p.c].items.length) p.i = Math.max(0, gs[p.c].items.length - 1);
    } else {
      var first = 0;
      for (i = 0; i < gs.length; i++) if (gs[i].items.length) { first = i; break; }
      S.sec = 'search'; S.navIdx = 0; S.ep = null; S.pos.search = { c: first, i: 0 };
    }
    if (S.mode === 'main') renderAll();
    if (S.api && nq.length >= 2) bgLoadAll();
  }
  // pesquisa em filmes/séries de servidor Xtream: carrega as categorias aos poucos
  function bgLoadAll() {
    if (S.bg && (S.bg.running || S.bg.finished || S.bg.wait)) return;
    Cat.maybeStart();
    if (Cat.busy()) { S.bg = { wait: true }; Cat.whenDone(function () { S.bg = null; if (S.sec === 'search' && S.query) bgLoadAll(); }); return; }
    var q = [], i, gm = S.groups.movie || [], gs = S.groups.series || [];
    for (i = 0; i < gm.length; i++) if (!gm[i].items && (S.unlocked || !gm[i].adult)) q.push(gm[i]);
    for (i = 0; i < gs.length; i++) if (!gs[i].items && (S.unlocked || !gs[i].adult)) q.push(gs[i]);
    if (!q.length) { S.bg = { finished: true }; return; }
    var api = S.api;
    S.bg = { running: true, done: 0, total: q.length };
    var refreshT = null;
    function refresh() { if (S.sec === 'search' && S.query && S.mode === 'main') doSearch(S.query, true); }
    var running = 0;
    function next() {
      if (S.api !== api) return;
      if (!q.length) { if (!running) { S.bg = { finished: true }; refresh(); } return; }
      var g = q.shift();
      if (g.items) { S.bg.done++; next(); return; }
      if (g.loading) { q.push(g); setTimeout(next, 400); return; }
      running++;
      loadGroup(g, function () {
        running--; S.bg.done++;
        if (!refreshT) refreshT = setTimeout(function () { refreshT = null; refresh(); }, 1500);
        setTimeout(next, 20);
      });
      if (!g.loading && !g.items) { running--; S.bg.done++; setTimeout(next, 20); }
    }
    for (var k0 = 0; k0 < 4; k0++) next();
  }

  /* ================= programação (EPG Xtream) ================= */
  function epgCreds() { return S.api || credsOf(activeList()); }
  function streamId(url) { var m = /\/(\d+)(\.[a-z0-9]+)?(\?.*)?$/i.exec(url); return m ? m[1] : null; }
  function epgFor(c, cb) {
    var cr = epgCreds(), id = streamId(c.url);
    if (!cr || !id) { cb(null); return; }
    var e = S.epg[id];
    if (e && now() - e.t < 5 * 60000) { cb(e.list); return; }
    var x = new XMLHttpRequest();
    x.open('GET', cr.base + '/player_api.php?username=' + encodeURIComponent(cr.u) + '&password=' + encodeURIComponent(cr.p) + '&action=get_short_epg&stream_id=' + id + '&limit=4', true);
    x.timeout = 8000;
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      var r = null, out = [];
      try { r = JSON.parse(x.responseText); } catch (er) {}
      var arr = r && r.epg_listings ? r.epg_listings : [];
      for (var i = 0; i < arr.length; i++) {
        var a = arr[i], st = parseInt(a.start_timestamp, 10) * 1000, en = parseInt(a.stop_timestamp, 10) * 1000;
        if (!st) st = Date.parse(String(a.start).replace(' ', 'T'));
        if (!en) en = Date.parse(String(a.end || a.stop).replace(' ', 'T'));
        if (st && en) out.push({ t: b64(a.title), s: st, e: en });
      }
      out.sort(function (p, q) { return p.s - q.s; });
      S.epg[id] = { t: now(), list: out };
      cb(out);
    };
    x.ontimeout = function () { cb(null); };
    try { x.send(); } catch (er) { cb(null); }
  }
  function epgNowNext(list) {
    var t = now(), cur = null, nxt = null;
    if (!list) return [null, null];
    for (var i = 0; i < list.length; i++) {
      if (list[i].s <= t && t < list[i].e) { cur = list[i]; nxt = list[i + 1] || null; break; }
      if (list[i].s > t) { nxt = list[i]; break; }
    }
    return [cur, nxt];
  }
  var epgT;
  function loadEpg() {
    var c = S.live; clearInterval(epgT);
    if (!c) { $('epg').innerHTML = ''; return; }
    if (!epgCreds() || !streamId(c.url)) { $('epg').innerHTML = '<div class="none">Programação não disponível para esta lista</div>'; $('osd-epg').innerHTML = ''; return; }
    $('epg').innerHTML = '<div class="none">Carregando programação...</div>';
    var paint = function () {
      epgFor(c, function (list) {
        if (S.live !== c) return;
        var nn = epgNowNext(list), cur = nn[0], nxt = nn[1], h = '';
        if (cur) {
          var pct = Math.max(0, Math.min(100, (now() - cur.s) * 100 / (cur.e - cur.s)));
          h += '<div class="row"><span class="lbl">AGORA</span>' + hhmm(cur.s) + ' – ' + hhmm(cur.e) + '</div>' +
            '<div class="tt">' + esc(cur.t) + '</div><div class="bar"><div style="width:' + pct + '%"></div></div>';
          $('osd-epg').innerHTML = 'Agora: ' + esc(cur.t) + ' · ' + hhmm(cur.s) + '–' + hhmm(cur.e);
        } else { h += '<div class="none">Sem informação do programa atual</div>'; $('osd-epg').innerHTML = ''; }
        if (nxt) h += '<div class="row"><span class="lbl nx">A SEGUIR</span><span class="nt">' + hhmm(nxt.s) + ' · ' + esc(nxt.t) + '</span></div>';
        $('epg').innerHTML = h;
      });
    };
    paint(); epgT = setInterval(paint, 60000);
  }

  /* ================= player ================= */
  function pvMsg(t) {
    $('preview-msg').innerHTML = t;
    var m = $('pv-msg');
    if (t && S.mode === 'main' && Player.active) { m.innerHTML = t; show(m); } else hide(m);
  }
  var Player = {
    av: null, vid: null, active: false, cur: 'vid', gen: 0, loadT: null, list: [], idx: 0, lastC: null,
    findAv: function () {
      if (this.av) return this.av;
      try { if (window.webapis && webapis.avplay) this.av = webapis.avplay; } catch (e) {}
      return this.av;
    },
    init: function () {
      this.findAv();
      this.vid = $('html-player');
      this.hideObj(); this.hideVid();
    },
    rect: function () {
      if (S.mode === 'full') return [0, 0, 1920, 1080];
      var r = $('preview').getBoundingClientRect();
      return [Math.round(r.left) + 4, Math.round(r.top) + 4, Math.round(r.width) - 8, Math.round(r.height) - 8];
    },
    applyRect: function () {
      if (S.mode === 'main') {
        var pr = $('preview').getBoundingClientRect(), h = $('hole').style;
        h.left = pr.left + 'px'; h.top = pr.top + 'px'; h.width = pr.width + 'px'; h.height = pr.height + 'px';
      }
      if (!this.active) { this.hideObj(); this.hideVid(); return; }
      var r = this.rect(), el = this.cur === 'av' ? $('av-player') : this.vid;
      if (this.cur === 'av') this.hideVid(); else this.hideObj();
      el.style.left = r[0] + 'px'; el.style.top = r[1] + 'px'; el.style.width = r[2] + 'px'; el.style.height = r[3] + 'px';
      el.style.visibility = 'visible'; el.style.display = 'block';
      var m = $('pv-msg').style; m.left = r[0] + 'px'; m.top = r[1] + 'px'; m.width = r[2] + 'px'; m.height = r[3] + 'px';
      if (this.cur === 'av') { try { this.av.setDisplayRect(r[0], r[1], r[2], r[3]); } catch (e) {} }
    },
    altUrl: function (u) { // outro formato do mesmo canal: .ts <-> .m3u8
      if (/\.ts(\?|$)/i.test(u)) return u.replace(/\.ts(\?|$)/i, '.m3u8$1');
      if (/\.m3u8(\?|$)/i.test(u)) return u.replace(/\.m3u8(\?|$)/i, '.ts$1');
      if (/\/\d+$/.test(u)) return u + '.m3u8';
      return null;
    },
    // tentativas: player (HTML5 ou Samsung) x formato (.ts ou .m3u8); a que funcionar fica salva
    attempts: function (c) {
      if (ANDROID) return this.attemptsDroid(c);
      var engs = ['av', 'vid'], urls = [c.url], out = [], i, j;
      if (!this.findAv()) engs = ['vid'];
      if (c.type === 'live' && this.altUrl(c.url)) urls.push(this.altUrl(c.url));
      for (i = 0; i < engs.length; i++) for (j = 0; j < urls.length; j++) out.push({ eng: engs[i], url: urls[j], key: engs[i] + '|' + j });
      if (c.type === 'live') return this.byStats(out);
      return out.sort(function (a, b) { return (a.eng === 'av' ? 0 : 1) - (b.eng === 'av' ? 0 : 1); });
    },
    attemptsDroid: function (c) {
      var u = c.url, out = [], i, hasH = !!(window.Hls && Hls.isSupported()), hasT = !!(window.mpegts && mpegts.isSupported());
      var isM3 = /\.m3u8(\?|$)/i.test(u), isTs = /\.ts(\?|$)/i.test(u), a = this.altUrl(u);
      if (c.type === 'live') {
        var m3 = isM3 ? u : (a && /\.m3u8(\?|$)/i.test(a) ? a : null);
        var ts = isTs ? u : (a && /\.ts(\?|$)/i.test(a) ? a : (!isM3 ? u : null));
        if (m3 && hasH) out.push({ eng: 'hls', url: m3, key: 'hls' });
        if (ts && hasT) out.push({ eng: 'ts', url: ts, key: 'ts' });
        if (m3) out.push({ eng: 'vid', url: m3, key: 'vid|m3u8' });
        if (!out.length) out.push({ eng: 'vid', url: u, key: 'vid|raw' });
        out = this.byStats(out);
      } else {
        if (isM3 && hasH) out.push({ eng: 'hls', url: u, key: 'hls' });
        else if (isTs && hasT) out.push({ eng: 'ts', url: u, key: 'ts' });
        out.push({ eng: 'vid', url: u, key: 'vid' });
      }
      return out;
    },
    // tempo médio que cada forma de tocar levou para começar (por lista); a mais rápida vai primeiro
    stats: function () { if (!S.pstat || S.pstatId !== S.activeId) { S.pstat = load('nx_pst2_' + S.activeId, {}) || {}; S.pstatId = S.activeId; } return S.pstat; },
    byStats: function (out) {
      var st = this.stats(), pref = S.pref, i;
      for (i = 0; i < out.length; i++) { var v = st[out[i].key]; out[i].est = v !== undefined ? v : (out[i].key === pref ? 3000 : (out[i].key === 'av|0' ? 3500 : out[i].key === 'vid|1' ? 4000 : 4500 + i * 10)); }
      out.sort(function (a, b) { return a.est - b.est; });
      return out;
    },
    note: function (key, ms) {
      var st = this.stats(), o = st[key];
      st[key] = Math.round(o === undefined ? ms : o * 0.6 + ms * 0.4);
      save('nx_pst2_' + S.activeId, st);
    },
    play: function (c, step) {
      var self = this, vod = c.type !== 'live';
      if (step === undefined || this.lastC !== c) { this.list = this.attempts(c); this.idx = 0; } else this.idx = step;
      if (this.lastC !== c) { this.trackPos(c); }
      this.lastC = c;
      var at = this.list[this.idx];
      this.stop(true);
      var g = ++this.gen; this.cur = at.eng;
      this.active = true; S.cur = c;
      if (!vod) recLiveWatch();
      if (!vod) { var changed = S.live !== c; S.live = c; save('nx_last', c.url); if (changed || !$('epg').innerHTML) loadEpg(); }
      addClass(document.body, 'playing');
      pvMsg('');
      this.t0 = now();
      this.loadingUI(true);
      clearTimeout(this.loadT);
      this.t0 = now();
      this.loadT = setTimeout(function () { if (g === self.gen) { if (!vod) self.note(at.key, 30000); self.fail(); } }, vod ? 40000 : (self.idx + 1 < self.list.length ? 9000 : 15000));
      var ok = function () {
        if (g !== self.gen) return;
        if (self.t0) { if (!vod) self.note(at.key, now() - self.t0); self.t0 = 0; }
        clearTimeout(self.loadT); self.loadingUI(false);
        if (!vod && S.pref !== at.key) { S.pref = at.key; save('nx_pref2_' + S.activeId, at.key); }
      };
      if (at.eng === 'av') {
        var av = this.av;
        try {
          av.open(at.url);
          if (!vod) { try { av.setBufferingParam('PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4); } catch (e) {} }
          av.setListener({
            onbufferingstart: function () { if (g === self.gen) self.loadingUI(true); },
            onbufferingcomplete: function () { if (g === self.gen) ok(); },
            onerror: function () { if (g === self.gen) self.fail(); },
            onstreamcompleted: function () { if (g !== self.gen) return; if (vod) { if (!self.recover(c)) vodEnded(); } else self.fail(); }
          });
          this.applyRect();
          try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e) {}
          av.prepareAsync(function () {
            if (g !== self.gen) return;
            self.applyRect();
            try { av.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX'); } catch (e) {}
            try { av.play(); ok(); } catch (e) { self.fail(); }
          }, function () { if (g === self.gen) self.fail(); });
        } catch (e) { self.fail(); }
      } else {
        this.applyRect();
        var v = this.vid;
        v.onerror = function () { if (g === self.gen) self.fail(); };
        v.onwaiting = function () { if (g === self.gen) self.loadingUI(true); };
        v.onplaying = function () { ok(); };
        v.onended = function () { if (g === self.gen && vod) { if (!self.recover(c)) vodEnded(); } };
        if (at.eng === 'hls') {
          var hl = this.hls = new Hls({ maxBufferLength: vod ? 60 : 20, backBufferLength: 20, manifestLoadingMaxRetry: 2, levelLoadingMaxRetry: 2, startFragPrefetch: true, liveSyncDurationCount: 2, startLevel: -1 });
          hl.on(Hls.Events.ERROR, function (ev, d) { if (g === self.gen && d && d.fatal) self.fail(); });
          hl.loadSource(at.url); hl.attachMedia(v);
        } else if (at.eng === 'ts') {
          var mp = this.mp = mpegts.createPlayer({ type: 'mpegts', isLive: !vod, url: at.url },
            { enableWorker: false, enableStashBuffer: !!vod, stashInitialSize: 128 * 1024, lazyLoad: false, liveBufferLatencyChasing: !vod, autoCleanupSourceBuffer: true });
          mp.on(mpegts.Events.ERROR, function () { if (g === self.gen) self.fail(); });
          mp.attachMediaElement(v); mp.load();
        } else {
          v.src = at.url;
          try { v.load(); } catch (e) {}
        }
        var p = v.play(); if (p && p['catch']) p['catch'](function () {});
      }
      renderNow(); if (S.mode === 'main') renderItems();
    },
    // filme/episódio caiu no meio (conexão ou fim falso): reconecta e volta ao ponto onde estava
    recover: function (c) {
      var d = this.lastDur || 0, p = this.lastPos || 0;
      if (!c || c.type === 'live' || this.lastC !== c || p < 5000 || (d > 0 && p > d - Math.min(60000, d * 0.05))) return false;
      if (c !== this.recC) { this.recC = c; this.recN = 0; }
      if (++this.recN > 4) return false;
      toast('Reconectando...');
      this.play(c); Res.seekWhenReady(c, p);
      return true;
    },
    trackPos: function (c) {
      var self = this; clearInterval(this.posT);
      if (c.type === 'live') return;
      this.lastPos = 0; this.lastDur = 0;
      this.posT = setInterval(function () {
        if (self.lastC !== c || !self.active || !self.isPlaying()) return;
        var t = self.times(); if (t[0] > 0) { self.lastPos = t[0]; self.lastDur = t[1]; }
      }, 3000);
    },
    loadingUI: function (on) {
      var self = this;
      clearInterval(this.ldT);
      var txt = function () {
        if (!self.t0) return 'Carregando...';
        var sec = Math.round((now() - self.t0) / 1000), n = self.list.length;
        return 'Conectando' + (sec >= 2 ? ' · ' + sec + ' s' : '...') + (n > 1 && (self.idx > 0 || sec >= 4) ? ' · tentativa ' + (self.idx + 1) + ' de ' + n : '') + (sec >= 4 && self.list[self.idx] && !ANDROID ? ' · ' + (self.list[self.idx].eng === 'av' ? 'AVPlay' : 'HTML5') : '');
      };
      if (S.mode === 'full') {
        hide($('pv-msg'));
        if (on) { show($('fs-load')); $('fs-load-t').innerHTML = txt(); this.ldT = setInterval(function () { $('fs-load-t').innerHTML = txt(); }, 1000); }
        else hide($('fs-load'));
      } else {
        pvMsg(on ? txt() : '');
        if (on) this.ldT = setInterval(function () { if (S.mode !== 'full') pvMsg(txt()); }, 1000);
      }
    },
    fail: function () {
      clearTimeout(this.loadT);
      if (this.t0 && S.cur && S.cur.type === 'live' && this.list[this.idx]) { this.note(this.list[this.idx].key, 30000); this.t0 = 0; }
      var c = S.cur;
      if (c && c.type !== 'live' && !this.t0 && this.recover(c)) return;
      if (c && this.lastC === c && this.idx + 1 < this.list.length) { this.play(c, this.idx + 1); return; } // próxima tentativa
      this.loadingUI(false);
      this.stop(true); this.active = false;
      if (S.mode === 'main') $('preview-msg').innerHTML = 'Canal indisponível';
      toast('Não foi possível abrir este conteúdo');
    },
    hideObj: function () {
      if (!this.av) { $('av-player').style.display = 'none'; return; }
      var el = $('av-player'); el.style.visibility = 'hidden'; el.style.width = '0px'; el.style.height = '0px';
    },
    hideVid: function () { var v = this.vid; if (v) { v.style.display = 'none'; } },
    stop: function (keepState) {
      clearInterval(this.ldT); this.t0 = 0;
      clearTimeout(this.loadT);
      if (this.av) { try { this.av.stop(); } catch (e) {} try { this.av.close(); } catch (e) {} }
      if (this.hls) { try { this.hls.destroy(); } catch (e) {} this.hls = null; }
      if (this.mp) { try { this.mp.pause(); this.mp.unload(); this.mp.detachMediaElement(); this.mp.destroy(); } catch (e) {} this.mp = null; }
      if (this.vid) { try { this.vid.onerror = null; this.vid.pause(); this.vid.removeAttribute('src'); this.vid.load(); } catch (e) {} }
      this.hideObj(); this.hideVid(); hide($('pv-msg'));
      this.active = false;
      hide($('fs-load'));
      if (!keepState) rmClass(document.body, 'playing');
    },
    isPaused: function () {
      if (this.cur === 'av') { try { return this.av.getState() === 'PAUSED'; } catch (e) { return false; } }
      return this.vid.paused;
    },
    toggle: function () {
      if (this.cur === 'av') { try { if (this.av.getState() === 'PAUSED') this.av.play(); else this.av.pause(); } catch (e) {} }
      else { if (this.vid.paused) this.vid.play(); else this.vid.pause(); }
    },
    seek: function (ms) {
      if (this.cur === 'av') { try { if (ms > 0) this.av.jumpForward(ms); else this.av.jumpBackward(-ms); } catch (e) {} }
      else { try { this.vid.currentTime = Math.max(0, this.vid.currentTime + ms / 1000); } catch (e) {} }
    },
    seekAbs: function (ms) {
      if (this.cur === 'av') { try { this.av.seekTo(ms); } catch (e) {} }
      else { try { this.vid.currentTime = ms / 1000; } catch (e) {} }
    },
    isPlaying: function () {
      if (this.cur === 'av') { try { return this.av.getState() === 'PLAYING'; } catch (e) { return false; } }
      return !!this.vid && !this.vid.paused && this.vid.readyState >= 2;
    },
    times: function () {
      if (this.cur === 'av') { try { return [this.av.getCurrentTime(), this.av.getDuration()]; } catch (e) { return [0, 0]; } }
      return [(this.vid.currentTime || 0) * 1000, (this.vid.duration || 0) * 1000];
    }
  };

  /* ================= estado ================= */
  function curGroups() {
    if (S.sec === 'events') { Ev.ensure(); return Ev.groups; }
    return S.groups[S.sec] || [];
  }
  function curPos() { return S.pos[S.sec]; }
  function curGroup() { return curGroups()[curPos().c]; }
  function curKind() { if (S.ep) return 'ep'; var g = curGroup(); return g ? g.kind : 'none'; }
  function curItems() {
    if (S.ep) return seasonsOf(S.ep.s)[S.ep.si].eps;
    var g = curGroup(); if (!g || groupLocked(g)) return [];
    if (!g.items) { if (S.sec !== 'events') loadGroup(g); return []; }
    return g.items;
  }
  function curIdx() { return S.ep ? S.ep.i : curPos().i; }
  function setIdx(v) { if (S.ep) S.ep.i = v; else curPos().i = v; }
  function curItem() { var it = curItems(), i = curIdx(); return it.length ? it[i] : null; }


  /* ================= Eventos do dia (jogos, lutas e outros esportes) ================= */
  // Dados públicos do placar da ESPN. Horários convertidos para o relógio da TV.
  var EV_LEAGUES = [
    ['soccer', 'bra.1', 'Brasileirão Série A'], ['soccer', 'bra.2', 'Brasileirão Série B'], ['soccer', 'bra.copa_do_brazil', 'Copa do Brasil'],
    ['soccer', 'bra.camp.paulista', 'Paulistão'], ['soccer', 'bra.camp.carioca', 'Carioca'], ['soccer', 'bra.camp.mineiro', 'Mineiro'],
    ['soccer', 'bra.camp.gaucho', 'Gauchão'], ['soccer', 'bra.supercopa_do_brazil', 'Supercopa do Brasil'],
    ['soccer', 'conmebol.libertadores', 'Libertadores'], ['soccer', 'conmebol.sudamericana', 'Sul-Americana'], ['soccer', 'conmebol.recopa', 'Recopa'],
    ['soccer', 'fifa.worldq.conmebol', 'Eliminatórias'], ['soccer', 'fifa.world', 'Copa do Mundo'], ['soccer', 'fifa.cwc', 'Mundial de Clubes'],
    ['soccer', 'fifa.intercontinental_cup', 'Copa Intercontinental'], ['soccer', 'fifa.friendly', 'Amistosos de seleções'], ['soccer', 'conmebol.america', 'Copa América'],
    ['soccer', 'uefa.champions', 'Champions League'], ['soccer', 'uefa.europa', 'Europa League'], ['soccer', 'uefa.europa.conf', 'Conference League'],
    ['soccer', 'eng.1', 'Premier League'], ['soccer', 'esp.1', 'LaLiga'], ['soccer', 'ita.1', 'Série A Italiana'], ['soccer', 'ger.1', 'Bundesliga'],
    ['soccer', 'fra.1', 'Ligue 1'], ['soccer', 'por.1', 'Liga Portugal'], ['soccer', 'arg.1', 'Argentino'], ['soccer', 'ksa.1', 'Liga Saudita'],
    ['soccer', 'usa.1', 'MLS'], ['soccer', 'eng.fa', 'Copa da Inglaterra'], ['soccer', 'esp.copa_del_rey', 'Copa do Rei'],
    ['mma', 'ufc', 'UFC'], ['basketball', 'nba', 'NBA'], ['football', 'nfl', 'NFL'], ['racing', 'f1', 'Fórmula 1']
  ];
  var EV_SPORT = { soccer: 'Futebol', mma: 'Lutas', basketball: 'Basquete', football: 'Futebol americano', racing: 'Fórmula 1' };
  var F1_SESS = { FP1: 'Treino livre 1', FP2: 'Treino livre 2', FP3: 'Treino livre 3', Qual: 'Classificação', Race: 'Corrida', SS: 'Sprint classificação', Sprint: 'Corrida sprint', SQ: 'Sprint classificação' };
  var Ev = {
    list: [], groups: [{ name: 'Todos', kind: 'event', items: null }], day: '', at: 0, loading: false, err: false, timer: null,
    small: function (u, sz) {
      if (!u) return '';
      var m = /^https?:\/\/a\.espncdn\.com(\/i\/.*?\.png)/i.exec(u);
      if (m) return 'https://a.espncdn.com/combiner/i?img=' + m[1] + '&w=' + sz + '&h=' + sz;
      var c = /img=(\/i\/[^&]+)/.exec(u);
      if (c) return 'https://a.espncdn.com/combiner/i?img=' + c[1] + '&w=' + sz + '&h=' + sz;
      return u;
    },
    dayStr: function (d) { return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()); },
    hm: function (t) { var d = new Date(t); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); },
    ensure: function () {
      var today = Ev.dayStr(new Date());
      if (Ev.loading) return;
      if (Ev.day !== today || now() - Ev.at > 5 * 60000) Ev.load(today);
    },
    load: function (today) {
      Ev.loading = true; Ev.err = false;
      if (Ev.day !== today) { Ev.list = []; Ev.groups = [{ name: 'Todos', kind: 'event', items: null }]; }
      var res = [], q = EV_LEAGUES.slice(), running = 0, ok = 0, done = 0, total = q.length;
      function next() {
        while (running < 4 && q.length) {
          (function (L) {
            running++;
            getText('https://site.api.espn.com/apis/site/v2/sports/' + L[0] + '/' + L[1] + '/scoreboard?dates=' + today, 20000, function (t) {
              running--; done++;
              if (t) { ok++; try { Ev.parse(L, JSON.parse(t), today, res); } catch (e) {} }
              if (done === total) finish(); else next();
            });
          })(q.shift());
        }
      }
      function finish() {
        Ev.loading = false; Ev.day = today; Ev.at = now(); Ev.err = ok === 0;
        res.sort(function (a, b) { return a.t - b.t || a.ord - b.ord; });
        var keep = {};
        for (var o = 0; o < Ev.list.length; o++) if (Ev.list[o].ch) keep[Ev.list[o].league + Ev.list[o].t + (Ev.list[o].home || Ev.list[o].title)] = Ev.list[o].ch;
        for (var r = 0; r < res.length; r++) { var kk = res[r].league + res[r].t + (res[r].home || res[r].title); if (keep[kk]) res[r].ch = keep[kk]; }
        var fresh = Ev.scanAt && now() - Ev.scanAt < 30 * 60000 && Ev.scanned && Ev.scanned.length === res.length;
        Ev.list = res; Ev.build();
        if (!fresh) { Ev.scanning = false; Ev.scan(); } else Ev.scanned = res;
        clearTimeout(Ev.timer);
        // com jogo ao vivo o placar se atualiza a cada 2 minutos enquanto a aba está aberta
        var live = false; for (var i = 0; i < res.length; i++) if (res[i].state === 'in') live = true;
        if (live) Ev.timer = setTimeout(function () { if (S.sec === 'events' && S.mode === 'main') Ev.load(Ev.dayStr(new Date())); }, 120000);
        if (S.sec === 'events' && S.mode === 'main') renderAll();
      }
      next();
    },
    isToday: function (iso, today) { var d = new Date(iso); return !isNaN(d.getTime()) && Ev.dayStr(d) === today; },
    parse: function (L, j, today, out) {
      var evs = j.events || [], lg = (j.leagues && j.leagues[0]) || {}, llogo = '', i, k, e, cp, st;
      if (lg.logos && lg.logos.length) llogo = lg.logos[0].href;
      for (i = 0; i < evs.length; i++) {
        e = evs[i]; st = (e.status && e.status.type) || {};
        var base = { sport: EV_SPORT[L[0]], league: L[2], llogo: llogo, ord: i };
        if (L[0] === 'racing') {
          for (k = 0; k < (e.competitions || []).length; k++) {
            cp = e.competitions[k];
            if (!Ev.isToday(cp.date, today)) continue;
            var cst = (cp.status && cp.status.type) || st, ab = cp.type && cp.type.abbreviation;
            out.push(Ev.mk(base, { t: +new Date(cp.date), title: Ev.f1Name(e.name), sub: F1_SESS[ab] || ab || 'Sessão', state: cst.state, detail: cst.shortDetail || '', venue: e.circuit ? e.circuit.fullName : '', q: 'F1' }));
          }
          continue;
        }
        if (L[0] === 'mma') {
          var cps = e.competitions || [], today1 = false, first = null, main = cps.length ? cps[cps.length - 1] : null;
          for (k = 0; k < cps.length; k++) if (Ev.isToday(cps[k].date, today)) { today1 = true; if (!first) first = cps[k]; }
          if (!today1 && !Ev.isToday(e.date, today)) continue;
          var f = main && main.competitors ? main.competitors : [];
          var a1 = f[0] && f[0].athlete ? f[0].athlete : {}, a2 = f[1] && f[1].athlete ? f[1].athlete : {};
          out.push(Ev.mk(base, { t: +new Date(first ? first.date : e.date), title: e.name, home: a1.displayName || '', away: a2.displayName || '',
            hlogo: a1.flag ? a1.flag.href : '', alogo: a2.flag ? a2.flag.href : '', state: st.state, detail: st.shortDetail || '',
            sub: main ? 'Luta principal ' + Ev.hm(+new Date(main.date)) + ' · ' + cps.length + ' lutas' : '', q: 'UFC' }));
          continue;
        }
        if (!Ev.isToday(e.date, today)) continue;
        cp = (e.competitions || [])[0] || {};
        var h = null, a = null, cs = cp.competitors || [];
        for (k = 0; k < cs.length; k++) { if (cs[k].homeAway === 'home') h = cs[k]; else a = cs[k]; }
        if (!h || !a) continue;
        var ht = h.team || {}, at = a.team || {};
        out.push(Ev.mk(base, { t: +new Date(e.date), home: ht.shortDisplayName || ht.displayName || '', away: at.shortDisplayName || at.displayName || '',
          hlogo: ht.logo || '', alogo: at.logo || '', hs: h.score, as: a.score, hfull: ht.displayName || '', afull: at.displayName || '', state: st.state, detail: st.shortDetail || st.detail || '',
          venue: cp.venue ? cp.venue.fullName : '', q: ht.shortDisplayName || ht.displayName || '' }));
      }
    },
    f1Name: function (n) { return (n || 'Fórmula 1').replace(/^.*?(\w+(?: \w+)?) Grand Prix$/i, 'GP $1').replace(/Grand Prix/i, 'GP'); },
    mk: function (base, o) { for (var k in base) if (o[k] === undefined) o[k] = base[k]; return o; },
    build: function () {
      var all = [], live = [], byL = {}, order = [], i, e;
      for (i = 0; i < Ev.list.length; i++) {
        e = Ev.list[i]; all.push(i); if (e.state === 'in') live.push(i);
        if (!byL[e.league]) { byL[e.league] = []; order.push(e.league); }
        byL[e.league].push(i);
      }
      // categorias na ordem da lista de campeonatos
      var rank = {}; for (i = 0; i < EV_LEAGUES.length; i++) rank[EV_LEAGUES[i][2]] = i;
      order.sort(function (a, b) { return rank[a] - rank[b]; });
      var g = [{ name: 'Todos', kind: 'event', items: all }];
      if (live.length) g.push({ name: 'Ao vivo agora', kind: 'event', items: live });
      for (i = 0; i < order.length; i++) g.push({ name: order[i], kind: 'event', items: byL[order[i]] });
      Ev.groups = g;
      var p = S.pos.events; if (p.c >= g.length) p.c = 0; if (p.i >= g[p.c].items.length) p.i = Math.max(0, g[p.c].items.length - 1);
    },
    msg: function () { return Ev.err ? 'Não foi possível buscar os eventos. Verifique a internet e entre na aba de novo.' : 'Nenhum evento encontrado para hoje.'; },
    status: function (e) {
      var sc = e.hs !== undefined && e.home ? esc(e.hs + 'x' + e.as) : '';
      if (e.state === 'in') return '<span class="evs live">' + (sc ? sc + ' ' : '') + esc(e.detail && e.detail.length < 9 ? e.detail : 'AO VIVO') + '</span>';
      if (e.state === 'post') return '<span class="evs end">' + (sc ? sc + ' ' : '') + 'Fim</span>';
      return '';
    },
    rowHtml: function (e) {
      var h = '<span class="evt">' + Ev.hm(e.t) + '</span>';
      if (e.home && e.away) h += '<img class="cr" src="' + esc(Ev.small(e.hlogo, 80)) + '" onerror="this.style.visibility=\'hidden\'"><span class="t">' + esc(e.home) + ' <b class="vs">x</b> ' + esc(e.away) + '</span><img class="cr" src="' + esc(Ev.small(e.alogo, 80)) + '" onerror="this.style.visibility=\'hidden\'">';
      else h += '<img class="cr" src="' + esc(Ev.small(e.llogo, 80)) + '" onerror="this.style.visibility=\'hidden\'"><span class="t">' + esc(e.title + (e.sub ? ' · ' + e.sub : '')) + '</span>';
      var cn = Ev.chName(e, 34);
      if (cn) h = h.replace('<span class="t">', '<span class="t two"><span class="tl">').replace(/<\/span>(<img class="cr"[^>]*>)?$/, function (m0, img) { return '</span><span class="ts">' + esc(cn) + '</span></span>' + (img || ''); });
      return h + Ev.status(e);
    },
    side: function (i) {
      var e = i === null || i === undefined ? null : Ev.list[i], h = '';
      if (!e) { $('event-panel').innerHTML = '<div class="ev-empty">' + (Ev.loading ? 'Carregando os jogos de hoje...' : 'Escolha um evento') + '</div>'; return; }
      h += '<div class="ev-lg"><img src="' + esc(Ev.small(e.llogo, 64)) + '" onerror="this.style.display=\'none\'"><span>' + esc(e.league) + '</span></div>';
      if (e.home && e.away) {
        var sc = e.state === 'pre' ? '<div class="ev-time">' + Ev.hm(e.t) + '</div>' : '<div class="ev-score">' + esc((e.hs !== undefined ? e.hs : '') + ' x ' + (e.as !== undefined ? e.as : '')) + '</div>';
        h += '<div class="ev-match"><div class="ev-tm"><img src="' + esc(Ev.small(e.hlogo, 200)) + '" onerror="this.style.visibility=\'hidden\'"><div>' + esc(e.home) + '</div></div>' + sc +
          '<div class="ev-tm"><img src="' + esc(Ev.small(e.alogo, 200)) + '" onerror="this.style.visibility=\'hidden\'"><div>' + esc(e.away) + '</div></div></div>';
        if (e.title) h += '<div class="ev-title">' + esc(e.title) + '</div>';
      } else {
        h += '<div class="ev-big"><img src="' + esc(Ev.small(e.llogo, 200)) + '" onerror="this.style.visibility=\'hidden\'"></div><div class="ev-title">' + esc(e.title) + '</div><div class="ev-time">' + Ev.hm(e.t) + '</div>';
      }
      var st = e.state === 'in' ? '<span class="evs live">AO VIVO · ' + esc(e.detail) + '</span>' : e.state === 'post' ? 'Encerrado' : 'Começa às ' + Ev.hm(e.t);
      h += '<div class="ev-info">' + st + (e.sub ? '<br>' + esc(e.sub) : '') + (e.venue ? '<br>' + esc(e.venue) : '') + '</div>';
      var where;
      if (e.ch && e.ch.length) {
        var nms = []; for (var w = 0; w < e.ch.length && nms.length < 3; w++) if (nms.indexOf(S.ch[e.ch[w]].name) < 0) nms.push(S.ch[e.ch[w]].name);
        where = '<b>' + (e.weak ? 'Provável:' : 'Onde passa:') + '</b> ' + esc(nms.join(' · ')) + (e.ch.length > nms.length && nms.length >= 3 ? ' e outros' : '');
      } else if (!S.ch.length) where = 'Carregue uma lista para ver os canais';
      else if (Ev.scanning) where = 'Procurando o canal na programação... ' + Ev.scanDone + ' de ' + Ev.scanTotal;
      else where = 'Canal não encontrado na programação';
      h += '<div class="ev-where">' + where + '</div>';
      $('event-panel').innerHTML = h;
    },
    // procura o jogo na programação dos canais de esporte da lista (Xtream) e devolve os canais, do melhor para o pior
    SPORT_CH: /espor|sport|premiere|espn|combate|ufc|dazn|tnt|band|globo|caze|xsport|goat|prime|amazon|paramount|disney|star\+?|max|apple|nba|nfl|f1|formula|record|sbt|futebol|soccer|fight|luta|onefootball|canal ?gol|cbf|conmebol|libertadores|champions|premier|laliga|serie a|bundesliga|eleven|sky|fox|bein|nosso futebol|placar|jogo|ppv|evento|tyc|gol ?tv/,
    // canais que quase sempre passam esporte: procurados primeiro
    SPORT_TOP: /espn|sportv|premiere|combate|tnt ?sport|dazn|caze|ufc|nba|nfl|band ?sport|xsport|goat|esporte|sports?\b|fight|ppv|evento|futebol|soccer|nosso futebol|placar|onefootball|canal ?gol|eleven|bein|tyc|gol ?tv|f1|formula|premier|libertadores|champions|disney|star\+|prime video|paramount|max\b|apple/,
    STOP: { fc: 1, sc: 1, ec: 1, cf: 1, ac: 1, as: 1, ca: 1, cr: 1, se: 1, de: 1, da: 1, do: 1, das: 1, dos: 1, the: 1, club: 1, clube: 1, united: 1, city: 1, real: 1, sporting: 1, atletico: 1, athletic: 1, sport: 1, esporte: 1, futebol: 1, san: 1, santa: 1, saint: 1, deportivo: 1, olympique: 1, new: 1, york: 1, los: 1, angeles: 1, las: 1, vegas: 1, grand: 1, prix: 1, night: 1, fight: 1 },
    // nomes como aparecem na programação brasileira
    ALIAS: { 'paris saint germain': ['psg'], 'psg': ['paris saint germain'], 'manchester united': ['man united', 'manchester utd', 'man utd'], 'manchester city': ['man city'], 'man united': ['manchester united'], 'man city': ['manchester city'],
      'atletico mg': ['atletico mineiro', 'galo'], 'atletico mineiro': ['atletico mg'], 'athletico pr': ['athletico paranaense', 'athletico'], 'athletico paranaense': ['athletico pr', 'athletico'],
      'red bull bragantino': ['bragantino'], 'rb bragantino': ['bragantino'], 'bragantino': ['red bull bragantino'], 'vasco da gama': ['vasco'], 'internacional': ['inter'], 'gremio': ['gremio'],
      'atletico madrid': ['atletico de madrid'], 'bayern munich': ['bayern de munique', 'bayern'], 'inter milan': ['inter de milao', 'internazionale'], 'internazionale': ['inter de milao', 'inter milan'],
      'ac milan': ['milan'], 'sevilla': ['sevilha'], 'barcelona': ['barca'], 'juventus': ['juve'], 'tottenham hotspur': ['tottenham'], 'wolverhampton wanderers': ['wolves', 'wolverhampton'],
      'borussia dortmund': ['dortmund'], 'bayer leverkusen': ['leverkusen'], 'sporting cp': ['sporting'], 'benfica': ['benfica'], 'porto': ['fc porto'] },
    // palavras do campeonato na programação (usadas só quando o título não tem os times)
    LG: { 'NFL': ['nfl', 'futebol americano'], 'NBA': ['nba'], 'UFC': ['ufc'], 'Fórmula 1': ['formula 1', 'f1', 'formula1', 'grande premio'],
      'Brasileirão Série A': ['brasileirao', 'campeonato brasileiro', 'serie a'], 'Brasileirão Série B': ['serie b', 'brasileirao serie b'], 'Copa do Brasil': ['copa do brasil'],
      'Paulistão': ['paulistao', 'campeonato paulista'], 'Carioca': ['carioca', 'cariocao'], 'Mineiro': ['mineiro'], 'Gauchão': ['gauchao'],
      'Libertadores': ['libertadores'], 'Sul-Americana': ['sul americana', 'sudamericana'], 'Recopa': ['recopa'], 'Eliminatórias': ['eliminatorias'],
      'Copa do Mundo': ['copa do mundo'], 'Mundial de Clubes': ['mundial de clubes'], 'Copa Intercontinental': ['intercontinental'], 'Copa América': ['copa america'],
      'Champions League': ['champions', 'liga dos campeoes'], 'Europa League': ['europa league', 'liga europa'], 'Conference League': ['conference league'],
      'Premier League': ['premier league', 'campeonato ingles'], 'LaLiga': ['laliga', 'la liga', 'campeonato espanhol'], 'Série A Italiana': ['calcio', 'campeonato italiano'],
      'Bundesliga': ['bundesliga', 'campeonato alemao'], 'Ligue 1': ['ligue 1', 'campeonato frances'], 'Liga Portugal': ['liga portugal', 'campeonato portugues'],
      'Argentino': ['campeonato argentino', 'liga profesional'], 'MLS': ['mls'], 'Liga Saudita': ['saudi', 'saudita'], 'Copa da Inglaterra': ['fa cup', 'copa da inglaterra'], 'Copa do Rei': ['copa do rei', 'copa del rey'] },
    REP: / (reprise|compacto|melhores momentos|vt|resumo|gols da rodada|highlights|replay|reapresentacao) /,
    keys: function (names) {
      var ph = [], tk = [], i, j, w, x;
      function addPh(p) { if (p.length >= 3 && ph.indexOf(' ' + p + ' ') < 0) ph.push(' ' + p + ' '); }
      for (i = 0; i < names.length; i++) {
        if (!names[i]) continue;
        var n = trim(norm(names[i]).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' '));
        addPh(n);
        if (Ev.ALIAS[n]) for (x = 0; x < Ev.ALIAS[n].length; x++) addPh(Ev.ALIAS[n][x]);
        w = n.split(' ');
        for (j = 0; j < w.length; j++) if (w[j].length >= 5 && !Ev.STOP[w[j]]) tk.push(' ' + w[j] + ' ');
      }
      return { ph: ph, tk: tk };
    },
    hit: function (k, txt) {
      var i;
      for (i = 0; i < k.ph.length; i++) if (txt.indexOf(k.ph[i]) >= 0) return true;
      for (i = 0; i < k.tk.length; i++) if (txt.indexOf(k.tk[i]) >= 0) return true;
      return false;
    },
    lgHit: function (e, txt) {
      var l = Ev.LG[e.league]; if (!l) return false;
      for (var i = 0; i < l.length; i++) if (txt.indexOf(' ' + l[i] + ' ') >= 0) return true;
      return false;
    },
    clean: function (t) { return ' ' + trim(norm(t).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ')) + ' '; },
    evKeys: function (e) {
      if (!e._k) e._k = { h: Ev.keys(e.home ? [e.home, e.hfull] : [e.title]), a: Ev.keys(e.away ? [e.away, e.afull] : []) };
      return e._k;
    },
    // nota do programa para o evento: 4 = os dois times na hora do jogo, 3 = os dois times com horário deslocado
    // (programação com fuso errado), 2/3 = um time ou o nome do evento, 1 = só o campeonato na hora do jogo
    score: function (e, pg) {
      var t = e.t, tight = pg.s <= t + 45 * 60000 && pg.e >= t + 10 * 60000;
      if (!tight && !(pg.s <= t + 4 * 3600000 && pg.e >= t - 4 * 3600000)) return 0;
      var txt = Ev.clean(pg.t + ' ' + (pg.d || ''));
      if (Ev.REP.test(txt)) return 0;
      var k = Ev.evKeys(e), h = Ev.hit(k.h, txt), a = e.away ? Ev.hit(k.a, txt) : false;
      if (!tight) return (e.away ? h && a : h) ? 3 : 0;
      if (h && a) return 4;
      if (h || a) return e.away ? 2 : 3;
      return pg.s >= t - 60 * 60000 && pg.s <= t + 30 * 60000 && Ev.lgHit(e, txt) ? 1 : 0;
    },
    // um canal por programação: as versões FHD/HD/SD do mesmo canal usam a mesma programação
    chKey: function (c) {
      if (c.eid) return 'e:' + norm(c.eid);
      return 'n:' + norm(c.name).replace(/\[.*?\]|\(.*?\)/g, ' ').replace(/\b(fhd|uhd|hd|sd|4k|h265|hevc|hdr|alt|backup|60fps|50fps)\b/g, ' ').replace(/[^a-z0-9]+/g, '');
    },
    // procura, de uma vez, o canal de todos os eventos do dia na programação dos canais de esporte
    scan: function () {
      if (Ev.scanning || !S.ch.length || !Ev.list.length) return;
      var cr = epgCreds(), lv = allLive() ? allLive().items : [], i, j, c, e;
      var list = Ev.list, sc = [], byKey = {}, cand = [];
      for (j = 0; j < list.length; j++) sc.push({});
      for (i = 0; i < lv.length; i++) {
        c = S.ch[lv[i]]; if (c.adult) continue;
        var nm = Ev.clean(c.name);
        for (j = 0; j < list.length; j++) {
          e = list[j]; var k = Ev.evKeys(e);
          if (e.away && Ev.hit(k.h, nm) && Ev.hit(k.a, nm)) sc[j][lv[i]] = 5;   // canal com o nome do jogo (evento / PPV)
        }
        var txt = norm(c.name + ' ' + c.group);
        if (!Ev.SPORT_CH.test(txt) || !streamId(c.url)) continue;
        var key = Ev.chKey(c), g = byKey[key];
        if (!g) { g = byKey[key] = { idx: [], pr: (Ev.SPORT_TOP.test(txt) ? 0 : 2) + (c.noepg ? 1 : 0), ord: cand.length }; cand.push(g); }
        g.idx.push(lv[i]);
      }
      cand.sort(function (x, y) { return (x.pr - y.pr) || (x.ord - y.ord); });
      if (cand.length > 700) cand.length = 700;
      Ev.scanning = true; Ev.scanDone = 0; Ev.scanTotal = cr ? cand.length : 0;
      var q = cr ? cand.slice() : [], running = 0, finished = false;
      function apply() {
        for (var j2 = 0; j2 < list.length; j2++) {
          var out = [], m = sc[j2], best = 0, key2;
          for (key2 in m) if (m[key2] > best) best = m[key2];
          var thr = best >= 2 ? (list[j2].away ? 2 : 3) : 1;
          if (best > 0) for (key2 in m) if (m[key2] >= thr) out.push(+key2);
          out.sort(function (x1, x2) { return (m[x2] - m[x1]) || (S.ch[x1].num - S.ch[x2].num); });
          list[j2].weak = best === 1;
          if (best === 1 && out.length > 6) out.length = 6;
          list[j2].ch = out;
        }
        if (S.sec === 'events' && S.mode === 'main') renderAll();
      }
      function done() {
        if (finished) return; finished = true;
        Ev.scanning = false; Ev.scanAt = now(); Ev.scanned = list; apply();
      }
      if (!q.length) { done(); return; }
      function next() {
        while (running < 10 && q.length) {
          (function (grp) {
            running++;
            var x = new XMLHttpRequest(), fin = false;
            var end = function (progs) {
              if (fin) return; fin = true; running--; Ev.scanDone++;
              if (progs) for (var j3 = 0; j3 < list.length; j3++) {
                var best = 0;
                for (var p2 = 0; p2 < progs.length; p2++) { var v = Ev.score(list[j3], progs[p2]); if (v > best) best = v; }
                if (best) for (var gi = 0; gi < grp.idx.length; gi++) if (best > (sc[j3][grp.idx[gi]] || 0)) sc[j3][grp.idx[gi]] = best;
              }
              if (Ev.scanDone % 40 === 0) apply();
              if (Ev.scanDone >= Ev.scanTotal) done(); else next();
            };
            x.open('GET', cr.base + '/player_api.php?username=' + encodeURIComponent(cr.u) + '&password=' + encodeURIComponent(cr.p) + '&action=get_short_epg&stream_id=' + streamId(S.ch[grp.idx[0]].url) + '&limit=40', true);
            x.timeout = 12000;
            x.onreadystatechange = function () {
              if (x.readyState !== 4) return;
              var r = null, out = [];
              try { r = JSON.parse(x.responseText); } catch (er) {}
              var arr = r && r.epg_listings ? r.epg_listings : [];
              for (var j4 = 0; j4 < arr.length; j4++) {
                var it = arr[j4], st = parseInt(it.start_timestamp, 10) * 1000, en = parseInt(it.stop_timestamp, 10) * 1000;
                if (!st) st = Date.parse(String(it.start).replace(' ', 'T'));
                if (!en) en = Date.parse(String(it.end || it.stop).replace(' ', 'T'));
                if (st && en) out.push({ t: b64(it.title), d: b64(it.description), s: st, e: en });
              }
              end(out);
            };
            x.ontimeout = function () { end(null); };
            try { x.send(); } catch (er) { end(null); }
          })(q.shift());
        }
      }
      next();
    },
    chName: function (e, max) {
      if (!e.ch || !e.ch.length) return '';
      var n = S.ch[e.ch[0]].name.replace(/\s*\b(FHD|UHD|HD|SD|4K|H265|HEVC|\[.*?\]|\(.*?\))\s*/gi, ' ');
      n = trim(n.replace(/\s+/g, ' '));
      if (e.weak) n = '≈ ' + n;
      if (max && n.length > max) n = n.substring(0, max - 1) + '…';
      return n;
    },
    open: function (i) {
      var e = i === null || i === undefined ? null : Ev.list[i]; if (!e) return;
      if (!S.ch.length) { toast('Carregue uma lista para procurar os canais'); return; }
      if (e.ch === undefined && Ev.scanning) { toast('Ainda procurando os canais dos jogos... ' + Ev.scanDone + ' de ' + Ev.scanTotal, 4000); return; }
      var nameQ = e.q || e.home || '';
      if (!e.ch || !e.ch.length) {
        toast('Não achei o jogo na programação. Mostrando canais com "' + nameQ + '".', 5000);
        S.zone = 'items'; doSearch(nameQ); return;
      }
      var list = e.ch.slice(), title = e.home && e.away ? e.home + ' x ' + e.away : e.title;
      S.query = ''; S.groups.search = [{ name: 'Onde passa: ' + title, kind: 'live', items: list }];
      S.sec = 'search'; S.navIdx = 0; S.ep = null; S.pos.search = { c: 0, i: 0 }; S.zone = 'items';
      renderAll();
      var c = S.ch[list[0]];
      Player.play(c);
      openFullLive();
      toast((e.weak ? 'Provavelmente em ' : 'Passando em ') + c.name + (list.length > 1 ? ' · ▲▼ outros ' + (list.length - 1) + ' canais com o jogo' : ''), 6000);
    }
  };


  /* ================= atualização do app pela internet ================= */
  function verNum(v) { var p = String(v || '0').split('.'), n = 0; for (var i = 0; i < 3; i++) n = n * 1000 + (parseInt(p[i], 10) || 0); return n; }
  var Upd = {
    busy: false,
    url: function (f) { return (/^https?:/.test(f) ? f : UPD_BASE + f) + (f.indexOf('?') < 0 ? '?' : '&') + 't=' + now(); },
    check: function (manual, cb) {
      if (Upd.busy) return;
      if (UPD_BASE.indexOf('__') >= 0) { if (manual) toast('Endereço de atualização não configurado'); return; }
      Upd.busy = true;
      if (manual) toast('Procurando atualização...');
      getText(Upd.url('version.json'), 20000, function (t) {
        Upd.busy = false;
        var j = null; try { j = JSON.parse(t); } catch (e) { j = null; }
        if (!j || !j.web || !j.web.ver) { if (manual) toast('Não foi possível verificar. Confira a internet.', 4000); return; }
        if (verNum(j.web.ver) <= verNum(APP_VER)) { if (manual) toast('Você já está na versão mais nova (' + APP_VER + ')', 4000); return; }
        if (cb) cb(j); else if (manual) Upd.install(j); else toast('Nova versão ' + j.web.ver + ' disponível: Configurações → Atualizar app', 6000);
      });
    },
    install: function (j) {
      var f = j.web.abs || j.web.files || { js: 'web/app.js', css: 'web/style.css', html: 'web/body.html' }, got = {}, keys = ['js', 'css', 'html'], k = 0;
      Upd.busy = true;
      toast('Baixando a versão ' + j.web.ver + '...', 15000);
      (function next() {
        if (k === keys.length) {
          if (got.js.indexOf('NxTv') < 0 || got.html.indexOf('id="main"') < 0) { Upd.busy = false; toast('Arquivo de atualização inválido', 4000); return; }
          try {
            localStorage.setItem('nx_upd_js', got.js); localStorage.setItem('nx_upd_css', got.css); localStorage.setItem('nx_upd_html', got.html);
            localStorage.setItem('nx_upd_ver', j.web.ver); localStorage.removeItem('nx_upd_bad'); localStorage.removeItem('nx_upd_try');
          } catch (e) { Upd.busy = false; toast('Sem espaço na TV para a atualização', 4000); return; }
          toast('Versão ' + j.web.ver + ' instalada. Reiniciando...', 4000);
          Player.stop(); setTimeout(function () { location.reload(); }, 1500);
          return;
        }
        var key = keys[k++];
        getText(Upd.url(f[key]), 60000, function (t) {
          if (!t) { Upd.busy = false; toast('Falha ao baixar a atualização. Tente de novo.', 4000); return; }
          got[key] = t; next();
        });
      })();
    },
    reset: function () {
      try { localStorage.removeItem('nx_upd_js'); localStorage.removeItem('nx_upd_css'); localStorage.removeItem('nx_upd_html'); localStorage.removeItem('nx_upd_ver'); localStorage.removeItem('nx_upd_try'); } catch (e) {}
      toast('Voltando para a versão original...', 3000);
      Player.stop(); setTimeout(function () { location.reload(); }, 1200);
    }
  };

  /* ================= render ================= */
  function windowStart(sel, total, rows) {
    var st = sel - Math.floor(rows / 2);
    if (st > total - rows) st = total - rows;
    return st < 0 ? 0 : st;
  }
  function renderNav() {
    var h = '';
    for (var i = 0; i < NAV.length; i++) h += '<li class="' + (i === S.navIdx ? 'sel' : '') + '">' + ic(NAV[i].ic) + esc(NAV[i].label) + '</li>';
    $('nav-list').innerHTML = h;
    $('nav').className = 'col' + (S.zone === 'nav' ? ' active' : ''); zoneMark();
  }
  function renderCats() {
    var h = '', i, st;
    if (S.ep) {
      var ss = seasonsOf(S.ep.s);
      st = windowStart(S.ep.si, ss.length, ROWS);
      for (i = st; i < Math.min(ss.length, st + ROWS); i++) {
        var seen = seenCount(ss[i].eps), all = seen === ss[i].eps.length;
        h += '<li class="' + (i === S.ep.si ? 'sel' : '') + '">' + seasonName(ss[i].se) + ' <span class="c">(' + ss[i].eps.length + ')</span>' + (all ? '<span class="ck">✓</span>' : '') + '</li>';
      }
      $('cats-title').innerHTML = esc(S.series[S.ep.s].name);
    } else {
      var g = curGroups(), p = curPos();
      st = windowStart(p.c, g.length, ROWS);
      for (i = st; i < Math.min(g.length, st + ROWS); i++)
        h += '<li class="' + (i === p.c ? 'sel' : '') + '">' + esc(g[i].name) + (g[i].kind !== 'none' && g[i].items && g[i].kind !== 'evmsg' ? ' <span class="c">(' + g[i].items.length + ')</span>' : '') + (groupLocked(g[i]) ? lk() : '') + '</li>';
      $('cats-title').innerHTML = esc(S.sec === 'search' && S.query ? '"' + S.query + '"' : SEC_TITLE[S.sec]);
    }
    $('cat-list').innerHTML = h;
    $('cats').className = 'col' + (S.zone === 'cats' ? ' active' : ''); zoneMark();
  }
  /* ---- coluna em uso fica mais larga; nome comprido do item escolhido corre na linha ---- */
  var mqT, lastZ = '';
  function zoneMark() {
    var z = S.zone === 'nav' || S.zone === 'cats' ? S.zone : 'items';
    if (z !== lastZ) { lastZ = z; document.body.setAttribute('data-z', z); }
    clearTimeout(mqT); mqT = setTimeout(marquee, 280);
  }
  function marquee() {
    var col = document.querySelector('.col.active'); if (!col || col.id === 'nav') return;
    var li = col.querySelector('li.sel'); if (!li || li.querySelector('.cr')) return;
    var t = li.querySelector('.t') || li;
    if (hasClass(t, 'two') || t.querySelector('.mq')) return;
    var over = t.scrollWidth - t.clientWidth; if (over < 6) return;
    var d = over + 40;
    t.innerHTML = '<span class="mq" style="--d:-' + d + 'px;animation-duration:' + Math.max(5, Math.round(d / 55 + 3)) + 's">' + t.innerHTML + '</span>';
    addClass(t, 'mqon');
  }
  function renderItems() {
    var items = curItems(), kind = curKind(), sel = curIdx(), h = '', st = windowStart(sel, items.length, ROWS), i, c, s;
    for (i = st; i < Math.min(items.length, st + ROWS); i++) {
      var cls = i === sel ? 'sel' : '', inner = '';
      if (kind === 'event') {
        inner = Ev.rowHtml(Ev.list[items[i]]);
        if (Ev.list[items[i]].state === 'in') cls += ' evlive';
      } else if (locked(kind, items[i])) {
        inner = (kind === 'live' ? '<span class="n">' + S.ch[items[i]].num + '</span>' : '') + '<img style="visibility:hidden"><span class="t">Conteúdo adulto</span>' + lk();
      } else if (kind === 'series') {
        s = S.series[items[i]];
        var sc = seenCount(s.eps);
        inner = img(s.logo) + '<span class="t">' + esc(s.name) + (s.eps ? ' <span class="c">(' + s.eps.length + ' ep.' + (sc ? ' · ' + sc + ' vistos' : '') + ')</span>' : '') + '</span>' + (isFav('series', items[i]) ? '<span class="star">★</span>' : '');
      } else if (kind === 'ep') {
        c = S.ch[items[i]];
        inner = '<span class="ep">' + epLabel(c, i) + '</span><span class="t">' + esc(epTitle(c, S.series[S.ep.s], i)) + '</span>' + (isSeen(c) ? '<span class="ok">✓</span>' : '');
        if (isSeen(c)) cls += ' seen';
        if (S.cur && S.cur.url === c.url) cls += ' playing';
      } else {
        c = S.ch[items[i]];
        inner = (kind === 'live' ? '<span class="n">' + c.num + '</span>' : '') + img(c.logo) + '<span class="t">' + esc(c.name) + '</span>' + (isFav(kind, items[i]) ? '<span class="star">★</span>' : '');
        if (S.cur && S.cur.url === c.url) cls += ' playing';
      }
      h += '<li class="' + cls + '">' + inner + '</li>';
    }
    var g = curGroup();
    if (!S.ep && groupLocked(g)) h = '<li class="empty locked-msg">Categoria bloqueada.<br>Pressione OK e digite a senha para ver.</li>';
    else if (!S.ep && g && !g.items) h = '<li class="empty">' + (S.sec === 'events' ? 'Carregando os jogos de hoje...' : 'Carregando...') + '</li>';
    else if (!items.length) {
      var msg = 'Nada aqui.';
      if (S.sec === 'search') msg = S.query ? 'Nenhum resultado para "' + esc(S.query) + '".' : 'Use a pesquisa no topo da tela para encontrar canais, filmes e séries.';
      else if (S.sec === 'events') msg = Ev.msg();
      else if (S.sec === 'fav') msg = ANDROID ? 'Use o botão MENU (☰) em um canal, filme ou série para favoritar.' : 'Use o botão AMARELO ou o ⏯ (play/pausa) em um canal, filme ou série para favoritar.';
      h = '<li class="empty">' + msg + '</li>';
    }
    $('item-list').innerHTML = h;
    var title = S.ep ? S.series[S.ep.s].name + ' · ' + seasonName(seasonsOf(S.ep.s)[S.ep.si].se) : (g ? g.name : '');
    $('items-title').innerHTML = esc(title);
    $('item-count').innerHTML = items.length ? (sel + 1) + ' / ' + items.length : '';
    $('items').className = 'col' + (S.zone === 'items' ? ' active' : ''); zoneMark();
  }
  function epTitle(c, ser, i) {
    var t = c.name;
    if (norm(t).indexOf(ser.n) === 0) t = t.substring(ser.name.length);
    t = trim(t.replace(/^[\s\-:|.]+/, ''));
    var m = /^.*?(?:[ST]\d{1,2}[\s._\-]*EP?\d{1,4}|\b\d{1,2}x\d{1,3}\b)[\s\-:|.]*/i.exec(t);
    if (m) t = trim(t.substring(m[0].length));
    return t || ('Episódio ' + (c.ep || i + 1));
  }
  function img(src) { return src ? '<img src="' + esc(src) + '" onerror="this.style.visibility=\'hidden\'">' : '<img style="visibility:hidden">'; }


  /* ================= sinopse e gênero de filmes e séries (servidor Xtream) ================= */
  function infoOf(o) {
    if (!o) return null;
    var yr = String(o.releasedate || o.releaseDate || o.release_date || o.air_date || o.year || '').substring(0, 4);
    if (!/^\d{4}$/.test(yr)) yr = '';
    var rt = parseFloat(o.rating_5based ? o.rating_5based * 2 : o.rating); if (!(rt > 0)) rt = 0;
    var du = o.duration || '';
    if (!du && o.duration_secs) { var mn = Math.round(o.duration_secs / 60); du = mn >= 60 ? Math.floor(mn / 60) + 'h' + pad2(mn % 60) : mn + ' min'; }
    else if (/^\d\d:\d\d:\d\d$/.test(du)) { var hh = parseInt(du.substring(0, 2), 10), mm2 = parseInt(du.substring(3, 5), 10); du = hh ? hh + 'h' + pad2(mm2) : mm2 + ' min'; }
    var plot = trim(String(o.plot || o.description || o.overview || '').replace(/\s+/g, ' '));
    return { plot: plot, genre: trim(String(o.genre || '')), year: yr, rating: rt ? (Math.round(rt * 10) / 10) : 0, dur: du };
  }
  var infoT = null;
  // busca os detalhes do item selecionado (só quando a seleção para por meio segundo)
  function wantInfo(kind, it) {
    clearTimeout(infoT);
    if (!S.api || it === null) return;
    if (kind === 'movie') {
      var c = S.ch[it]; if (!c || c.info !== undefined || c.type !== 'movie') return;
      var id = streamId(c.url); if (!id) { c.info = null; return; }
      infoT = setTimeout(function () {
        if (c.info !== undefined || c.infoLoading) return;
        c.infoLoading = true;
        getText(apiUrl(S.api, 'get_vod_info', '&vod_id=' + id), 15000, function (t) {
          c.infoLoading = false;
          var d = null; try { d = JSON.parse(t); } catch (e) { d = null; }
          c.info = d && d.info ? infoOf(d.info) : null;
          if (S.mode === 'main' && curKind() === 'movie' && curItem() === it) renderSide();
          if (Det.open && Det.it === it) Det.refresh();
        });
      }, 450);
    } else if (kind === 'series') {
      var se = S.series[it]; if (!se || se.eps || se.loading || !se.id) return;
      infoT = setTimeout(function () {
        if (se.eps || se.loading) return;
        loadSeriesInfo(it, function () {}, true);
      }, 450);
    }
  }
  function genreChips(g, fallback) {
    var parts = (g || fallback || '').split(/\s*[,\/|]\s*/), h = '', n = 0;
    for (var i = 0; i < parts.length && n < 3; i++) if (trim(parts[i])) { h += '<span class="gch">' + esc(trim(parts[i])) + '</span>'; n++; }
    return h;
  }
  function infoLine(inf) {
    if (!inf) return '';
    var a = [];
    if (inf.year) a.push(inf.year);
    if (inf.rating) a.push('★ ' + String(inf.rating).replace('.', ','));
    if (inf.dur) a.push(inf.dur);
    return a.join(' · ');
  }

  var resumeT;
  function renderSide() {
    var kind = curKind(), livePanel = (kind === 'live' || kind === 'none') && S.sec !== 'events';
    setClass(document.body, 'livepanel', livePanel);
    setClass(document.body, 'livesec', S.sec === 'live');
    if (S.sec === 'events') {
      hide($('live-panel')); hide($('info-panel')); show($('event-panel'));
      if (Player.active && S.mode === 'main') Player.stop();
      Ev.side(curItem());
      renderHints('event');
      return;
    }
    hide($('event-panel'));
    if (livePanel) {
      show($('live-panel')); hide($('info-panel'));
      if (!Player.active && S.live && S.mode === 'main' && !(S.live.adult && !S.unlocked)) {
        clearTimeout(resumeT);
        resumeT = setTimeout(function () {
          if (S.mode === 'main' && hasClass(document.body, 'livepanel') && !Player.active && S.live) Player.play(S.live);
        }, 700);
      }
    } else {
      hide($('live-panel')); show($('info-panel'));
      if (Player.active && S.mode === 'main') Player.stop();
      var it = curItem(), name = '', meta = '', logo = '', gen = '', plot = '', ln = '', wait = false;
      if (it !== null && locked(kind, it)) { name = 'Conteúdo adulto'; meta = 'Bloqueado por senha'; }
      else if (it !== null) {
        if (kind === 'series') {
          var s = S.series[it], ss = seasonsOf(it);
          name = s.name; logo = s.logo;
          meta = s.eps ? ss.length + (ss.length > 1 ? ' temporadas' : ' temporada') + ' · ' + s.eps.length + ' episódios' + (seenCount(s.eps) ? ' · ' + seenCount(s.eps) + ' vistos' : '') : 'OK para ver os episódios';
          gen = genreChips(s.info && s.info.genre, s.group); ln = infoLine(s.info); plot = s.info ? s.info.plot : '';
          wait = !s.eps && !!S.api && !!s.id;
        } else if (kind === 'ep') {
          var c = S.ch[it], ser = S.series[S.ep.s];
          name = (c.se ? 'T' + c.se + ' · ' : '') + epLabel(c, S.ep.i) + ' — ' + epTitle(c, ser, S.ep.i);
          logo = c.logo || ser.logo; meta = ser.name + (isSeen(c) ? ' · ✓ Já assistido' : '');
          gen = genreChips(ser.info && ser.info.genre, ser.group); ln = infoLine(c.info);
          plot = c.info && c.info.plot ? c.info.plot : (ser.info ? ser.info.plot : '');
        } else {
          var m = S.ch[it]; name = m.name; logo = m.logo; meta = '';
          gen = genreChips(m.info && m.info.genre, m.group); ln = infoLine(m.info); plot = m.info ? m.info.plot : '';
          wait = m.info === undefined && !!S.api;
        }
      }
      if (ln) meta = meta ? ln + ' · ' + meta : ln;
      $('info-name').innerHTML = esc(name); $('info-meta').innerHTML = esc(meta);
      $('info-genre').innerHTML = gen;
      $('info-plot').innerHTML = plot ? esc(plot) : (wait ? '<span class="dim">Carregando sinopse...</span>' : (it !== null && S.api && (kind === 'movie' || kind === 'series') ? '<span class="dim">Sem sinopse</span>' : ''));
      if (it !== null && !locked(kind, it)) wantInfo(kind, it);
      var pe = $('info-plot'); setClass($('info-more'), 'hidden', !(plot && pe.scrollHeight > pe.clientHeight + 4));
      var p = $('info-poster'); p.style.visibility = logo ? 'visible' : 'hidden'; if (logo && p.getAttribute('src') !== logo) p.src = logo;
    }
    renderHints(kind);
  }
  function renderHints(kind) {
    var h = '';
    if (kind === 'live' || kind === 'none') h = '<div><span class="k">OK</span>assistir · OK de novo = tela cheia</div>' + (ANDROID ? '<div><span class="k">⏪⏩</span>pular página · trocar canal</div>' : '<div><span class="k">0-9</span>número do canal</div>');
    else if (kind === 'movie') h = '<div><span class="k">OK</span>assistir o filme</div>';
    else if (kind === 'series') h = '<div><span class="k">OK</span>ver temporadas e episódios</div>';
    if (kind === 'movie' || kind === 'series' || kind === 'ep') h += '<div><span class="k">▶</span>sinopse em tela cheia</div>';
    else if (kind === 'event') { $('hints').innerHTML = '<div><span class="k">OK</span>abrir o canal que está passando o jogo</div><div>Horários de Brasília · placar atualiza sozinho</div>'; return; }
    else if (kind === 'ep') h = '<div><span class="k">OK</span>assistir · <span style="color:#22d36b;font-weight:bold">✓</span> = já assistido</div><div><span class="k">◀</span>temporadas · VOLTAR séries</div>';
    if (ANDROID) h += '<div><span class="k">☰</span>favoritar</div><div><span class="k">▲</span>no topo: pesquisa e configurações</div>';
    else h += '<div><span class="k y">■</span>ou <span class="k">⏯</span>favoritar <span class="k r" style="margin-left:18px">■</span>pesquisar</div><div><span class="k b">■</span>configurações <span class="k" style="margin-left:18px">▲</span>topo: pesquisa</div>';
    $('hints').innerHTML = h;
  }
  function renderNow() {
    var c = S.live; if (!c) return;
    $('now-name').innerHTML = esc(c.name);
    $('now-meta').innerHTML = esc(c.group) + ' · Canal ' + c.num;
    var im = $('now-logo'); im.style.visibility = c.logo ? 'visible' : 'hidden'; if (c.logo) im.src = c.logo;
  }
  function renderHeader() {
    setClass($('search'), 'focus', S.zone === 'header' && S.hd === 0);
    setClass($('gear'), 'focus', S.zone === 'header' && S.hd === 1);
  }
  function renderAll() { Cat.maybeStart(); renderHeader(); renderNav(); renderCats(); renderItems(); renderSide(); }
  function clock() { var d = new Date(); $('clock').innerHTML = pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }

  /* ================= telas ================= */
  function showScreen(id) {
    var ids = ['splash', 'main', 'settings', 'editor'];
    for (var i = 0; i < ids.length; i++) if (ids[i] === id) show($(ids[i])); else hide($(ids[i]));
  }
  function splash(title, sub, pct, error) {
    S.mode = 'splash'; showScreen('splash');
    rmClass(document.body, 'fullscreen');
    $('sp-title').innerHTML = esc(title); $('sp-sub').innerHTML = esc(sub || '');
    $('sp-fill').style.width = (pct || 0) + '%';
    if (error) { hide($('sp-spin')); hide($('sp-bar')); show($('sp-btns')); S.formIdx = 0; formFocus('splash'); }
    else { show($('sp-spin')); show($('sp-bar')); hide($('sp-btns')); }
  }

  var pendingCache = null, cacheT;
  function cacheOn() { return !load('nx_nocache', false); }
  function saveCacheLater() {
    clearTimeout(cacheT);
    if (!pendingCache || !cacheOn()) { pendingCache = null; return; }
    cacheT = setTimeout(function () {
      var pc = pendingCache; pendingCache = null;
      if (!pc || pc.text.length > 40000000) return; // listas gigantes não são salvas
      var blob = null;
      try { blob = new Blob([pc.text], { type: 'text/plain' }); } catch (e) { blob = null; }
      if (!blob) return;
      save('nx_cache_try', 1);
      DB.put(pc.key, { url: pc.url, t: now(), blob: blob }, function (ok) {
        try { localStorage.removeItem('nx_cache_try'); } catch (e) {}
        if (!ok) save('nx_nocache', true);
      });
    }, 15000);
  }
  function readCache(L, url, cb) { readCacheKey('list_' + L.id, url, cb); }
  function readCacheKey(key, url, cb) {
    if (!cacheOn()) { cb(null); return; }
    DB.get(key, function (rec) {
      if (!rec || rec.url !== url || now() - rec.t > CACHE_TTL) { cb(null); return; }
      if (rec.text) { cb(rec.text); return; }
      if (!rec.blob) { cb(null); return; }
      try {
        var fr = new FileReader();
        fr.onload = function () { cb(fr.result || null); };
        fr.onerror = function () { cb(null); };
        fr.readAsText(rec.blob);
      } catch (e) { cb(null); }
    });
  }

  function startLoad(force) {
    S.pref = load('nx_pref2_' + S.activeId, null);
    Player.stop(); S.cur = null; S.live = null; clearInterval(epgT); pendingCache = null; clearTimeout(cacheT);
    var L = activeList();
    if (!L) { openSettings(); return; }
    resetData();
    var cr = credsOf(L);
    if (cr) { loadApi(L, cr, force); return; } // servidor Xtream: carrega por partes
    var url = buildUrl(L);
    if (force) { download(L, url); return; }
    splash('Abrindo lista', L.name, 5);
    readCache(L, url, function (text) {
      if (text) parseAndOpen(L, text, function () { download(L, url); });
      else download(L, url);
    });
  }
  function download(L, url) {
    splash('Baixando lista', L.name + ' · conectando...', 3);
    var x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.timeout = 120000;
    x.onprogress = function (e) {
      var pct = e.lengthComputable ? Math.round(e.loaded * 55 / e.total) : 30;
      splash('Baixando lista', L.name + ' · ' + fmtMB(e.loaded), 3 + pct);
    };
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 400 && x.responseText) {
        var txt = x.responseText;
        x.onreadystatechange = null; x.onprogress = null; x = null;
        if (cacheOn()) pendingCache = { key: 'list_' + L.id, url: url, text: txt };
        parseAndOpen(L, txt, null);
      } else splash('Não foi possível carregar a lista', 'Erro ' + x.status + ' · verifique a internet e o link da lista', 0, true);
    };
    x.ontimeout = function () { splash('Tempo esgotado', 'O servidor da lista não respondeu', 0, true); };
    try { x.send(); } catch (e) { splash('Link inválido', 'Confira o link em Configurações', 0, true); }
  }
  function parseAndOpen(L, txt, onFail) {
    splash('Organizando canais', L.name, 60);
    save('nx_boot', 1); // se a TV fechar o app aqui, na próxima vez o cache é desligado
    var prog = function (base, span) { return function (f) { $('sp-sub').innerHTML = esc(L.name + ' · ' + Math.round((base + f * span))) + '%'; $('sp-fill').style.width = (60 + Math.round((base + f * span) * 0.38)) + '%'; }; };
    setTimeout(function () {
      parseAsync(txt, prog(0, 50), function (list) {
        txt = null;
        if (!list.length) {
          try { localStorage.removeItem('nx_boot'); } catch (e) {}
          if (onFail) { onFail(); return; }
          splash('Lista vazia', 'O link não trouxe nenhum canal. Confira em Configurações.', 0, true); return;
        }
        $('sp-title').innerHTML = 'Separando canais, filmes e séries';
        buildIndexAsync(list, prog(50, 50), function () {
          try { localStorage.removeItem('nx_boot'); } catch (e) {}
          openMain(true); saveCacheLater();
        });
      });
    }, 20);
  }

  function openMain(first) {
    S.mode = 'main'; showScreen('main'); rmClass(document.body, 'fullscreen');
    hide($('osd')); hide($('vod-osd')); hide($('fs-load'));
    if (first) {
      S.sec = 'live'; S.navIdx = 1; S.ep = null; S.zone = 'items'; S.pos = newPos();
      $('search-in').value = '';
      var last = load('nx_last', null), lv = allLive().items; S.pos.live.c = allLiveIdx();
      if (!lv.length) S.zone = 'nav';
      for (var i = 0; last && i < lv.length; i++) if (S.ch[lv[i]].url === last) { if (!S.ch[lv[i]].adult) { S.pos.live.i = i; S.live = S.ch[lv[i]]; } break; }
    }
    renderAll(); renderNow();
    setTimeout(function () { Player.applyRect(); if (S.live && !Player.active && hasClass(document.body, 'livepanel')) Player.play(S.live); }, 50);
  }
  function openFullLive() {
    if (!S.live) return;
    var kind = curKind(), items = curItems();
    S.zap = kind === 'live' ? { items: items, sec: S.sec, c: curPos().c } : { items: allLive().items, sec: 'live', c: allLiveIdx() };
    recLiveWatch();
    S.mode = 'full'; S.fullKind = 'live'; addClass(document.body, 'fullscreen');
    Player.applyRect(); showOSD();
  }


  /* ================= continuar de onde parou (filmes e episódios) ================= */
  var Res = {
    map: null,
    key: function (c) { return c.type === 'series' ? wKey(c) : 'm:' + norm(c.name); },
    all: function () { if (!Res.map) Res.map = load('nx_resume', {}) || {}; return Res.map; },
    get: function (c) { var r = c ? Res.all()[Res.key(c)] : null; return r && r.t > 30000 ? r : null; },
    save: function (c) {
      if (!c || S.fullKind !== 'vod' || !Player.active) return;
      var t = Player.times(), m = Res.all(), k = Res.key(c);
      if (!(t[1] > 0) || !(t[0] >= 0)) return;
      if (t[0] < 30000 || t[0] > t[1] * 0.95) { if (m[k]) { delete m[k]; save('nx_resume', m); } return; }
      m[k] = { t: Math.floor(t[0]), d: Math.floor(t[1]), at: now() };
      // guarda só os 150 mais recentes
      var ks = []; for (var x in m) ks.push(x);
      if (ks.length > 150) { ks.sort(function (a, b) { return m[a].at - m[b].at; }); for (var i = 0; i < ks.length - 150; i++) delete m[ks[i]]; }
      save('nx_resume', m);
    },
    done: function (c) { var m = Res.all(), k = c ? Res.key(c) : ''; if (m[k]) { delete m[k]; save('nx_resume', m); } },
    // depois que o vídeo começa, pula para o ponto salvo
    seekWhenReady: function (c, ms) {
      var tries = 0;
      clearInterval(Res.seekT);
      Res.seekT = setInterval(function () {
        tries++;
        if (S.cur !== c || S.fullKind !== 'vod' || tries > 60) { clearInterval(Res.seekT); return; }
        var t = Player.times();
        if (t[1] > 0 && Player.isPlaying()) {
          clearInterval(Res.seekT);
          Player.seekAbs(ms);
          toast('Continuando de ' + fmtTime(ms), 3000);
        }
      }, 500);
    }
  };
  // caixa de pergunta (Continuar / Começar do início)
  var Ask = {
    open: false, sel: 0, cb: null,
    show: function (title, sub, btns, cb) {
      Ask.open = true; Ask.sel = 0; Ask.cb = cb;
      $('ask-title').innerHTML = esc(title); $('ask-sub').innerHTML = esc(sub);
      var h = ''; for (var i = 0; i < btns.length; i++) h += '<div class="ask-btn' + (i === 0 ? ' sel' : '') + '">' + esc(btns[i]) + '</div>';
      $('ask-btns').innerHTML = h; show($('ask'));
    },
    close: function (r) { Ask.open = false; hide($('ask')); var cb = Ask.cb; Ask.cb = null; if (cb) cb(r); },
    key: function (k) {
      var b = $('ask-btns').children;
      if (k === K.LEFT || k === K.UP) Ask.sel = Math.max(0, Ask.sel - 1);
      else if (k === K.RIGHT || k === K.DOWN) Ask.sel = Math.min(b.length - 1, Ask.sel + 1);
      else if (k === K.ENTER) { Ask.close(Ask.sel); return; }
      else if (k === K.BACK || k === K.ESC) { Ask.close(-1); return; }
      for (var i = 0; i < b.length; i++) setClass(b[i], 'sel', i === Ask.sel);
    }
  };


  /* ================= sinopse em tela cheia ================= */
  var Det = {
    open: false, sel: 0, kind: '', it: null,
    show: function () {
      var it = curItem(), kind = curKind();
      if (it === null || (kind !== 'movie' && kind !== 'series' && kind !== 'ep')) return;
      if (locked(kind, it)) { needPin(function () { Det.show(); }); return; }
      Det.kind = kind; Det.it = it; Det.open = true; Det.sel = 0;
      Det.fill(); show($('det')); $('det-plot').scrollTop = 0;
    },
    fill: function () {
      var kind = Det.kind, it = Det.it, name, logo, gen, ln, plot, wait = false;
      if (kind === 'series') {
        var se = S.series[it]; name = se.name; logo = se.logo; gen = genreChips(se.info && se.info.genre, se.group); ln = infoLine(se.info); plot = se.info ? se.info.plot : '';
        wait = !se.eps && !!S.api && !!se.id;
        if (se.eps) { var ss = seasonsOf(it); ln = (ln ? ln + ' · ' : '') + ss.length + (ss.length > 1 ? ' temporadas' : ' temporada') + ' · ' + se.eps.length + ' episódios'; }
      } else if (kind === 'ep') {
        var c = S.ch[it], ser = S.series[S.ep.s];
        name = ser.name + ' · ' + (c.se ? 'T' + c.se + ' · ' : '') + epLabel(c, S.ep.i) + ' — ' + epTitle(c, ser, S.ep.i);
        logo = c.logo || ser.logo; gen = genreChips(ser.info && ser.info.genre, ser.group); ln = infoLine(c.info);
        plot = c.info && c.info.plot ? c.info.plot : (ser.info ? ser.info.plot : '');
      } else {
        var mv = S.ch[it]; name = mv.name; logo = mv.logo; gen = genreChips(mv.info && mv.info.genre, mv.group); ln = infoLine(mv.info); plot = mv.info ? mv.info.plot : '';
        wait = mv.info === undefined && !!S.api;
      }
      $('det-name').innerHTML = esc(name); $('det-genre').innerHTML = gen; $('det-meta').innerHTML = esc(ln || '');
      $('det-plot').innerHTML = plot ? esc(plot) : '<span class="dim">' + (wait ? 'Carregando sinopse...' : 'Sem sinopse') + '</span>';
      var p = $('det-poster'); p.style.visibility = logo ? 'visible' : 'hidden'; if (logo && p.getAttribute('src') !== logo) p.src = logo;
      var b1 = kind === 'series' ? 'Ver episódios' : 'Assistir';
      if (kind !== 'series') { var cc = S.ch[it], r = Res.get(cc); if (r) b1 = 'Assistir · parou em ' + fmtTime(r.t); }
      var lbl = [b1, 'Voltar'], h = '';
      for (var i = 0; i < 2; i++) h += '<div class="ask-btn' + (i === Det.sel ? ' sel' : '') + '">' + esc(lbl[i]) + '</div>';
      $('det-btns').innerHTML = h;
      if (wait) wantInfo(kind, it);
    },
    close: function () { Det.open = false; hide($('det')); renderAll(); },
    key: function (k) {
      var pl = $('det-plot');
      if (k === K.LEFT) Det.sel = 0;
      else if (k === K.RIGHT) Det.sel = 1;
      else if (k === K.UP || k === K.CHUP || k === K.PGUP) pl.scrollTop = Math.max(0, pl.scrollTop - 150);
      else if (k === K.DOWN || k === K.CHDOWN || k === K.PGDN) pl.scrollTop = pl.scrollTop + 150;
      else if (k === K.BACK || k === K.ESC || k === K.INFO) { Det.close(); return; }
      else if (k === K.ENTER || k === K.PLAY || k === K.PLAYPAUSE) {
        if (Det.sel === 1 && k === K.ENTER) { Det.close(); return; }
        Det.open = false; hide($('det'));
        if (curItem() === Det.it) enterItem(); else renderAll();
        return;
      }
      var b = $('det-btns').children; for (var i = 0; i < b.length; i++) setClass(b[i], 'sel', i === Det.sel);
    },
    refresh: function () { if (Det.open) Det.fill(); }
  };

  var seenT, resSaveT;
  function startVodItem(c) {
    var r = Res.get(c);
    if (r) {
      S.cur = c; Player.stop();
      var nm = c.type === 'series' && S.series[c.sid] ? S.series[c.sid].name + ' · ' + (c.se ? 'T' + c.se + ' ' : '') + epLabel(c, 0) : c.name;
      Ask.show(nm, 'Você parou em ' + fmtTime(r.t) + (r.d ? ' de ' + fmtTime(r.d) : ''), ['Continuar de ' + fmtTime(r.t), 'Começar do início'], function (b) {
        if (b < 0) { closeFull(); return; }
        if (b === 1) Res.done(c);
        playVodNow(c, b === 0 ? r.t : 0);
      });
      return;
    }
    playVodNow(c, 0);
  }
  function playVodNow(c, startMs) {
    Player.play(c); showVodOSD(); recVod(c);
    if (startMs > 0) Res.seekWhenReady(c, startMs);
    clearInterval(resSaveT); resSaveT = setInterval(function () { if (S.cur === c) Res.save(c); }, 10000);
    clearTimeout(seenT);
    if (c.type === 'series') seenT = setTimeout(function () { if (S.cur === c && S.mode === 'full') markSeen(c); }, 60000);
  }
  function playVod(list, pos) {
    S.vod = { list: list, pos: pos };
    S.mode = 'full'; S.fullKind = 'vod'; addClass(document.body, 'fullscreen');
    hide($('osd'));
    startVodItem(S.ch[list[pos]]);
  }
  function vodEnded() {
    Res.done(S.cur); clearInterval(resSaveT);
    markSeen(S.cur);
    if (S.vod && S.vod.pos < S.vod.list.length - 1 && S.cur && S.cur.type === 'series') { vodJump(1); return; }
    closeFull();
  }
  function vodJump(d) {
    var v = S.vod; if (!v) return;
    var np = v.pos + d;
    if (np < 0 || np >= v.list.length) { toast(d > 0 ? 'Último episódio' : 'Primeiro episódio'); return; }
    Res.save(S.cur);
    v.pos = np;
    var c = S.ch[v.list[np]];
    if (S.ep && c.type === 'series') {
      var ss = seasonsOf(S.ep.s);
      for (var a = 0; a < ss.length; a++) for (var b = 0; b < ss[a].eps.length; b++) if (ss[a].eps[b] === v.list[np]) { S.ep.si = a; S.ep.i = b; }
    }
    startVodItem(c);
  }
  function closeFull() {
    var wasVod = S.fullKind === 'vod';
    if (wasVod) { Res.save(S.cur); clearInterval(resSaveT); clearInterval(Res.seekT); }
    hide($('osd')); hide($('vod-osd')); clearInterval(vodT); clearTimeout(seenT);
    S.fullKind = null;
    if (wasVod) { Player.stop(); S.cur = S.live; }
    openMain(false);
  }

  var osdT, vodT, vodHideT;
  function showOSD() {
    var c = S.live; if (!c) return;
    $('osd-num').innerHTML = c.num; $('osd-name').innerHTML = esc(c.name); $('osd-group').innerHTML = esc(c.group);
    var im = $('osd-logo'); im.style.display = c.logo ? '' : 'none'; if (c.logo) im.src = c.logo;
    show($('osd')); clearTimeout(osdT); osdT = setTimeout(function () { hide($('osd')); }, 4500);
  }
  function showVodOSD() {
    var c = S.cur; if (!c) return;
    var t = c.name;
    if (c.type === 'series' && S.series[c.sid]) t = S.series[c.sid].name + ' · ' + (c.se ? 'T' + c.se + ' ' : '') + epLabel(c, 0);
    $('vod-title').innerHTML = esc(t);
    show($('vod-osd')); updVod();
    clearInterval(vodT); vodT = setInterval(updVod, 1000);
    clearTimeout(vodHideT); vodHideT = setTimeout(function () { if (!Player.isPaused()) { hide($('vod-osd')); clearInterval(vodT); } }, 5000);
  }
  function updVod() {
    var t = Player.times();
    $('vod-time').innerHTML = fmtTime(t[0]) + ' / ' + (t[1] > 0 ? fmtTime(t[1]) : '--:--');
    $('vod-fill').style.width = (t[1] > 0 ? Math.min(100, t[0] * 100 / t[1]) : 0) + '%';
    $('vod-state').innerHTML = Player.isPaused() ? 'PAUSADO' : '';
    if (t[1] > 0 && t[0] / t[1] > 0.8) markSeen(S.cur);
  }

  /* ================= configurações ================= */
  function openSettings() {
    if (S.mode === 'full') { hide($('osd')); hide($('vod-osd')); rmClass(document.body, 'fullscreen'); }
    Player.stop(); S.mode = 'settings'; showScreen('settings');
    var h = '';
    for (var i = 0; i < S.lists.length; i++) {
      var L = S.lists[i], act = L.id === S.activeId;
      h += '<li class="focusable' + (act ? ' act' : '') + '" data-i="' + i + '">' + (act ? '<span class="dot"></span>' : '') +
        '<span class="nm">' + esc(L.name) + (act ? ' (em uso)' : '') + '</span><span class="lt">' + (L.type === 'xtream' ? 'Xtream' : 'M3U') + '</span></li>';
    }
    h += '<li class="focusable mut" data-a="add">+ Adicionar nova lista</li>';
    if (S.lists.length) h += '<li class="focusable mut" data-a="reload">Atualizar lista em uso (baixar de novo)</li>';
    h += '<li class="focusable mut" data-a="appupd"><span class="nm">Atualizar app (procurar versão nova)</span><span class="lt">VERSÃO ' + APP_VER + '</span></li>';
    h += '<li class="focusable mut" data-a="pin"><span class="nm">Senha do conteúdo adulto · alterar</span><span class="lt">' + (S.pin === '0000' ? 'padrão 0000' : '••••') + '</span></li>';
    if (!ANDROID) h += '<li class="focusable mut" data-a="engine"><span class="nm">Player de vídeo</span><span class="lt">' + (S.engine === 'avplay' ? 'SAMSUNG (AVPlay)' : 'PADRÃO (HTML5)') + '</span></li>';
    h += '<li class="focusable mut" data-a="order"><span class="nm">Ordem de canais, filmes e séries</span><span class="lt">' + (S.order === 'az' ? 'ALFABÉTICA' : 'IGUAL À LISTA') + '</span></li>';
    h += '<li class="focusable mut" data-a="cache"><span class="nm">Abertura rápida (lista salva na TV)</span><span class="lt">' + (cacheOn() ? 'LIGADA' : 'DESLIGADA') + '</span></li>';
    if (S.unlocked) h += '<li class="focusable mut" data-a="lock">Bloquear conteúdo adulto agora</li>';
    if (window.NX_UPD) h += '<li class="focusable mut" data-a="appreset"><span class="nm">Voltar para a versão original do app</span><span class="lt">' + (window.NX_FACTORY || '') + '</span></li>';
    if (S.ch.length) h += '<li class="focusable mut" data-a="back">Voltar para a TV</li>';
    $('lists').innerHTML = h;
    S.formIdx = 0; formFocus('settings');
  }
  function settingsEnter(el) {
    var a = el.getAttribute('data-a');
    if (a === 'add') openEditor(-1);
    else if (a === 'reload') startLoad(true);
    else if (a === 'pin') changePin();
    else if (a === 'engine') {
      S.engine = S.engine === 'avplay' ? 'html5' : 'avplay'; save('nx_engine', S.engine);
      S.pref = null; S.pstat = null; for (var z = 0; z < S.lists.length; z++) { try { localStorage.removeItem('nx_pref2_' + S.lists[z].id); localStorage.removeItem('nx_pst2_' + S.lists[z].id); } catch (e) {} }
      toast(S.engine === 'avplay' ? 'Player Samsung (AVPlay)' : 'Player padrão (HTML5)');
      var kp = S.formIdx; openSettings(); S.formIdx = kp; formFocus('settings');
    }
    else if (a === 'order') {
      S.order = S.order === 'az' ? 'list' : 'az'; save('nx_order', S.order);
      toast(S.order === 'az' ? 'Ordem alfabética' : 'Ordem igual à da lista');
      if (S.lists.length) startLoad(); else openSettings();
    }
    else if (a === 'cache') {
      if (cacheOn()) { save('nx_nocache', true); for (var q = 0; q < S.lists.length; q++) { DB.del('list_' + S.lists[q].id); DB.del('api_' + S.lists[q].id); } toast('Abertura rápida desligada'); }
      else { try { localStorage.removeItem('nx_nocache'); } catch (e) {} toast('Abertura rápida ligada'); }
      var keep = S.formIdx; openSettings(); S.formIdx = keep; formFocus('settings');
    }
    else if (a === 'lock') { S.unlocked = false; toast('Conteúdo adulto bloqueado'); openSettings(); }
    else if (a === 'appupd') Upd.check(true);
    else if (a === 'appreset') Upd.reset();
    else if (a === 'back') backFromSettings();
    else openEditor(parseInt(el.getAttribute('data-i'), 10));
  }
  function backFromSettings() {
    if (S.ch.length) openMain(false);
    else if (activeList()) startLoad();
    else toast('Adicione uma lista para começar');
  }
  function openEditor(idx) {
    S.mode = 'editor'; S.edIdx = idx; S.delArm = 0; showScreen('editor');
    var L = idx >= 0 ? S.lists[idx] : { name: '', type: 'm3u' };
    $('ed-title').innerHTML = idx >= 0 ? 'Editar lista' : 'Nova lista';
    $('in-name').value = L.name || ''; $('in-url').value = L.url || '';
    $('in-server').value = L.server || ''; $('in-user').value = L.user || ''; $('in-pass').value = L.pass || '';
    setTab(L.type === 'xtream' ? 'xtream' : 'm3u');
    $('btn-save').innerHTML = idx >= 0 && S.lists[idx].id !== S.activeId ? 'Salvar e usar esta lista' : 'Salvar e carregar';
    $('btn-del').innerHTML = 'Excluir lista';
    if (idx >= 0) show($('btn-del')); else hide($('btn-del'));
    $('ed-msg').innerHTML = '';
    S.formIdx = 0; formFocus('editor');
  }
  function setTab(t) {
    S.edTab = t;
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) setClass(tabs[i], 'on', tabs[i].getAttribute('data-tab') === t);
    if (t === 'm3u') { show($('pane-m3u')); hide($('pane-xtream')); } else { hide($('pane-m3u')); show($('pane-xtream')); }
  }
  function editorSave() {
    var name = trim($('in-name').value), L;
    if (S.edTab === 'm3u') {
      var u = trim($('in-url').value);
      if (!/^https?:\/\//i.test(u)) { $('ed-msg').innerHTML = 'Digite um link começando com http:// ou https://'; return; }
      L = { type: 'm3u', url: u };
    } else {
      var s = trim($('in-server').value), us = trim($('in-user').value), p = trim($('in-pass').value);
      if (!s || !us || !p) { $('ed-msg').innerHTML = 'Preencha servidor, usuário e senha'; return; }
      L = { type: 'xtream', server: s, user: us, pass: p };
    }
    L.name = name || ('Lista ' + (S.lists.length + (S.edIdx >= 0 ? 0 : 1)));
    if (S.edIdx >= 0) { L.id = S.lists[S.edIdx].id; S.lists[S.edIdx] = L; }
    else { L.id = 'l' + now(); S.lists.push(L); }
    S.activeId = L.id; saveLists();
    S.ch = []; startLoad();
  }
  function editorDelete() {
    if (now() - S.delArm > 3000) { S.delArm = now(); $('btn-del').innerHTML = 'Confirmar exclusão?'; $('ed-msg').innerHTML = 'Pressione OK de novo para excluir.'; return; }
    var L = S.lists[S.edIdx], wasActive = L.id === S.activeId;
    S.lists.splice(S.edIdx, 1); DB.del('list_' + L.id); DB.del('api_' + L.id);
    if (wasActive) { S.activeId = S.lists.length ? S.lists[0].id : null; S.ch = []; }
    saveLists(); toast('Lista excluída');
    openSettings();
  }

  /* navegação genérica de formulários */
  function formItems(root) {
    var all = $(root).querySelectorAll('.focusable'), out = [];
    for (var i = 0; i < all.length; i++) if (all[i].offsetParent !== null) out.push(all[i]);
    return out;
  }
  function formFocus(root) {
    var it = formItems(root);
    if (!it.length) return;
    if (S.formIdx >= it.length) S.formIdx = it.length - 1;
    if (S.formIdx < 0) S.formIdx = 0;
    for (var i = 0; i < it.length; i++) rmClass(it[i], 'focus');
    var el = it[S.formIdx]; addClass(el, 'focus');
    var ul = el.parentNode;
    if (ul && ul.id === 'lists') {
      if (el.offsetTop + el.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTop = el.offsetTop + el.offsetHeight - ul.clientHeight;
      if (el.offsetTop < ul.scrollTop) ul.scrollTop = el.offsetTop;
    }
  }
  function rowOf(x) { return hasClass(x, 'inrow') ? x.parentNode : x; }
  function formKey(root, k, e, onEnter, onBack) {
    var it = formItems(root), el = it[S.formIdx], ae = document.activeElement;
    if (ae && ae.tagName === 'INPUT') {
      if (k === K.ENTER || k === K.DONE || k === K.CANCEL || k === K.BACK || k === K.ESC || k === K.UP || k === K.DOWN) {
        e.preventDefault(); ae.blur();
        S.formIdx += k === K.UP ? -1 : 1; formFocus(root);
      }
      return;
    }
    e.preventDefault();
    if (!el) { if (k === K.BACK || k === K.ESC) onBack(); return; }
    if (k === K.LEFT || k === K.RIGHT) {
      var ni = S.formIdx + (k === K.LEFT ? -1 : 1);
      if (it[ni] && rowOf(it[ni]) === rowOf(el)) { S.formIdx = ni; formFocus(root); }
    } else if (k === K.UP || k === K.DOWN) {
      var d = k === K.UP ? -1 : 1, j = S.formIdx;
      while (it[j + d] && rowOf(it[j + d]) === rowOf(el)) j += d;
      j += d;
      if (k === K.UP) while (it[j - 1] && it[j] && rowOf(it[j - 1]) === rowOf(it[j])) j--;
      if (it[j]) { S.formIdx = j; formFocus(root); }
    } else if (k === K.ENTER) {
      if (el.tagName === 'INPUT') focusIn(el); else onEnter(el);
    } else if (k === K.BACK || k === K.ESC || k === K.BKSP) onBack();
  }

  /* ================= navegação principal ================= */
  function goSection(idx) { S.navIdx = idx; S.sec = NAV[idx].id; S.ep = null; renderAll(); }
  function focusSearch() {
    if (S.zone !== 'header') S.prevZone = S.zone;
    S.zone = 'header'; S.hd = 0; renderAll();
    focusIn($('search-in'));
  }
  function enterSeries(idx) {
    if (!S.series[idx].eps) {
      loadSeriesInfo(idx, function (ok) { if (S.mode !== 'main') return; if (ok) enterSeries(idx); else toast('Esta série não tem episódios disponíveis'); });
      return;
    }
    var ss = seasonsOf(idx), si = 0, i = 0, found = false;
    if (!ss.length) { toast('Esta série não tem episódios disponíveis'); return; }
    for (var a = 0; a < ss.length && !found; a++) for (var b = 0; b < ss[a].eps.length; b++) if (!isSeen(S.ch[ss[a].eps[b]])) { si = a; i = b; found = true; break; }
    S.ep = { s: idx, si: si, i: i, back: { c: curPos().c, i: curPos().i } };
    S.zone = 'items'; renderAll();
  }
  function exitSeries() { var b = S.ep.back; S.ep = null; curPos().c = b.c; curPos().i = b.i; S.zone = 'items'; renderAll(); }
  function enterItem() {
    var it = curItem(), kind = curKind(); if (it === null) return;
    if (locked(kind, it)) { needPin(enterItem); return; }
    if (kind === 'live') {
      var c = S.ch[it];
      if (S.cur && S.cur.url === c.url && Player.active) openFullLive(); else Player.play(c);
      renderItems();
    } else if (kind === 'movie') playVod(curItems(), curIdx());
    else if (kind === 'series') enterSeries(it);
    else if (kind === 'ep') {
      sortEps(S.series[S.ep.s]);
      var eps = S.series[S.ep.s].eps, pos = 0;
      for (var j = 0; j < eps.length; j++) if (eps[j] === it) { pos = j; break; }
      playVod(eps, pos);
    }
  }
  function moveIdx(d) {
    var n = curItems().length; if (!n) return;
    setIdx(Math.max(0, Math.min(n - 1, curIdx() + d))); renderItems(); renderSide();
  }

  function keyMain(k) {
    var p = curPos(), g = curGroups();
    if (S.zone === 'header') {
      if (k === K.LEFT) { S.hd = 0; renderHeader(); }
      else if (k === K.RIGHT) { S.hd = 1; renderHeader(); }
      else if (k === K.DOWN || k === K.BACK || k === K.ESC) { S.zone = S.prevZone || 'nav'; renderAll(); }
      else if (k === K.ENTER) { if (S.hd === 0) focusIn($('search-in')); else openSettings(); }
      return;
    }
    if (S.zone === 'nav') {
      if (k === K.UP) { if (S.navIdx === 0) { S.prevZone = 'nav'; S.zone = 'header'; S.hd = 0; renderAll(); } else goSection(S.navIdx - 1); }
      else if (k === K.DOWN) { if (S.navIdx < NAV.length - 1) goSection(S.navIdx + 1); }
      else if (k === K.RIGHT || k === K.ENTER) {
        if (NAV[S.navIdx].id === 'search' && !S.query) { focusSearch(); return; }
        S.zone = 'cats'; renderAll();
      } else if (k === K.BACK || k === K.ESC) {
        if (now() - S.backTime < 2500) exitApp(); else { S.backTime = now(); toast('Pressione VOLTAR de novo para sair'); }
      }
      return;
    }
    if (S.zone === 'cats') {
      if (S.ep) { // lista de temporadas
        var ns = seasonsOf(S.ep.s).length;
        if (k === K.UP && S.ep.si > 0) { S.ep.si--; S.ep.i = 0; renderAll(); }
        else if (k === K.DOWN && S.ep.si < ns - 1) { S.ep.si++; S.ep.i = 0; renderAll(); }
        else if (k === K.RIGHT || k === K.ENTER) { S.zone = 'items'; renderAll(); }
        else if (k === K.LEFT || k === K.BACK || k === K.ESC) exitSeries();
        return;
      }
      if (k === K.UP) { if (p.c === 0) { S.prevZone = 'cats'; S.zone = 'header'; S.hd = 0; renderAll(); } else { p.c--; p.i = 0; renderAll(); } }
      else if (k === K.DOWN) { if (p.c < g.length - 1) { p.c++; p.i = 0; renderAll(); } }
      else if (k === K.CHUP || k === K.PGUP) { p.c = Math.max(0, p.c - ROWS); p.i = 0; renderAll(); }
      else if (k === K.CHDOWN || k === K.PGDN) { p.c = Math.min(g.length - 1, p.c + ROWS); p.i = 0; renderAll(); }
      else if (k === K.RIGHT || k === K.ENTER) {
        if (groupLocked(curGroup())) needPin(function () { S.zone = 'items'; renderAll(); });
        else { S.zone = 'items'; renderAll(); }
      } else if (k === K.LEFT || k === K.BACK || k === K.ESC) { S.zone = 'nav'; renderAll(); }
      return;
    }
    // itens
    if (k === K.UP) { if (curIdx() === 0) { S.prevZone = 'items'; S.zone = 'header'; S.hd = 0; renderAll(); } else moveIdx(-1); }
    else if (k === K.DOWN) moveIdx(1);
    else if (k === K.CHUP || k === K.PGUP) moveIdx(-ROWS);
    else if (k === K.CHDOWN || k === K.PGDN) moveIdx(ROWS);
    else if (k === K.ENTER) { if (S.sec === 'events') Ev.open(curItem()); else enterItem(); }
    else if (k === K.RIGHT || k === K.INFO) { var kk = curKind(); if (kk === 'movie' || kk === 'series' || kk === 'ep') Det.show(); }
    else if (k === K.LEFT) { S.zone = 'cats'; renderAll(); }
    else if (k === K.BACK || k === K.ESC) { if (S.ep) exitSeries(); else { S.zone = 'cats'; renderAll(); } }
    else if (k === K.YELLOW) { if (S.sec !== 'events') toggleFav(); }
  }

  function keyFull(k) {
    if (S.fullKind === 'live') {
      if (k === K.UP || k === K.CHUP) zap(-1);
      else if (k === K.DOWN || k === K.CHDOWN) zap(1);
      else if (k === K.ENTER || k === K.INFO || k === K.LEFT || k === K.RIGHT) showOSD();
      else if (k === K.BACK || k === K.ESC) closeFull();
      return;
    }
    if (k === K.ENTER || k === K.PLAYPAUSE || k === K.PLAY || k === K.PAUSE) { Player.toggle(); showVodOSD(); }
    else if (k === K.LEFT || k === K.RW) { Player.seek(-10000); showVodOSD(); }
    else if (k === K.RIGHT || k === K.FF) { Player.seek(30000); showVodOSD(); }
    else if (k === K.CHUP) vodJump(-1);
    else if (k === K.CHDOWN) vodJump(1);
    else if (k === K.UP || k === K.DOWN || k === K.INFO) showVodOSD();
    else if (k === K.BACK || k === K.ESC) closeFull();
  }

  var zapT;
  function zap(d) {
    var z = S.zap; if (!z || !z.items.length) return;
    var n = z.items.length, cur = 0, i;
    for (i = 0; i < n; i++) if (S.ch[z.items[i]] === S.live) { cur = i; break; }
    for (i = 0; i < n; i++) { cur = (cur + d + n) % n; if (S.unlocked || !S.ch[z.items[cur]].adult) break; }
    var c = S.ch[z.items[cur]];
    if (c.adult && !S.unlocked) return;
    S.live = c; showOSD(); $('osd-epg').innerHTML = '';
    if (S.sec === z.sec && S.pos[z.sec].c === z.c && !S.ep) S.pos[z.sec].i = cur;
    clearTimeout(zapT); zapT = setTimeout(function () { S.live = null; Player.play(c); showOSD(); }, 450);
  }

  var numBuf = '', numT;
  function digit(d) {
    numBuf = (numBuf + d).substring(0, 5);
    var nb = $('numbox'); nb.innerHTML = numBuf; show(nb);
    clearTimeout(numT);
    numT = setTimeout(function () {
      hide(nb); var n = parseInt(numBuf, 10), lv = allLive().items; numBuf = '';
      if (!(n >= 1 && n <= lv.length)) { toast('Canal ' + n + ' não existe'); return; }
      var c = S.ch[lv[n - 1]];
      var go = function () {
        if (S.mode === 'full' && S.fullKind === 'live') { S.zap = { items: lv, sec: 'live', c: allLiveIdx() }; Player.play(c); showOSD(); }
        else if (S.mode === 'main') { S.sec = 'live'; S.navIdx = 1; S.ep = null; S.pos.live = { c: allLiveIdx(), i: n - 1 }; S.zone = 'items'; renderAll(); Player.play(c); }
      };
      if (c.adult && !S.unlocked) needPin(go); else go();
    }, 1600);
  }

  /* ================= teclado global ================= */
  function onKey(e) {
    var k = e.keyCode, ae = document.activeElement, inInput = ae && ae.tagName === 'INPUT';
    if (Ask.open) { e.preventDefault(); Ask.key(k); return; }
    if (S.mode === 'pin') { pinKey(k, e); return; }
    if (Det.open && !inInput) { e.preventDefault(); Det.key(k === K.BKSP ? K.BACK : k); return; }
    if (S.mode === 'splash') {
      if (hasClass($('sp-btns'), 'hidden')) { if (k === K.BACK || k === K.ESC) exitApp(); e.preventDefault(); return; }
      formKey('splash', k, e, function (el) { if (el.id === 'sp-retry') startLoad(true); else openSettings(); }, exitApp);
      return;
    }
    if (S.mode === 'settings') { formKey('settings', k, e, settingsEnter, backFromSettings); return; }
    if (S.mode === 'editor') {
      formKey('editor', k, e, function (el) {
        if (hasClass(el, 'tab')) { setTab(el.getAttribute('data-tab')); formFocus('editor'); }
        else if (el.id === 'btn-save') editorSave();
        else if (el.id === 'btn-del') editorDelete();
        else if (el.id === 'btn-back') openSettings();
      }, openSettings);
      return;
    }
    if (inInput) {
      if (k === K.ENTER || k === K.DONE || k === K.DOWN || k === K.CANCEL || k === K.BACK || k === K.ESC) {
        e.preventDefault(); ae.blur();
        clearTimeout(searchT); doSearch(ae.value);
        if (S.query && k !== K.BACK && k !== K.ESC && k !== K.CANCEL) { S.zone = curItems().length ? 'items' : 'cats'; renderAll(); }
      }
      return;
    }
    // atalhos p/ teste no PC
    if (k === 66) k = K.BLUE; else if (k === 71) k = K.GREEN; else if (k === 89) k = K.YELLOW; else if (k === 82) k = K.RED; else if (k === K.BKSP) k = K.BACK;
    e.preventDefault();
    if (k === K.MENU || (!ANDROID && S.mode === 'main' && (k === K.PLAYPAUSE || k === K.PLAY))) k = K.YELLOW;
    else if ((k === K.FF || k === K.RW) && !(S.mode === 'full' && S.fullKind !== 'live')) k = k === K.FF ? K.CHDOWN : K.CHUP;
    if ((k >= 48 && k <= 57) || (k >= 96 && k <= 105)) { digit(String(k >= 96 ? k - 96 : k - 48)); return; }
    if (k === K.BLUE) { openSettings(); return; }
    if (k === K.GREEN) { startLoad(true); return; }
    if (S.mode === 'full') { keyFull(k); return; }
    if (k === K.RED) { focusSearch(); return; }
    keyMain(k);
  }

  /* ================= início ================= */
  function init() {
    if (ANDROID && !window.Hls) { var libs = ['js/hls.min.js', 'js/mpegts.js']; for (var li = 0; li < libs.length; li++) { var sc = document.createElement('script'); sc.src = libs[li]; document.body.appendChild(sc); } }
    fillIcons(); registerKeys(); Player.init();
    S.favs = load('nx_favs', {}); S.watched = load('nx_watched', {}); S.recent = load('nx_recent', {}); S.pin = load('nx_pin', '0000'); S.order = load('nx_order', 'list'); S.engine = load('nx_engine', 'html5');
    loadLists();
    if (load('nx_boot', 0) || load('nx_cache_try', 0)) { // o app foi fechado no meio do carregamento da última vez
      save('nx_nocache', true);
      try { localStorage.removeItem('nx_boot'); localStorage.removeItem('nx_cache_try'); } catch (e) {}
    }
    window.onerror = function (msg) { try { toast('Erro: ' + msg, 6000); } catch (e) {} };
    document.addEventListener('keydown', onKey);
    window.nxKey = function (k) { onKey({ keyCode: k, preventDefault: function () {} }); };
    window.nxPause = function () { try { if (S.fullKind === 'vod') Res.save(S.cur); if (S.mode === 'full') closeFull(); Player.stop(); } catch (e) {} };
    document.addEventListener('visibilitychange', function () { if (document.hidden && S.fullKind === 'vod') Res.save(S.cur); });
    clock(); setInterval(clock, 20000);
    $('search-in').addEventListener('input', function () {
      var v = this.value; clearTimeout(searchT);
      searchT = setTimeout(function () { doSearch(v); }, 500);
    });
    $('search-in').addEventListener('focus', function () { S.zone = 'header'; S.hd = 0; renderHeader(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (Player.cur === 'av' && Player.active) { try { Player.av.suspend(); } catch (e) { Player.stop(true); } } else Player.stop(true); }
      else if (Player.cur === 'av' && Player.active) { try { Player.av.restore(); } catch (e) { if (S.cur) Player.play(S.cur); } }
      else if (S.cur && (S.mode === 'main' || S.mode === 'full')) Player.play(S.cur);
    });
    splash('Iniciando...', '', 2);
    DB.open(function () {
      if (!cacheOn()) { for (var i = 0; i < S.lists.length; i++) { DB.del('list_' + S.lists[i].id); DB.del('api_' + S.lists[i].id); } }
      if (activeList()) startLoad(); else openEditor(-1);
    });
  }
  function bootOk() {
    try { localStorage.removeItem('nx_upd_try'); } catch (e) {}
    var d = new Date().toDateString();
    if (load('nx_upd_chk', '') !== d) { save('nx_upd_chk', d); Upd.check(false); }
  }
  function startApp() { init(); setTimeout(bootOk, 20000); }
  if (document.readyState === 'complete') startApp(); else window.addEventListener('load', startApp);
})();
