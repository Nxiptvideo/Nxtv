/* NxTv celular - Android e iPhone (ES5). Parte de dados copiada do app da TV; telas em m.js. */
(function () {
  'use strict';
  window.NX_APP_OK = true;
  var ANDROID = !!window.NxAndroid;
  var APP_VER = '1.0.0';
  var UPD_BASE = 'https://raw.githubusercontent.com/Nxiptvideo/nxtv/main/';
  var ICONS = {};
  function openFullLive() {}
  function bridge(fn) { try { if (window.NxAndroid && NxAndroid[fn]) NxAndroid[fn](); } catch (e) {} }
  var S = {
    lists: [], activeId: null, ch: [], series: [], groups: {}, favs: {}, watched: {}, recent: {},
    pin: '0000', unlocked: false, sec: 'live', navIdx: 1, zone: 'items', pos: null, ep: null,
    mode: 'splash', cur: null, live: null, fullKind: null, query: '', epg: {}, shown: {}
  };
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
  var CACHE_TTL = 12 * 3600 * 1000; // lista salva na TV vale 12 h
  function newPos() { return { search: { c: 0, i: 0 }, live: { c: 0, i: 0 }, movie: { c: 0, i: 0 }, series: { c: 0, i: 0 }, fav: { c: 0, i: 0 }, events: { c: 0, i: 0 } }; }
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
      Cat.start();
      if (cacheKey && cacheOn()) { pendingCache = { key: cacheKey, url: cr.base + '|' + cr.u + '|' + cr.p, text: cacheTxt }; saveCacheLater(); }
    }, 30);
  }
  var CAT_FRESH = 12 * 3600 * 1000, CAT_MAX = 7 * 24 * 3600 * 1000;
  var Cat = {
    st: {}, gen: 0, force: false, waiters: [],
    reset: function () { Cat.gen++; Cat.st = {}; Cat.waiters = []; },
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
            if (age > CAT_FRESH) setTimeout(function () { if (g === Cat.gen) Cat.fetch(kind, cr, sig, g, false, function () {}); }, 20000);
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
  function bgLoadAll() {
    if (S.bg && (S.bg.running || S.bg.finished || S.bg.wait)) return;
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
  function verNum(v) { var p = String(v || '0').split('.'), n = 0; for (var i = 0; i < 3; i++) n = n * 1000 + (parseInt(p[i], 10) || 0); return n; }
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
    S.pref = load('nx_pref_' + S.activeId, null);
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
  S.pos = newPos();
  /* ================= NxTv celular: telas de toque ================= */
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var MICONS = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="10" cy="10" r="6.5"/><line x1="15" y1="15" x2="21" y2="21"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="2.5" y="5" width="19" height="12.5" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>',
    film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3.5" width="18" height="17" rx="2"/><line x1="7.5" y1="3.5" x2="7.5" y2="20.5"/><line x1="16.5" y1="3.5" x2="16.5" y2="20.5"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
    series: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="2.5" y="7.5" width="15" height="13" rx="2"/><path d="M6.5 4h13a2 2 0 0 1 2 2v10"/><path d="M8.5 11v6l5-3z" fill="currentColor"/></svg>',
    ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.2l4.3 3.1-1.6 5h-5.4l-1.6-5z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.1 20.1l1.5-6.4-4.9-4.3 6.5-.6z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    fs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    fsx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="5.5" y="4.5" width="4.5" height="15" rx="1"/><rect x="14" y="4.5" width="4.5" height="15" rx="1"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h2.5v14H6zM20 5v14L9.5 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 5H18v14h-2.5zM4 5v14l10.5-7z"/></svg>',
    b10: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/><text x="12" y="15.5" font-size="7.5" font-family="Arial" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">10</text></svg>',
    f10: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4"/><text x="12" y="15.5" font-size="7.5" font-family="Arial" font-weight="bold" fill="currentColor" stroke="none" text-anchor="middle">10</text></svg>',
    restart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 4v12M6 11l6 6 6-6M5 20h14"/></svg>'
  };
  function mi(n, cls) { return '<span class="' + (cls || 'ti') + '">' + MICONS[n] + '</span>'; }
  var TABS = [{ id: 'live', label: 'Ao Vivo', ic: 'tv' }, { id: 'movie', label: 'Filmes', ic: 'film' }, { id: 'series', label: 'Séries', ic: 'series' }, { id: 'events', label: 'Eventos', ic: 'ball' }, { id: 'fav', label: 'Favoritos', ic: 'star' }];
  var TITLES = { live: 'TV ao Vivo', movie: 'Filmes', series: 'Séries', events: 'Eventos do dia', fav: 'Favoritos e recentes', search: 'Pesquisa' };
  var PAGE = 60;

  /* ---------- ganchos usados pela parte de dados (vinda do app da TV) ---------- */
  var toastT;
  function toast(msg, ms) { var t = $('toast'); t.innerHTML = esc(msg); show(t); clearTimeout(toastT); toastT = setTimeout(function () { hide(t); }, ms || 2600); }
  function splash(title, sub, pct, error) {
    show($('splash')); S.mode = 'splash';
    $('sp-title').innerHTML = esc(title); $('sp-sub').innerHTML = esc(sub || '');
    $('sp-fill').style.width = (pct || 0) + '%';
    if (error) {
      hide($('sp-spin')); hide($('sp-bar')); show($('sp-btns'));
      var L = activeList(), srv = L ? (L.type === 'xtream' ? fixServer(L.server) : (L.url || '')) : '';
      if (location.protocol === 'https:' && /^http:/i.test(srv)) $('sp-sub').innerHTML = esc((sub ? sub + '. ' : '') + 'No iPhone (Safari), listas com endereço http não abrem: o Safari só aceita https. Veja em Configurações se sua lista tem endereço https.');
    } else { show($('sp-spin')); show($('sp-bar')); hide($('sp-btns')); }
  }
  function renderSide() { if (S.det) renderDetail(); }
  var Det = { refresh: function () { if (S.det) renderDetail(); } };
  function renderNow() { renderNowBar(); }
  function renderItems() {}
  var renderAllT = null;
  function renderAll() {
    if (S.mode !== 'main') return;
    clearTimeout(renderAllT); renderAllT = null;
    renderTop(); renderTabs(); renderView();
  }
  function renderLater() { if (!renderAllT) renderAllT = setTimeout(renderAll, 120); }
  function curKind() { return 'none'; }
  function curItem() { return null; }

  /* ---------- player ---------- */
  var Player = {
    vid: null, active: false, gen: 0, hls: null, mp: null, list: [], idx: 0, lastC: null, loadT: null,
    init: function () {
      var v = this.vid = $('v'), self = this;
      v.addEventListener('timeupdate', function () { if (S.fullKind === 'vod') vodTick(); });
      v.addEventListener('play', ppIcon); v.addEventListener('pause', function () { ppIcon(); if (S.fullKind === 'vod') Res.save(S.cur); });
      v.addEventListener('webkitendfullscreen', function () { if (self.active) setTimeout(function () { try { v.play(); } catch (e) {} }, 300); });
    },
    altUrl: function (u) {
      if (/\.ts(\?|$)/i.test(u)) return u.replace(/\.ts(\?|$)/i, '.m3u8$1');
      if (/\.m3u8(\?|$)/i.test(u)) return u.replace(/\.m3u8(\?|$)/i, '.ts$1');
      if (/\/\d+$/.test(u)) return u + '.m3u8';
      return null;
    },
    attempts: function (c) {
      var u = c.url, out = [], i, a = this.altUrl(u);
      var hasH = !IOS && !!(window.Hls && Hls.isSupported()), hasT = !IOS && !!(window.mpegts && mpegts.isSupported());
      var isM3 = /\.m3u8(\?|$)/i.test(u), isTs = /\.ts(\?|$)/i.test(u);
      if (c.type === 'live') {
        var m3 = isM3 ? u : (a && /\.m3u8(\?|$)/i.test(a) ? a : null);
        var ts = isTs ? u : (a && /\.ts(\?|$)/i.test(a) ? a : (!isM3 ? u : null));
        if (m3 && hasH) out.push({ eng: 'hls', url: m3, key: 'hls' });
        if (ts && hasT) out.push({ eng: 'ts', url: ts, key: 'ts' });
        if (m3) out.push({ eng: 'vid', url: m3, key: 'vid|m3u8' });
        if (!out.length || !m3) out.push({ eng: 'vid', url: u, key: 'vid|raw' });
        if (S.pref) for (i = 0; i < out.length; i++) if (out[i].key === S.pref) { out.unshift(out.splice(i, 1)[0]); break; }
      } else {
        if (isM3 && hasH) out.push({ eng: 'hls', url: u, key: 'hls' });
        else if (isTs && hasT) out.push({ eng: 'ts', url: u, key: 'ts' });
        out.push({ eng: 'vid', url: u, key: 'vid' });
      }
      return out;
    },
    play: function (c, step, startMs) {
      var self = this, vod = c.type !== 'live';
      if (step === undefined || this.lastC !== c) { this.list = this.attempts(c); this.idx = 0; } else this.idx = step;
      this.lastC = c;
      var at = this.list[this.idx];
      this.stop(true);
      var g = ++this.gen;
      this.active = true; S.cur = c; S.fullKind = vod ? 'vod' : 'live';
      show($('player')); setClass($('player'), 'vod', vod);
      setClass($('player'), 'hasnext', vod && nextEp(c) !== null);
      $('pl-name').innerHTML = esc(vod && c.type === 'series' && S.series[c.sid] ? S.series[c.sid].name + ' · ' + (c.se ? 'T' + c.se + ' ' : '') + epLabel(c, 0) : c.name);
      hide($('pl-msg')); show($('pl-load'));
      clearTimeout(this.loadT);
      this.loadT = setTimeout(function () { if (g === self.gen) self.fail(); }, vod ? 40000 : 15000);
      var ok = function () {
        if (g !== self.gen) return;
        clearTimeout(self.loadT); hide($('pl-load'));
        if (!vod && S.pref !== at.key) { S.pref = at.key; save('nx_pref_' + S.activeId, at.key); }
      };
      var v = this.vid;
      v.onerror = function () { if (g === self.gen) self.fail(); };
      v.onwaiting = function () { if (g === self.gen) show($('pl-load')); };
      v.onplaying = function () { ok(); uiShow(); };
      v.onended = function () { if (g === self.gen && vod) vodEnded(); };
      if (at.eng === 'hls') {
        var hl = this.hls = new Hls({ maxBufferLength: vod ? 60 : 20, backBufferLength: 20, manifestLoadingMaxRetry: 2, levelLoadingMaxRetry: 2 });
        hl.on(Hls.Events.ERROR, function (ev, d) { if (g === self.gen && d && d.fatal) self.fail(); });
        hl.loadSource(at.url); hl.attachMedia(v);
      } else if (at.eng === 'ts') {
        var mp = this.mp = mpegts.createPlayer({ type: 'mpegts', isLive: !vod, url: at.url },
          { enableWorker: false, lazyLoad: false, liveBufferLatencyChasing: !vod, autoCleanupSourceBuffer: true });
        mp.on(mpegts.Events.ERROR, function () { if (g === self.gen) self.fail(); });
        mp.attachMediaElement(v); mp.load();
      } else {
        v.src = at.url;
        try { v.load(); } catch (e) {}
      }
      var p = v.play(); if (p && p['catch']) p['catch'](function () {});
      if (vod && startMs > 0) Res.seekWhenReady(c, startMs);
      if (!vod) { S.live = c; save('nx_last', c.url); clearTimeout(recLiveT); recLiveT = setTimeout(function () { if (S.cur === c && self.active) recAdd('live', 'u:' + c.url, c); }, 10000); }
      else recVod(c);
      renderNowBar(); markPlaying(); uiShow();
    },
    fail: function () {
      clearTimeout(this.loadT);
      var c = S.cur;
      if (c && this.lastC === c && this.idx + 1 < this.list.length) { this.play(c, this.idx + 1); return; }
      this.stop(true); this.active = false;
      show($('player')); hide($('pl-load'));
      var m = $('pl-msg'); show(m);
      m.innerHTML = location.protocol === 'https:' && /^http:/i.test(c ? c.url : '') ? 'O iPhone bloqueou este vídeo: o endereço da lista é http e o Safari só aceita https.' : 'Não foi possível abrir este conteúdo.';
    },
    stop: function (keepUi) {
      clearTimeout(this.loadT);
      if (this.hls) { try { this.hls.destroy(); } catch (e) {} this.hls = null; }
      if (this.mp) { try { this.mp.pause(); this.mp.unload(); this.mp.detachMediaElement(); this.mp.destroy(); } catch (e) {} this.mp = null; }
      var v = this.vid;
      if (v) { try { v.onerror = null; v.onended = null; v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {} }
      this.active = false;
      if (!keepUi) { hide($('player')); hide($('now')); exitFs(); S.cur = null; S.fullKind = null; markPlaying(); }
    },
    toggle: function () { var v = this.vid; if (v.paused) { var p = v.play(); if (p && p['catch']) p['catch'](function () {}); } else v.pause(); },
    seek: function (ms) { try { this.vid.currentTime = Math.max(0, this.vid.currentTime + ms / 1000); } catch (e) {} },
    seekAbs: function (ms) { try { this.vid.currentTime = ms / 1000; } catch (e) {} },
    isPlaying: function () { return !!this.vid && !this.vid.paused && this.vid.readyState >= 2; },
    isPaused: function () { return this.vid.paused; },
    times: function () { var v = this.vid; return [(v.currentTime || 0) * 1000, (isFinite(v.duration) ? v.duration || 0 : 0) * 1000]; }
  };
  function ppIcon() { $('pl-pp').innerHTML = Player.vid.paused ? MICONS.play : MICONS.pause; }
  var uiT;
  function uiShow() {
    var p = $('player'); rmClass(p, 'ui-off'); clearTimeout(uiT);
    uiT = setTimeout(function () { if (Player.active && !Player.vid.paused) addClass(p, 'ui-off'); }, 4000);
  }
  function vodTick() {
    var t = Player.times(); if (!(t[1] > 0)) return;
    $('pl-cur').innerHTML = fmtTime(t[0]); $('pl-dur').innerHTML = fmtTime(t[1]);
    if (!S.seeking) $('pl-seek').value = Math.round(t[0] / t[1] * 1000);
  }
  function nextEp(c) {
    if (!c || c.type !== 'series' || c.sid === undefined) return null;
    var ser = S.series[c.sid]; if (!ser || !ser.eps) return null;
    sortEps(ser);
    for (var i = 0; i < ser.eps.length; i++) if (S.ch[ser.eps[i]] === c) return i + 1 < ser.eps.length ? ser.eps[i + 1] : null;
    return null;
  }
  function vodEnded() {
    var c = S.cur; Res.done(c); markSeen(c);
    var n = nextEp(c);
    if (n !== null) { toast('Próximo episódio'); Player.play(S.ch[n]); }
    else { Player.stop(); if (S.det) renderDetail(); }
  }
  function zap(d) {
    if (S.fullKind === 'vod') { var n = nextEp(S.cur); if (d > 0 && n !== null) { Res.save(S.cur); Player.play(S.ch[n]); } return; }
    var z = S.zapList; if (!z || !z.length || !S.cur) return;
    var i = z.indexOf(S.byUrl ? S.byUrl[S.cur.url] : -1);
    if (i < 0) for (var k = 0; k < z.length; k++) if (S.ch[z[k]] === S.cur) { i = k; break; }
    var j = i + d; if (j < 0) j = z.length - 1; if (j >= z.length) j = 0;
    var c = S.ch[z[j]]; if (!c) return;
    if (c.adult && !S.unlocked) { needPin(function () { Player.play(c); }); return; }
    Player.play(c);
  }
  // tela cheia: no Android o app gira para deitado; no iPhone usa a tela cheia do próprio iPhone
  function enterFs(auto) {
    if (IOS && !auto && Player.vid.webkitEnterFullscreen) { try { Player.vid.webkitEnterFullscreen(); return; } catch (e) {} }
    addClass(document.body, 'fs'); S.fsAuto = !!auto && S.fullKind === 'live'; $('pl-fs').innerHTML = MICONS.fsx;
    if (window.NxAndroid && NxAndroid.landscape && !auto) { try { NxAndroid.landscape(); } catch (e) {} }
    else if (!auto) {
      var el = document.documentElement;
      try { var r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el); if (r && r.then) r.then(function () { try { screen.orientation.lock('landscape')['catch'](function () {}); } catch (e) {} })['catch'](function () {}); } catch (e) {}
    }
    uiShow();
  }
  function exitFs() {
    if (!hasClass(document.body, 'fs')) return;
    rmClass(document.body, 'fs'); S.fsAuto = false; $('pl-fs').innerHTML = MICONS.fs;
    if (window.NxAndroid && NxAndroid.portrait) { try { NxAndroid.portrait(); } catch (e) {} }
    try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
    // filme/episódio: ao sair da tela cheia, para e guarda onde parou (a página de detalhes volta a aparecer)
    if (S.fullKind === 'vod' && Player.active && !hasClass($('page'), 'hidden')) { Res.save(S.cur); Player.stop(); if (S.det) renderDetail(); }
  }
  function onRotate() {
    var land = window.innerWidth > window.innerHeight;
    if (land && Player.active && !hasClass(document.body, 'fs')) enterFs(true);
    else if (!land && S.fsAuto) exitFs();
  }

  /* ---------- canal tocando: nome e programação ---------- */
  var nowT;
  function renderNowBar() {
    var c = S.cur, el = $('now');
    if (!c || !Player.active && !$('pl-msg').offsetParent) { hide(el); return; }
    if (S.fullKind !== 'live') { hide(el); return; }
    show(el);
    var fav = !!S.favs[favKeyCh(c)];
    el.innerHTML = '<img src="' + esc(c.logo || '') + '" onerror="this.style.visibility=\'hidden\'"><div class="nw"><div class="nn">' + esc(c.name) + '</div><div class="ne" id="now-epg">' + esc(c.group || '') + '</div><div class="nb"><div id="now-bar" style="width:0"></div></div></div><button class="star' + (fav ? ' on' : '') + '" data-act="favcur">' + MICONS.star + '</button>';
    clearInterval(nowT);
    var upd = function () {
      epgFor(c, function (list) {
        if (S.cur !== c) return;
        var nn = epgNowNext(list), a = nn[0], b = nn[1], e = $('now-epg'); if (!e) return;
        if (a) {
          e.innerHTML = '<b>' + hhmm(a.s) + '</b> ' + esc(a.t) + (b ? ' · depois ' + hhmm(b.s) + ' ' + esc(b.t) : '');
          $('now-bar').style.width = Math.min(100, Math.max(0, (now() - a.s) / (a.e - a.s) * 100)) + '%';
        } else if (b) e.innerHTML = 'A seguir ' + hhmm(b.s) + ' · ' + esc(b.t);
      });
    };
    upd(); nowT = setInterval(upd, 60000);
  }
  function markPlaying() {
    var rows = document.querySelectorAll('#view .row[data-i]'), url = S.cur && S.fullKind === 'live' ? S.cur.url : null;
    for (var i = 0; i < rows.length; i++) { var c = S.ch[+rows[i].getAttribute('data-i')]; setClass(rows[i], 'playing', !!(url && c && c.url === url)); }
  }

  /* ---------- telas ---------- */
  function renderTop() {
    $('top-title').innerHTML = esc(S.searchOn ? '' : TITLES[S.sec] || '');
    setClass($('top-title'), 'hidden', S.searchOn); setClass($('search-box'), 'hidden', !S.searchOn);
    $('btn-search').innerHTML = S.searchOn ? MICONS.close : MICONS.search;
  }
  function renderTabs() {
    var h = '';
    for (var i = 0; i < TABS.length; i++) h += '<button data-act="tab" data-v="' + TABS[i].id + '" class="' + (S.sec === TABS[i].id ? 'on' : '') + '">' + mi(TABS[i].ic) + TABS[i].label + '</button>';
    $('tabs').innerHTML = h;
  }
  function firstReal(sec) { var g = S.groups[sec] || []; return g[0] && g[0].recent && g.length > 1 ? 1 : 0; }
  function curGroupOf(sec) { var gs = S.groups[sec] || [], p = S.pos[sec]; if (!gs[p.c]) p.c = firstReal(sec); return gs[p.c]; }
  function shownKey() { return S.sec + '|' + (S.pos[S.sec] ? S.pos[S.sec].c : 0); }
  function shownN() { return S.shown[shownKey()] || PAGE; }
  function lockedG(g) { return g && g.adult && !S.unlocked; }

  function chRow(i, sub) {
    var c = S.ch[i]; if (!c) return '';
    if (c.adult && !S.unlocked) return '<div class="row" data-act="ch" data-i="' + i + '"><span class="num">' + (c.num || '') + '</span><span class="lk">' + MICONS.lock + '</span><div class="tx"><div class="nm">Conteúdo adulto</div><div class="sb">Toque para digitar a senha</div></div></div>';
    var fav = !!S.favs[favKeyCh(c)], pl = S.cur && S.fullKind === 'live' && S.cur.url === c.url;
    return '<div class="row' + (pl ? ' playing' : '') + '" data-act="ch" data-i="' + i + '"><span class="num">' + (c.num || '') + '</span>' + (c.logo ? '<img class="lg" loading="lazy" src="' + esc(c.logo) + '" onerror="this.style.visibility=\'hidden\'">' : '') + '<div class="tx"><div class="nm">' + esc(c.name) + '</div>' + (sub ? '<div class="sb">' + esc(sub) + '</div>' : '') + '</div><button class="st' + (fav ? ' on' : '') + '" data-act="fav" data-k="ch" data-i="' + i + '">' + MICONS.star + '</button></div>';
  }
  function card(kind, i) {
    var o = kind === 'series' ? S.series[i] : S.ch[i]; if (!o) return '';
    if (o.adult && !S.unlocked) return '<div class="card" data-act="det" data-k="' + kind + '" data-i="' + i + '"><div class="ps"><span class="lk">' + MICONS.lock + '</span></div><div class="cn">Conteúdo adulto</div></div>';
    var pr = '';
    if (kind === 'movie') { var r = Res.get(o); if (r && r.d) pr = '<div class="pr" style="width:' + Math.round(r.t / r.d * 100) + '%"></div>'; }
    return '<div class="card" data-act="det" data-k="' + kind + '" data-i="' + i + '"><div class="ps"><span class="pn">' + esc(o.name) + '</span>' + (o.logo ? '<img loading="lazy" src="' + esc(o.logo) + '" onerror="this.parentNode.removeChild(this)">' : '') + pr + '</div><div class="cn">' + esc(o.name) + '</div></div>';
  }
  function catBar(sec, g) {
    var n = g && g.items ? ' <span class="c">(' + g.items.length + ')</span>' : '';
    return '<div class="bar"><button class="catbtn" data-act="cats"><span>' + esc(g ? g.name : 'Categorias') + '</span>' + n + '<i>▾</i></button></div>';
  }
  function moreFoot(total, n) { return total > n ? '<div class="more" id="more">Carregando mais... (' + n + ' de ' + total + ')</div>' : (total > 12 ? '<div class="more">' + total + ' itens</div>' : ''); }

  function renderView() {
    var v = $('view'), keep = S.lastView === shownKey() ? v.scrollTop : 0, h = '';
    S.lastView = shownKey();
    if (S.sec === 'live') h = viewLive();
    else if (S.sec === 'movie' || S.sec === 'series') h = viewVod(S.sec);
    else if (S.sec === 'events') h = viewEvents();
    else if (S.sec === 'fav') h = viewFav();
    else if (S.sec === 'search') h = viewSearch();
    v.innerHTML = h; v.scrollTop = keep;
  }
  function viewLive() {
    var gs = S.groups.live || [];
    if (!gs.length) return '<div class="empty">Nenhum canal nesta lista.</div>';
    var g = curGroupOf('live'), h = catBar('live', g);
    if (lockedG(g)) return h + '<div class="empty">' + mi('lock', 'ti') + '<br>Categoria bloqueada.<br><br><button class="btn pri" data-act="unlock">Digitar a senha</button></div>';
    var it = g.items || [], n = Math.min(it.length, shownN()), all = g === allLive(), list = '';
    for (var i = 0; i < n; i++) list += chRow(it[i], all ? S.ch[it[i]].group : '');
    if (!it.length) list = '<div class="empty">' + (g.recent ? 'Os canais que você assistir aparecem aqui.' : 'Categoria vazia.') + '</div>';
    return h + list + moreFoot(it.length, n);
  }
  function viewVod(sec) {
    var gs = S.groups[sec] || [];
    if (!gs.length) return '<div class="empty">Nenhum ' + (sec === 'movie' ? 'filme' : 'série') + ' nesta lista.</div>';
    var g = curGroupOf(sec), h = catBar(sec, g), i;
    var rec = gs[0] && gs[0].recent ? gs[0] : null;
    if (rec && rec.items.length && g !== rec) {
      h += '<div class="sec-h">Continuar assistindo</div><div class="hrow">';
      for (i = 0; i < rec.items.length; i++) h += card(sec, rec.items[i]);
      h += '</div><div class="sec-h">' + esc(g.name) + '</div>';
    }
    if (lockedG(g)) return h + '<div class="empty">Categoria bloqueada.<br><br><button class="btn pri" data-act="unlock">Digitar a senha</button></div>';
    if (!g.items) {
      if (g.lazy) loadGroup(g, function () { if (S.sec === sec) renderAll(); });
      return h + '<div class="loadbox"><div class="spin"></div>Carregando ' + esc(g.name) + '...</div>';
    }
    var it = g.items, n = Math.min(it.length, shownN());
    h += '<div class="grid">'; for (i = 0; i < n; i++) h += card(sec, it[i]); h += '</div>';
    if (!it.length) h += '<div class="empty">' + (g.recent ? 'O que você assistir aparece aqui.' : 'Categoria vazia.') + '</div>';
    return h + moreFoot(it.length, n);
  }
  function viewFav() {
    var f = S.groups.fav || [], h = '', i, sh = 0;
    var parts = [['live', 'Canais recentes', (S.groups.live && S.groups.live[0] && S.groups.live[0].recent) ? S.groups.live[0].items : []],
      ['movie', 'Filmes recentes', (S.groups.movie && S.groups.movie[0] && S.groups.movie[0].recent) ? S.groups.movie[0].items : []],
      ['series', 'Séries recentes', (S.groups.series && S.groups.series[0] && S.groups.series[0].recent) ? S.groups.series[0].items : []]];
    var favs = [['live', 'Canais favoritos', f[0] ? f[0].items : []], ['movie', 'Filmes favoritos', f[1] ? f[1].items : []], ['series', 'Séries favoritas', f[2] ? f[2].items : []]];
    var blocks = favs.concat(parts);
    for (var b = 0; b < blocks.length; b++) {
      var k = blocks[b][0], it = blocks[b][2]; if (!it || !it.length) continue;
      sh++;
      h += '<div class="sec-h">' + blocks[b][1] + ' <b>' + it.length + '</b></div>';
      if (k === 'live') for (i = 0; i < it.length; i++) h += chRow(it[i], S.ch[it[i]] ? S.ch[it[i]].group : '');
      else { h += '<div class="hrow">'; for (i = 0; i < it.length; i++) h += card(k, it[i]); h += '</div>'; }
    }
    if (!sh) h = '<div class="empty">' + mi('star', 'ti') + '<br>Toque na estrela de um canal, filme ou série para guardar aqui.<br>O que você assistir também aparece aqui.</div>';
    return h;
  }
  function viewSearch() {
    var gs = S.groups.search || [], h = '', i;
    if (gs.length === 1) return '<div class="empty">' + esc(gs[0].name) + '</div>';
    var tot = 0;
    for (var j = 0; j < gs.length; j++) {
      var g = gs[j], it = g.items, lim = Math.min(it.length, S.shown['search|' + j] || 30); tot += it.length;
      if (!it.length && g.name.indexOf('…') < 0) continue;
      h += '<div class="sec-h">' + esc(g.name) + ' <b>' + it.length + '</b></div>';
      if (g.kind === 'live') for (i = 0; i < lim; i++) h += chRow(it[i], S.ch[it[i]].group);
      else { h += '<div class="grid">'; for (i = 0; i < lim; i++) h += card(g.kind, it[i]); h += '</div>'; }
      if (it.length > lim) h += '<div class="more"><button class="btn" data-act="smore" data-v="' + j + '">Ver mais ' + (it.length - lim) + '</button></div>';
    }
    if (!tot && !Cat.busy() && !(S.bg && S.bg.running)) h = '<div class="empty">Nada encontrado para "' + esc(S.query) + '".</div>' + h;
    return h;
  }
  function viewEvents() {
    Ev.ensure();
    var gs = Ev.groups, p = S.pos.events; if (!gs[p.c]) p.c = 0;
    var g = gs[p.c], h = '<div class="chips">', i;
    for (i = 0; i < gs.length; i++) h += '<button class="chip' + (i === p.c ? ' on' : '') + '" data-act="evg" data-v="' + i + '">' + esc(gs[i].name) + (gs[i].items ? ' (' + gs[i].items.length + ')' : '') + '</button>';
    h += '</div>';
    if (!g.items) return h + '<div class="loadbox"><div class="spin"></div>Buscando os jogos de hoje...</div>';
    if (!g.items.length) return h + '<div class="empty">' + esc(Ev.msg()) + '</div>';
    if (Ev.scanning) h += '<div class="note">Procurando os canais na programação... ' + Ev.scanDone + ' de ' + Ev.scanTotal + '</div>';
    for (i = 0; i < g.items.length; i++) h += evRow(g.items[i]);
    return h + '<div class="note">Horários de Brasília · toque no jogo para abrir o canal</div>';
  }
  function evRow(i) {
    var e = Ev.list[i], st = '';
    if (e.state === 'in') st = '<small>' + esc(e.detail && e.detail.length < 9 ? e.detail : 'AO VIVO') + '</small>';
    else if (e.state === 'post') st = '<small class="end">FIM</small>';
    var h = '<div class="ev" data-act="ev" data-i="' + i + '"><div class="tm">' + Ev.hm(e.t) + st + '</div><div class="bd"><div class="lgn">' + esc(e.league + (e.sub ? ' · ' + e.sub : '')) + '</div>';
    var sc = e.state !== 'pre' && e.hs !== undefined;
    if (e.home && e.away) {
      h += '<div class="tms"><img src="' + esc(Ev.small(e.hlogo, 60)) + '" onerror="this.style.visibility=\'hidden\'"><span class="tn">' + esc(e.home) + '</span>' + (sc ? '<span class="sc">' + esc(e.hs) + '</span>' : '') + '</div>';
      h += '<div class="tms"><img src="' + esc(Ev.small(e.alogo, 60)) + '" onerror="this.style.visibility=\'hidden\'"><span class="tn">' + esc(e.away) + '</span>' + (sc ? '<span class="sc">' + esc(e.as) + '</span>' : '') + '</div>';
    } else h += '<div class="tms"><img src="' + esc(Ev.small(e.llogo, 60)) + '" onerror="this.style.visibility=\'hidden\'"><span class="tn">' + esc(e.title) + '</span></div>';
    var cn = e.ch && e.ch.length ? Ev.chName(e, 40) : '';
    if (cn) h += '<div class="ch' + (e.weak ? ' weak' : '') + '">📺 ' + esc(cn) + '</div>';
    else if (S.ch.length && !Ev.scanning) h += '<div class="ch no">Canal não encontrado na programação</div>';
    return h + '</div></div>';
  }
  function evOpen(i) {
    var e = Ev.list[i]; if (!e) return;
    if (!e.ch || !e.ch.length) { toast(Ev.scanning ? 'Ainda procurando o canal deste jogo...' : 'Canal deste jogo não encontrado na programação'); return; }
    var c = S.ch[e.ch[0]];
    var go = function () { S.zapList = e.ch.slice(); Player.play(c); toast((e.weak ? 'Provavelmente em ' : 'Passando em ') + c.name + (e.ch.length > 1 ? ' · ◀ ▶ outros canais' : '')); };
    if (c.adult && !S.unlocked) needPin(go); else go();
  }

  /* ---------- detalhes de filme / série ---------- */
  function vodInfo(c) {
    if (c.info !== undefined || c.infoLoading || !S.api) return;
    var id = streamId(c.url); if (!id) { c.info = null; return; }
    c.infoLoading = true;
    getText(apiUrl(S.api, 'get_vod_info', '&vod_id=' + id), 15000, function (t) {
      c.infoLoading = false;
      var d = null; try { d = JSON.parse(t); } catch (e) { d = null; }
      c.info = d && d.info ? infoOf(d.info) : null;
      if (S.det && S.det.kind === 'movie' && S.ch[S.det.i] === c) renderDetail();
    });
  }
  function openDetail(kind, i) {
    var o = kind === 'series' ? S.series[i] : S.ch[i]; if (!o) return;
    if (o.adult && !S.unlocked) { needPin(function () { openDetail(kind, i); }); return; }
    S.det = { kind: kind, i: i, se: null };
    show($('page')); $('page').scrollTop = 0;
    if (kind === 'movie') vodInfo(o);
    else loadSeriesInfo(i, function () { if (S.det && S.det.i === i) renderDetail(); }, true);
    renderDetail();
  }
  function closePage() { S.det = null; S.pg = null; hide($('page')); $('page-in').innerHTML = ''; if (S.mode === 'main') renderAll(); }
  function head(title) { return '<div class="pg-head"><button class="ibtn" data-act="pgback">' + MICONS.back + '</button><h2>' + esc(title) + '</h2></div>'; }
  function renderDetail() {
    var d = S.det; if (!d) return;
    var series = d.kind === 'series', o = series ? S.series[d.i] : S.ch[d.i], inf = o.info, h = head(series ? 'Série' : 'Filme');
    var wait = series ? (!o.eps && !!S.api && !!o.id) : (inf === undefined && !!S.api);
    var meta = infoLine(inf);
    if (series && o.eps) { var ss0 = seasonsOf(d.i); meta = (meta ? meta + ' · ' : '') + ss0.length + (ss0.length > 1 ? ' temporadas' : ' temporada') + ' · ' + o.eps.length + ' episódios'; }
    h += '<div class="dt-top">' + (o.logo ? '<div class="dt-ps"><img src="' + esc(o.logo) + '" onerror="this.parentNode.style.display=\'none\'"></div>' : '') + '<div class="dt-in"><h1>' + esc(o.name) + '</h1>' + genreChips(inf && inf.genre, o.group) + (meta ? '<div class="dt-meta">' + esc(meta) + '</div>' : '') + '</div></div>';
    h += '<div class="dt-plot">' + (inf && inf.plot ? esc(inf.plot) : '<span class="dim">' + (wait ? 'Carregando sinopse...' : 'Sem sinopse') + '</span>') + '</div>';
    var fav = !!S.favs[series ? favKeyS(o) : favKeyCh(o)];
    h += '<div class="dt-btns">';
    if (!series) {
      var r = Res.get(o);
      if (r) h += '<button class="btn pri full" data-act="playm" data-v="1">' + mi('play', 'bi') + 'Continuar de ' + fmtTime(r.t) + '</button><button class="btn" data-act="playm" data-v="0">' + mi('restart', 'bi') + 'Do início</button>';
      else h += '<button class="btn pri full" data-act="playm" data-v="0">' + mi('play', 'bi') + 'Assistir</button>';
    }
    h += '<button class="btn fav' + (fav ? ' on' : '') + '" data-act="favdet">' + mi('star', 'bi') + (fav ? 'Favorito' : 'Favoritar') + '</button></div>';
    if (series) {
      if (!o.eps) h += '<div class="loadbox"><div class="spin"></div>Carregando episódios...</div>';
      else if (!o.eps.length) h += '<div class="empty">Esta série não tem episódios disponíveis.</div>';
      else {
        var ss = seasonsOf(d.i), cur = d.se === null ? 0 : d.se, i;
        if (d.se === null) { for (i = 0; i < ss.length; i++) if (seenCount(ss[i].eps) < ss[i].eps.length) { cur = i; break; } d.se = cur; }
        if (ss.length > 1) { h += '<div class="seasons">'; for (i = 0; i < ss.length; i++) h += '<button class="chip' + (i === cur ? ' on' : '') + '" data-act="season" data-v="' + i + '">' + seasonName(ss[i].se) + '</button>'; h += '</div>'; }
        var eps = ss[cur] ? ss[cur].eps : [];
        for (i = 0; i < eps.length; i++) {
          var c = S.ch[eps[i]], seen = isSeen(c), rr = Res.get(c), inf2 = c.info;
          h += '<div class="ep' + (seen ? ' seen' : '') + '" data-act="ep" data-i="' + eps[i] + '"><span class="en">' + epLabel(c, i) + '</span><div class="et"><div>' + esc(epTitle(c, o, i)) + '</div>' + (inf2 && inf2.dur ? '<small>' + esc(inf2.dur) + '</small>' : '') + (rr && rr.d ? '<div class="pr"><div style="width:' + Math.round(rr.t / rr.d * 100) + '%"></div></div>' : '') + '</div>' + (seen ? '<span class="ok">' + MICONS.check + '</span>' : '') + '</div>';
        }
      }
    }
    $('page-in').innerHTML = h;
  }
  function epTitle(c, ser, i) {
    var t = trim(c.name.replace(/^.*?(?:[ST]\d{1,2}[\s._\-]*EP?\d{1,4}|\b\d{1,2}x\d{1,3}\b)[\s\-:|.]*/i, ''));
    if (!t || norm(t) === ser.n) return 'Episódio ' + (c.ep || i + 1);
    return t;
  }
  function playMovie(c, fromStart) {
    var r = Res.get(c);
    if (fromStart) Res.done(c);
    S.zapList = null;
    Player.play(c, undefined, !fromStart && r ? r.t : 0);
    enterFs(!IOS ? false : true);
    if (S.det) renderDetail();
  }
  function playEpisode(idx) {
    var c = S.ch[idx], r = Res.get(c);
    var go = function (from) { if (from === 0) Res.done(c); Player.play(c, undefined, from); enterFs(!IOS ? false : true); };
    if (r) dialog(c.name, 'Você parou em ' + fmtTime(r.t) + (r.d ? ' de ' + fmtTime(r.d) : ''), null, ['Continuar de ' + fmtTime(r.t), 'Começar do início', 'Cancelar'], function (b) { if (b === 0) go(r.t); else if (b === 1) go(0); });
    else go(0);
  }

  /* ---------- favoritos ---------- */
  function favToggleObj(kind, o) {
    var k = kind === 'series' ? favKeyS(o) : favKeyCh(o);
    if (S.favs[k]) { delete S.favs[k]; toast('Removido dos favoritos'); }
    else { S.favs[k] = { n: o.name, l: o.logo, g: o.group, t: o.type, id: o.id || null, a: o.adult ? 1 : 0 }; toast('Adicionado aos favoritos'); }
    save('nx_favs', S.favs); buildFav();
  }

  /* ---------- lista de categorias ---------- */
  function openCats() {
    var sec = S.sec, gs = S.groups[sec] || [];
    $('sh-title').innerHTML = 'Categorias · ' + esc(TITLES[sec]);
    $('sh-filter').value = '';
    S.sheet = sec; show($('sheet')); renderCats('');
  }
  function renderCats(q) {
    var sec = S.sheet, gs = S.groups[sec] || [], p = S.pos[sec], h = '', nq = norm(trim(q));
    for (var i = 0; i < gs.length; i++) {
      if (nq && norm(gs[i].name).indexOf(nq) < 0) continue;
      h += '<div class="sh-it' + (i === p.c ? ' on' : '') + '" data-act="pickcat" data-v="' + i + '"><span>' + esc(gs[i].name) + '</span>' + (gs[i].adult && !S.unlocked ? '<span class="lk">' + MICONS.lock + '</span>' : (gs[i].items ? '<small>' + gs[i].items.length + '</small>' : '')) + '</div>';
    }
    $('sh-list').innerHTML = h || '<div class="empty">Nenhuma categoria</div>';
  }
  function closeSheet() { hide($('sheet')); S.sheet = null; }

  /* ---------- caixa de diálogo e senha ---------- */
  var dlgCb = null;
  function dialog(title, sub, bodyHtml, btns, cb) {
    $('dlg-title').innerHTML = esc(title); $('dlg-sub').innerHTML = esc(sub || ''); $('dlg-body').innerHTML = bodyHtml || '';
    var h = ''; for (var i = 0; i < btns.length; i++) h += '<button class="btn' + (i === 0 ? ' pri' : '') + '" data-act="dlg" data-v="' + i + '">' + esc(btns[i]) + '</button>';
    $('dlg-btns').innerHTML = h; dlgCb = cb; show($('dlg'));
    var inp = $('dlg-body').querySelector('input'); if (inp) setTimeout(function () { inp.focus(); }, 80);
  }
  function closeDlg(b) { hide($('dlg')); var cb = dlgCb; dlgCb = null; if (cb) cb(b); }
  function needPin(fn) {
    if (S.unlocked) { fn(); return; }
    dialog('Conteúdo adulto', 'Digite a senha de 4 números (a senha inicial é 0000).', '<input id="pin-in" type="tel" inputmode="numeric" maxlength="4" autocomplete="off">', ['Confirmar', 'Cancelar'], function (b) {
      if (b !== 0) return;
      if ($('pin-in').value === S.pin) { S.unlocked = true; fn(); if (S.mode === 'main') renderAll(); }
      else toast('Senha errada');
    });
  }

  /* ---------- configurações ---------- */
  function openSettings() {
    if (S.mode === 'splash' && !S.lists.length) { hide($('splash')); S.mode = 'main'; }
    S.pg = 'settings'; S.det = null; show($('page')); renderSettings();
  }
  function renderSettings() {
    var h = head('Configurações'), i;
    h += '<div class="sec-h">Minhas listas</div>';
    for (i = 0; i < S.lists.length; i++) {
      var L = S.lists[i];
      h += '<div class="lst' + (L.id === S.activeId ? ' on' : '') + '"><span class="rd" data-act="lsel" data-v="' + i + '"></span><div class="lt" data-act="lsel" data-v="' + i + '"><b>' + esc(L.name) + '</b><small>' + esc(L.type === 'xtream' ? 'Xtream · ' + L.server : (L.url || '')) + '</small></div><button class="ibtn" data-act="ledit" data-v="' + i + '">' + MICONS.edit + '</button><button class="ibtn" data-act="ldel" data-v="' + i + '">' + MICONS.trash + '</button></div>';
    }
    if (!S.lists.length) h += '<div class="note">Nenhuma lista ainda. Adicione a sua lista IPTV para começar.</div>';
    h += '<div class="opt" data-act="ledit" data-v="-1"><span class="oi">' + MICONS.plus + '</span><span>Adicionar lista</span></div>';
    if (S.lists.length) h += '<div class="opt" data-act="reload"><span class="oi">' + MICONS.reload + '</span><span>Atualizar a lista agora</span><small>baixa de novo</small></div>';
    h += '<div class="sec-h">Conteúdo adulto</div>';
    h += '<div class="opt" data-act="pinchg"><span class="oi">' + MICONS.lock + '</span><span>Trocar a senha</span></div>';
    if (S.unlocked) h += '<div class="opt" data-act="relock"><span class="oi">' + MICONS.lock + '</span><span>Bloquear de novo</span></div>';
    h += '<div class="sec-h">Aplicativo</div>';
    h += '<div class="opt" data-act="appupd"><span class="oi">' + MICONS.down + '</span><span>Atualizar o app</span><small>versão ' + APP_VER + '</small></div>';
    if (IOS) h += '<div class="note">No iPhone: abra no Safari, toque em Compartilhar e em "Adicionar à Tela de Início" para ter o NxTv como app. O Safari só abre listas com endereço https.</div>';
    $('page-in').innerHTML = h;
  }
  var ed = null;
  function openEditor(i) {
    var L = i >= 0 ? S.lists[i] : null;
    ed = { i: i, type: L ? L.type || 'm3u' : 'xtream', name: L ? L.name : '', url: L ? L.url || '' : '', server: L ? L.server || '' : '', user: L ? L.user || '' : '', pass: L ? L.pass || '' : '' };
    S.pg = 'editor'; renderEditor();
  }
  function edRead() {
    var f = function (id) { var el = $(id); return el ? trim(el.value) : ''; };
    if ($('ed-name')) { ed.name = f('ed-name'); if (ed.type === 'm3u') ed.url = f('ed-url'); else { ed.server = f('ed-server'); ed.user = f('ed-user'); ed.pass = f('ed-pass'); } }
  }
  function renderEditor() {
    var h = head(ed.i >= 0 ? 'Editar lista' : 'Nova lista') + '<div class="form">';
    h += '<div class="seg"><button data-act="edtype" data-v="xtream" class="' + (ed.type === 'xtream' ? 'on' : '') + '">Xtream (usuário e senha)</button><button data-act="edtype" data-v="m3u" class="' + (ed.type === 'm3u' ? 'on' : '') + '">Link M3U</button></div>';
    h += '<label>Nome da lista</label><input id="ed-name" type="text" value="' + esc(ed.name) + '" placeholder="Minha lista">';
    if (ed.type === 'm3u') h += '<label>Link da lista (M3U)</label><input id="ed-url" type="url" value="' + esc(ed.url) + '" placeholder="http://...">';
    else h += '<label>Servidor</label><input id="ed-server" type="url" value="' + esc(ed.server) + '" placeholder="http://servidor.com:8080"><label>Usuário</label><input id="ed-user" type="text" value="' + esc(ed.user) + '" autocapitalize="off"><label>Senha</label><input id="ed-pass" type="text" value="' + esc(ed.pass) + '" autocapitalize="off">';
    h += '<div class="dt-btns" style="padding:22px 0 0"><button class="btn pri full" data-act="edsave">Salvar e abrir</button></div></div>';
    $('page-in').innerHTML = h;
  }
  function edSave() {
    edRead();
    if (ed.type === 'm3u' ? !/^https?:\/\/.+/i.test(ed.url) : !(ed.server && ed.user && ed.pass)) { toast(ed.type === 'm3u' ? 'Coloque o link completo (http://...)' : 'Preencha servidor, usuário e senha'); return; }
    var L = ed.i >= 0 ? S.lists[ed.i] : { id: 'l' + now() };
    L.name = ed.name || 'Minha lista'; L.type = ed.type;
    if (ed.type === 'm3u') { L.url = ed.url; delete L.server; delete L.user; delete L.pass; } else { L.server = ed.server; L.user = ed.user; L.pass = ed.pass; delete L.url; }
    if (ed.i < 0) S.lists.push(L);
    S.activeId = L.id; saveLists(); ed = null;
    closePage(); startLoad(true);
  }

  /* ---------- atualização do app ---------- */
  function appUpdate() {
    if (!window.NxAndroid) { toast('Atualizando...'); setTimeout(function () { location.reload(); }, 400); return; }
    toast('Procurando atualização...');
    getText(UPD_BASE + 'app/version.json?t=' + now(), 20000, function (t) {
      var j = null; try { j = JSON.parse(t); } catch (e) { j = null; }
      if (!j || !j.ver) { toast('Não foi possível verificar agora'); return; }
      if (verNum(j.ver) <= verNum(APP_VER)) { toast('O app já está na versão mais nova (' + APP_VER + ')'); return; }
      var f = j.abs || {}, got = {}, keys = ['js', 'css', 'html'], left = 3;
      keys.forEach(function (k) {
        getText((f[k] || UPD_BASE + 'app/' + j.files[k]) + '?t=' + now(), 60000, function (tx) {
          got[k] = tx; left--;
          if (left) return;
          if (!got.js || !got.css || !got.html) { toast('Falha ao baixar a atualização'); return; }
          try {
            localStorage.setItem('nx_m_upd_js', got.js); localStorage.setItem('nx_m_upd_css', got.css); localStorage.setItem('nx_m_upd_html', got.html);
            localStorage.setItem('nx_m_upd_ver', j.ver); localStorage.removeItem('nx_m_upd_try'); localStorage.removeItem('nx_m_upd_bad');
          } catch (e) { toast('Sem espaço para a atualização'); return; }
          toast('Versão ' + j.ver + ' instalada. Reiniciando...'); setTimeout(function () { location.reload(); }, 1200);
        });
      });
    });
  }

  /* ---------- voltar (botão do Android) ---------- */
  function goBack() {
    if (!hasClass($('dlg'), 'hidden')) { closeDlg(-1); return; }
    if (S.sheet) { closeSheet(); return; }
    if (hasClass(document.body, 'fs')) { exitFs(); return; }
    if (S.pg === 'editor') { S.pg = 'settings'; renderSettings(); return; }
    if (!hasClass($('page'), 'hidden')) { closePage(); return; }
    if (S.searchOn) { closeSearch(); return; }
    if (Player.active || !hasClass($('player'), 'hidden')) { if (S.fullKind === 'vod') Res.save(S.cur); Player.stop(); return; }
    if (S.sec !== 'live') { S.sec = 'live'; renderAll(); return; }
    dialog('Sair do NxTv?', '', null, ['Sair', 'Cancelar'], function (b) { if (b === 0 && window.NxAndroid) bridge('exit'); });
  }
  window.nxKey = function (k) { if (k === 10009) goBack(); };
  window.nxPause = function () { if (S.fullKind === 'vod' && Player.active) Res.save(S.cur); };

  /* ---------- pesquisa ---------- */
  var mSearchT;
  function openSearch() { S.searchOn = true; S.prevSec = S.sec === 'search' ? 'live' : S.sec; renderTop(); var i = $('search-in'); i.value = S.query || ''; i.focus(); }
  function closeSearch() { S.searchOn = false; $('search-in').blur(); if (S.sec === 'search') S.sec = S.prevSec || 'live'; renderAll(); }

  /* ---------- toques ---------- */
  function onTap(e) {
    var el = e.target;
    while (el && el !== document.body && !el.getAttribute('data-act')) el = el.parentNode;
    if (!el || el === document.body) return;
    var a = el.getAttribute('data-act'), v = el.getAttribute('data-v'), i = +el.getAttribute('data-i'), k = el.getAttribute('data-k');
    if (a === 'tab') { if (S.searchOn) { S.searchOn = false; $('search-in').blur(); } S.sec = v; $('view').scrollTop = 0; S.lastView = null; renderAll(); return; }
    if (a === 'cats') { openCats(); return; }
    if (a === 'pickcat') {
      var gs = S.groups[S.sheet], gi = +v, sec = S.sheet;
      var pick = function () { S.pos[sec].c = gi; S.shown[sec + '|' + gi] = PAGE; closeSheet(); S.lastView = null; $('view').scrollTop = 0; renderAll(); };
      if (gs[gi].adult && !S.unlocked) needPin(pick); else pick();
      return;
    }
    if (a === 'unlock') { needPin(function () {}); return; }
    if (a === 'fav') {
      e.stopPropagation(); var c0 = S.ch[i]; if (c0.adult && !S.unlocked) return;
      favToggleObj('live', c0); setClass(el, 'on', !!S.favs[favKeyCh(c0)]); if (S.sec === 'fav') renderAll(); return;
    }
    if (a === 'favcur') { if (S.cur) { favToggleObj('live', S.cur); renderNowBar(); renderLater(); } return; }
    if (a === 'ch') {
      var c = S.ch[i];
      var play = function () {
        var list = [], par = el.parentNode, rows = par ? par.querySelectorAll('.row[data-i]') : [];
        for (var r = 0; r < rows.length; r++) list.push(+rows[r].getAttribute('data-i'));
        if (S.sec === 'live') { var g = curGroupOf('live'); if (g && g.items) list = g.items; }
        S.zapList = list;
        if (S.cur && S.cur.url === c.url && Player.active) enterFs(false); else Player.play(c);
      };
      if (c.adult && !S.unlocked) needPin(play); else play();
      return;
    }
    if (a === 'det') { openDetail(k, i); return; }
    if (a === 'pgback') { if (S.pg === 'editor') { S.pg = 'settings'; renderSettings(); } else closePage(); return; }
    if (a === 'playm') { playMovie(S.ch[S.det.i], v === '0'); return; }
    if (a === 'favdet') { var d = S.det, o = d.kind === 'series' ? S.series[d.i] : S.ch[d.i]; favToggleObj(d.kind, o); renderDetail(); return; }
    if (a === 'season') { S.det.se = +v; renderDetail(); return; }
    if (a === 'ep') { playEpisode(i); return; }
    if (a === 'ev') { evOpen(i); return; }
    if (a === 'evg') { S.pos.events.c = +v; renderAll(); return; }
    if (a === 'smore') { var key = 'search|' + v; S.shown[key] = (S.shown[key] || 30) + 60; renderAll(); return; }
    if (a === 'dlg') { closeDlg(+v); return; }
    if (a === 'lsel') { var L = S.lists[+v]; if (L.id !== S.activeId) { S.activeId = L.id; saveLists(); closePage(); startLoad(false); } return; }
    if (a === 'ledit') { openEditor(+v); return; }
    if (a === 'ldel') { var L2 = S.lists[+v]; dialog('Apagar a lista "' + L2.name + '"?', 'Ela sai só deste aparelho.', null, ['Apagar', 'Cancelar'], function (b) { if (b !== 0) return; S.lists.splice(+v, 1); if (S.activeId === L2.id) S.activeId = S.lists.length ? S.lists[0].id : null; saveLists(); renderSettings(); }); return; }
    if (a === 'reload') { closePage(); startLoad(true); return; }
    if (a === 'edtype') { edRead(); ed.type = v; renderEditor(); return; }
    if (a === 'edsave') { edSave(); return; }
    if (a === 'pinchg') {
      dialog('Trocar a senha', 'Digite a senha atual e depois a nova (4 números).', '<input id="pin-old" type="tel" inputmode="numeric" maxlength="4" placeholder="atual"><input id="pin-new" type="tel" inputmode="numeric" maxlength="4" placeholder="nova">', ['Salvar', 'Cancelar'], function (b) {
        if (b !== 0) return;
        if ($('pin-old').value !== S.pin) { toast('Senha atual errada'); return; }
        if (!/^\d{4}$/.test($('pin-new').value)) { toast('A nova senha precisa ter 4 números'); return; }
        S.pin = $('pin-new').value; save('nx_pin', S.pin); toast('Senha trocada');
      });
      return;
    }
    if (a === 'relock') { S.unlocked = false; toast('Conteúdo adulto bloqueado'); renderSettings(); return; }
    if (a === 'appupd') { appUpdate(); return; }
  }

  function bind() {
    document.addEventListener('click', onTap);
    $('btn-search').onclick = function () { if (S.searchOn) closeSearch(); else openSearch(); };
    $('btn-gear').onclick = function () { openSettings(); };
    $('search-in').addEventListener('input', function () {
      var q = this.value; clearTimeout(mSearchT);
      mSearchT = setTimeout(function () { if (trim(q).length >= 2 || S.sec === 'search') { S.shown = {}; doSearch(q); } }, 450);
    });
    $('search-in').addEventListener('keydown', function (e) { if (e.keyCode === 13) { this.blur(); clearTimeout(mSearchT); doSearch(this.value); } });
    $('sh-filter').addEventListener('input', function () { renderCats(this.value); });
    $('sh-close').onclick = closeSheet; document.querySelector('.sh-bg').onclick = closeSheet;
    $('sp-retry').onclick = function () { startLoad(true); };
    $('sp-cfg').onclick = function () { openSettings(); };
    // rolagem: carrega mais itens perto do fim
    $('view').addEventListener('scroll', function () {
      var v = this;
      if (v.scrollTop + v.clientHeight > v.scrollHeight - 700 && $('more')) { var k = shownKey(); S.shown[k] = shownN() + PAGE; renderView(); }
    }, { passive: true });
    // player
    var pl = $('player');
    pl.addEventListener('click', function (e) {
      var b = e.target; while (b && b !== pl && b.tagName !== 'BUTTON' && b.tagName !== 'INPUT') b = b.parentNode;
      if (b && b !== pl) return;
      if (hasClass(pl, 'ui-off')) uiShow(); else addClass(pl, 'ui-off');
    });
    $('pl-close').onclick = function () { if (hasClass(document.body, 'fs')) { exitFs(); return; } if (S.fullKind === 'vod') Res.save(S.cur); Player.stop(); };
    $('pl-fs').onclick = function () { if (hasClass(document.body, 'fs')) exitFs(); else enterFs(false); };
    $('pl-pp').onclick = function () { if (!Player.active && S.cur) { Player.play(S.cur); return; } Player.toggle(); uiShow(); };
    $('pl-prev').onclick = function () { zap(-1); uiShow(); };
    $('pl-next').onclick = function () { zap(1); uiShow(); };
    $('pl-back10').onclick = function () { Player.seek(-10000); uiShow(); };
    $('pl-fwd10').onclick = function () { Player.seek(10000); uiShow(); };
    var sk = $('pl-seek');
    sk.addEventListener('input', function () { S.seeking = true; var t = Player.times(); $('pl-cur').innerHTML = fmtTime(t[1] * sk.value / 1000); uiShow(); });
    sk.addEventListener('change', function () { var t = Player.times(); if (t[1] > 0) Player.seekAbs(t[1] * sk.value / 1000); S.seeking = false; });
    window.addEventListener('resize', onRotate);
    document.addEventListener('visibilitychange', function () { if (document.hidden && S.fullKind === 'vod' && Player.active) Res.save(S.cur); });
    setInterval(function () { if (S.fullKind === 'vod' && Player.active) { Res.save(S.cur); var t = Player.times(); if (t[1] > 0 && t[0] > t[1] * 0.92) markSeen(S.cur); } }, 10000);
  }

  function openMain(first) {
    S.mode = 'main'; hide($('splash'));
    if (first) {
      S.sec = 'live'; S.pos = newPos(); S.shown = {}; S.lastView = null;
      S.pos.live.c = allLiveIdx(); S.pos.movie.c = firstReal('movie'); S.pos.series.c = firstReal('series');
    }
    renderAll();
  }

  function init() {
    if (!IOS && !window.Hls) { var libs = ['js/hls.min.js', 'js/mpegts.js']; for (var li = 0; li < libs.length; li++) { var sc = document.createElement('script'); sc.src = libs[li]; document.body.appendChild(sc); } }
    $('btn-search').innerHTML = MICONS.search; $('btn-gear').innerHTML = MICONS.gear; $('sh-close').innerHTML = MICONS.close;
    $('pl-close').innerHTML = MICONS.close; $('pl-fs').innerHTML = MICONS.fs; $('pl-pp').innerHTML = MICONS.pause;
    $('pl-prev').innerHTML = MICONS.prev; $('pl-next').innerHTML = MICONS.next; $('pl-back10').innerHTML = MICONS.b10; $('pl-fwd10').innerHTML = MICONS.f10;
    if (IOS) addClass(document.body, 'ios');
    Player.init(); bind();
    S.favs = load('nx_favs', {}); S.watched = load('nx_watched', {}); S.recent = load('nx_recent', {}); S.pin = load('nx_pin', '0000'); S.order = load('nx_order', 'list');
    S.shown = {}; S.groups = { live: [], movie: [], series: [], fav: [], search: [] };
    loadLists();
    DB.open(function () {
      if (!S.lists.length) { hide($('splash')); S.mode = 'main'; renderAll(); openSettings(); openEditor(-1); return; }
      startLoad(false);
    });
  }
  init();
})();
