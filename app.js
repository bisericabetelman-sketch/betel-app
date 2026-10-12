(function () {
  'use strict';

  var C = window.BETEL;
  var L = window.I18N;

  // ---------- storage helpers (never let storage errors break the app) ----------
  function load(key, fallback) {
    try { var v = localStorage.getItem('betel.' + key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem('betel.' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  // ---------- state ----------
  var state = {
    lang: load('lang', (navigator.language || '').toLowerCase().indexOf('ro') === 0 ? 'ro' : 'en'),
    filter: 'all',
    region: 'uk',
    copied: '',
    videos: { status: 'idle', list: [] },
    playing: '',
    prayer: { name: '', req: '', vis: 'team', sent: false, error: false },
    prayed: load('prayed', {}),
    wall: { status: 'idle', items: [] },
    installDismissed: load('installDismissed', false),
    installEvent: null
  };

  function t(key) { var d = L[state.lang] || L.en; return d[key] !== undefined ? d[key] : (L.en[key] || key); }
  function tx(obj) { return obj ? (obj[state.lang] || obj.en || '') : ''; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- icons (inline stroke SVG) ----------
  function svg(path, size) {
    size = size || 20;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  var I = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5z"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    nav: '<path d="m3 11 18-8-8 18-2-8z"/>',
    list: '<path d="M4 6h16M4 12h10M4 18h7"/><path d="m16 15 5 3-5 3z"/>',
    yt: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
    fb: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z"/>',
    wa: '<path d="M3 21l1.6-4.6A8.5 8.5 0 1 1 7.7 19.6z"/><path d="M9 9.5c.3 2.2 2.3 4.2 4.5 4.5l1-1.2 2 .8-.5 1.7c-3.6.4-7.6-3.6-7.2-7.2l1.7-.5.8 2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  var PLAY_FILLED = '<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>';

  // ---------- time helpers (always UK time) ----------
  var DAYMAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function londonNow() {
    var parts = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
      weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return {
      y: +parts.year, m: +parts.month, d: +parts.day, dow: DAYMAP[parts.weekday],
      mins: (+parts.hour) * 60 + (+parts.minute)
    };
  }
  function toMins(hhmm) { var a = hhmm.split(':'); return (+a[0]) * 60 + (+a[1]); }
  function daysUntil(meeting, now) {
    var diff = (meeting.day - now.dow + 7) % 7;
    if (diff === 0 && now.mins > toMins(meeting.time) + meeting.durationMins) diff = 7;
    return diff;
  }
  function addDays(y, m, d, n) {
    var dt = new Date(Date.UTC(y, m - 1, d + n));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function nextMeeting() {
    var now = londonNow();
    var best = null;
    C.meetings.forEach(function (m) {
      var days = daysUntil(m, now);
      var score = days * 1440 + toMins(m.time);
      if (!best || score < best.score) best = { m: m, days: days, score: score };
    });
    return best;
  }
  function whenLabel(days, m) {
    if (days === 0) return t('today') + ' · ' + m.time;
    if (days === 1) return t('tomorrow') + ' · ' + m.time;
    var day = t('days')[m.day];
    return day.charAt(0).toUpperCase() + day.slice(1) + ' · ' + m.time;
  }
  function everyLabel(m) {
    var day = t('days')[m.day];
    return state.lang === 'ro' ? 'În fiecare ' + day : 'Every ' + day;
  }
  function placeOf(m) { return m.atChurch ? C.address : t('inHomes'); }

  // ---------- calendar (.ics) ----------
  var VTZ = [
    'BEGIN:VTIMEZONE', 'TZID:Europe/London',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0000', 'TZOFFSETTO:+0100', 'TZNAME:BST',
    'DTSTART:19700329T010000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0000', 'TZNAME:GMT',
    'DTSTART:19701025T020000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'
  ];
  function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function stamp(dt, mins) { return '' + dt.y + pad(dt.m) + pad(dt.d) + 'T' + pad(Math.floor(mins / 60)) + pad(mins % 60) + '00'; }
  function downloadIcs(filename, lines) {
    var now = new Date();
    var dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Betel Manchester//App//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
      .concat(VTZ)
      .concat(['BEGIN:VEVENT', 'DTSTAMP:' + dtstamp])
      .concat(lines)
      .concat(['END:VEVENT', 'END:VCALENDAR']).join('\r\n');
    var blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function addMeetingToCalendar(m) {
    var now = londonNow();
    var date = addDays(now.y, now.m, now.d, daysUntil(m, now));
    var start = toMins(m.time);
    var end = Math.min(start + m.durationMins, 23 * 60 + 59);
    downloadIcs('betel-' + m.id + '.ics', [
      'UID:betel-' + m.id + '@betelmanchester',
      'SUMMARY:' + icsText(tx(m.title) + ' – Betel Manchester'),
      'DTSTART;TZID=Europe/London:' + stamp(date, start),
      'DTEND;TZID=Europe/London:' + stamp(date, end),
      'RRULE:FREQ=WEEKLY',
      'LOCATION:' + icsText(m.atChurch ? C.address : t('inHomes'))
    ]);
    toast(t('addCal') + ' ✓');
  }
  function addEventToCalendar(ev) {
    var p = ev.date.split('-'); var start = { y: +p[0], m: +p[1], d: +p[2] };
    var lines = ['UID:betel-' + ev.id + '@betelmanchester', 'SUMMARY:' + icsText(tx(ev.title) + ' – Betel Manchester')];
    if (ev.time) {
      lines.push('DTSTART;TZID=Europe/London:' + stamp(start, toMins(ev.time)));
      lines.push('DURATION:PT2H');
    } else {
      var e = ev.endDate ? ev.endDate.split('-') : p;
      var endDay = addDays(+e[0], +e[1], +e[2], 1);
      lines.push('DTSTART;VALUE=DATE:' + start.y + pad(start.m) + pad(start.d));
      lines.push('DTEND;VALUE=DATE:' + endDay.y + pad(endDay.m) + pad(endDay.d));
    }
    if (ev.place) lines.push('LOCATION:' + icsText(ev.place));
    downloadIcs('betel-' + ev.id + '.ics', lines);
    toast(t('addCal') + ' ✓');
  }

  // ---------- links ----------
  function waLink(text) { return 'https://wa.me/' + C.whatsapp + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function mailLink(subject, body) {
    return 'mailto:' + C.email + '?subject=' + encodeURIComponent(subject || '') + (body ? '&body=' + encodeURIComponent(body) : '');
  }

  // ---------- toast ----------
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  // ---------- copy ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* ignore */ }
      ta.remove(); resolve();
    });
  }

  // ---------- routing ----------
  var ROUTES = ['home', 'meetings', 'watch', 'give', 'prayer'];
  function route() {
    var r = (location.hash || '').replace(/^#\/?/, '');
    return ROUTES.indexOf(r) >= 0 ? r : 'home';
  }

  function renderTabs(current) {
    var tabs = [
      ['home', 'tabHome', I.home], ['meetings', 'tabMeetings', I.cal], ['watch', 'tabWatch', I.play],
      ['give', 'tabGive', I.heart], ['prayer', 'tabPrayer', I.chat]
    ];
    document.getElementById('tabs').innerHTML = '<div class="tabs-inner">' + tabs.map(function (tb) {
      return '<a class="tab" href="#/' + tb[0] + '"' + (tb[0] === current ? ' aria-current="page"' : '') + '><span class="ic">' + svg(tb[2], 22) + '</span>' + esc(t(tb[1])) + '</a>';
    }).join('') + '</div>';
  }

  function pageHead(titleKey, subKey, introKey) {
    return '<div class="page-head"><div class="eyebrow-sm">' + esc(t(subKey)) + '</div><h1>' + esc(t(titleKey)) + '</h1>' +
      (introKey ? '<p>' + esc(t(introKey)) + '</p>' : '') + '</div>';
  }

  // ---------- HOME ----------
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
  function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; }

  function viewHome() {
    var nx = nextMeeting();
    var m = nx.m;
    var now = londonNow();
    var verse = C.verses[(Math.floor(Date.UTC(now.y, now.m - 1, now.d) / 86400000)) % C.verses.length];
    var weekly = C.meetings.slice().sort(function (a, b) { return ((a.day + 6) % 7) - ((b.day + 6) % 7); });

    var install = '';
    if (!isStandalone() && !state.installDismissed && (state.installEvent || isIos())) {
      install = '<div class="install"><img src="logo-mark.png" alt=""><div class="txt">' + esc(t('install')) +
        (state.installEvent ? '' : '<div class="small">' + esc(t('installIos')) + '</div>') + '</div>' +
        (state.installEvent ? '<button class="btn btn-primary" data-action="install">' + esc(t('installBtn')) + '</button>' : '') +
        '<button class="icon-btn" data-action="dismiss-install" aria-label="Close">' + svg(I.x) + '</button></div>';
    }

    return '' +
      '<div class="brand"><div class="brand-left"><img src="logo-mark.png" alt="Betel"><div class="stack-2">' +
      '<div class="brand-sub">' + esc(C.fullName.replace(' Betel Manchester', '')) + '</div><h1>' + esc(C.name) + '</h1></div></div>' +
      '<button class="round-btn" data-action="lang" aria-label="' + (state.lang === 'en' ? 'Schimbă în română' : 'Switch to English') + '">' + (state.lang === 'en' ? 'RO' : 'EN') + '</button></div>' +
      install +
      '<section class="hero" aria-label="' + esc(t('nextMeeting')) + '">' +
        '<div class="eyebrow">' + esc(t('nextMeeting')) + ' · ' + esc(whenLabel(nx.days, m)) + '</div>' +
        '<div class="stack-2"><div class="title">' + esc(tx(m.title)) + '</div>' +
        '<div class="sub">' + esc(m.title[state.lang === 'en' ? 'ro' : 'en']) + '</div>' +
        '<div class="place">' + svg(I.pin, 16) + esc(placeOf(m)) + '</div></div>' +
        '<div class="row-btns">' +
          (m.atChurch
            ? '<a class="btn btn-accent" href="' + esc(C.mapsUrl) + '" target="_blank" rel="noopener">' + svg(I.nav, 18) + esc(t('directions')) + '</a>'
            : '<a class="btn btn-accent" href="' + esc(waLink(t('askWhereMsg').replace('{title}', tx(m.title)))) + '" target="_blank" rel="noopener">' + svg(I.wa, 18) + esc(t('askWhereShort')) + '</a>') +
          '<a class="btn btn-ghost-light" href="#/watch">' + svg(I.play, 18) + esc(t('watchOnline')) + '</a>' +
        '</div>' +
      '</section>' +
      '<div class="quick">' +
        '<a href="#/give"><span class="ic">' + svg(I.heart, 24) + '</span>' + esc(t('tabGive')) + '</a>' +
        '<a href="#/prayer"><span class="ic">' + svg(I.chat, 24) + '</span>' + esc(t('tabPrayer')) + '</a>' +
        '<a href="#/meetings"><span class="ic">' + svg(I.cal, 24) + '</span>' + esc(t('tabMeetings')) + '</a>' +
        '<a href="#/watch"><span class="ic">' + svg(I.list, 24) + '</span>' + esc(t('tabWatch')) + '</a>' +
      '</div>' +
      '<section class="section"><div class="section-head"><h2>' + esc(t('everyWeek')) + '</h2><a class="link" href="#/meetings">' + esc(t('seeAll')) + '</a></div>' +
        '<div class="list">' + weekly.map(function (w) {
          return '<div class="list-row"><div class="datebox' + (w.id === m.id ? ' solid' : '') + '"><span class="d">' + esc(t('daysShort')[w.day]) + '</span><span class="t">' + esc(w.time) + '</span></div>' +
            '<div class="stack-2"><div class="row-title">' + esc(tx(w.title)) + '</div><div class="row-sub">' + esc(w.atChurch ? t('atChurch') : t('inHomes')) + '</div></div></div>';
        }).join('') + '</div></section>' +
      '<section class="card" aria-label="' + esc(t('verse')) + '"><div class="meet-when">' + esc(t('verse')) + '</div>' +
        '<div style="font-family: var(--serif); font-size: 21px; line-height: 1.3">“' + esc(state.lang === 'ro' ? verse.ro : verse.en) + '”</div>' +
        '<div class="row-sub">' + esc(state.lang === 'ro' ? verse.refRo : verse.ref) + '</div></section>' +
      '<section class="section"><h2>' + esc(t('contactFollow')) + '</h2><div class="btn-grid">' +
        '<a class="btn btn-primary" href="' + esc(waLink('')) + '" target="_blank" rel="noopener">' + svg(I.wa) + 'WhatsApp</a>' +
        '<a class="btn btn-primary" href="' + esc(mailLink('Betel Manchester')) + '">' + svg(I.mail) + esc(t('email')) + '</a>' +
        '<a class="btn btn-plain" href="' + esc(C.youtube.channelUrl) + '" target="_blank" rel="noopener">' + svg(I.yt) + 'YouTube</a>' +
        '<a class="btn btn-plain" href="' + esc(C.facebook) + '" target="_blank" rel="noopener">' + svg(I.fb) + 'Facebook</a>' +
      '</div></section>' +
      '<p class="small center">' + esc(C.fullName) + ' · ' + esc(t('charity')) + ' ' + esc(C.charityNumber) + '</p>';
  }

  // ---------- MEETINGS ----------
  function viewMeetings() {
    var filters = [['all', 'fAll'], ['church', 'fChurch'], ['men', 'fMen'], ['sisters', 'fSisters']];
    var now = londonNow();
    var items = C.meetings.slice().sort(function (a, b) {
      return (daysUntil(a, now) * 1440 + toMins(a.time)) - (daysUntil(b, now) * 1440 + toMins(b.time));
    }).filter(function (m) { return state.filter === 'all' || m.cat === state.filter; });
    var today = '' + now.y + '-' + pad(now.m) + '-' + pad(now.d);
    var events = (C.specialEvents || []).filter(function (e) { return (e.endDate || e.date) >= today && (state.filter === 'all' || state.filter === 'church'); });

    return pageHead('meetingsTitle', 'meetingsSub') +
      '<div class="pills" role="group" aria-label="Filter">' + filters.map(function (f) {
        return '<button class="pill" data-action="filter" data-value="' + f[0] + '" aria-pressed="' + (state.filter === f[0]) + '">' + esc(t(f[1])) + '</button>';
      }).join('') + '</div>' +
      '<div class="section">' + items.map(function (m) {
        return '<article class="card"><div class="meet-top"><div class="datebox"><span class="d">' + esc(t('daysShort')[m.day]) + '</span><span class="t">' + esc(m.time) + '</span></div>' +
          '<div class="stack-2"><div class="meet-when">' + esc(everyLabel(m)) + '</div><div class="meet-title">' + esc(tx(m.title)) + '</div>' +
          '<div class="row-sub">' + esc(m.title[state.lang === 'en' ? 'ro' : 'en']) + '</div>' +
          '<div class="meet-place">' + svg(I.pin, 14) + esc(placeOf(m)) + '</div></div></div>' +
          '<div class="meet-actions">' +
            '<button class="btn btn-outline" data-action="cal" data-id="' + m.id + '">' + svg(I.cal, 18) + esc(t('addCal')) + '</button>' +
            (m.atChurch
              ? '<a class="btn btn-plain" href="' + esc(C.mapsUrl) + '" target="_blank" rel="noopener">' + svg(I.nav, 18) + esc(t('directions')) + '</a>'
              : '<a class="btn btn-plain" href="' + esc(waLink(t('askWhereMsg').replace('{title}', tx(m.title)))) + '" target="_blank" rel="noopener">' + svg(I.wa, 18) + esc(t('askWhere')) + '</a>') +
          '</div></article>';
      }).join('') +
      events.map(function (ev) {
        var p = ev.date.split('-');
        var mon = new Intl.DateTimeFormat(state.lang === 'ro' ? 'ro-RO' : 'en-GB', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]))).toUpperCase();
        return '<article class="card"><div class="meet-top"><div class="datebox light"><span class="d">' + esc(mon) + '</span><span class="t">' + (+p[2]) + '</span></div>' +
          '<div class="stack-2"><div class="meet-when">' + esc(t('special')) + '</div><div class="meet-title">' + esc(tx(ev.title)) + '</div>' +
          (ev.place ? '<div class="meet-place">' + svg(I.pin, 14) + esc(ev.place) + '</div>' : '') + '</div></div>' +
          '<div class="meet-actions"><button class="btn btn-outline" data-action="cal-event" data-id="' + esc(ev.id) + '">' + svg(I.cal, 18) + esc(t('addCal')) + '</button></div></article>';
      }).join('') + '</div>';
  }

  // ---------- WATCH ----------
  function loadVideos() {
    if (state.videos.status !== 'idle') return;
    state.videos.status = 'loading';
    fetch(C.latestVideosEndpoint, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (xml) {
        var doc = new DOMParser().parseFromString(xml, 'application/xml');
        var NS = 'http://www.youtube.com/xml/schemas/2015';
        var list = Array.prototype.map.call(doc.getElementsByTagName('entry'), function (e) {
          var idEl = e.getElementsByTagNameNS(NS, 'videoId')[0] || e.getElementsByTagName('yt:videoId')[0];
          var tEl = e.getElementsByTagName('title')[0];
          var pEl = e.getElementsByTagName('published')[0];
          return { id: idEl ? idEl.textContent.trim() : '', title: tEl ? tEl.textContent.trim() : '', published: pEl ? pEl.textContent.trim() : '' };
        }).filter(function (v) { return v.id; });
        state.videos = { status: list.length ? 'ok' : 'error', list: list };
        if (route() === 'watch') render();
      })
      .catch(function () { state.videos = { status: 'error', list: [] }; if (route() === 'watch') render(); });
  }
  function thumb(id) { return 'https://i.ytimg.com/vi/' + encodeURIComponent(id) + '/hqdefault.jpg'; }
  function fmtDate(iso) {
    try { return new Intl.DateTimeFormat(state.lang === 'ro' ? 'ro-RO' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }).format(new Date(iso)); }
    catch (e) { return ''; }
  }
  function viewWatch() {
    loadVideos();
    var v = state.videos;
    var main = '';
    if (v.status === 'ok') {
      var first = v.list[0];
      var cur = state.playing ? (v.list.filter(function (x) { return x.id === state.playing; })[0] || first) : first;
      var player = state.playing
        ? '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(cur.id) + '?autoplay=1&rel=0&playsinline=1" title="' + esc(cur.title) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'
        : '<img src="' + thumb(cur.id) + '" alt="" loading="lazy" onerror="this.remove()"><span class="badge"><span class="dot"></span>' + esc(t('latest').toUpperCase()) + '</span>' +
          '<button class="play" data-action="play" data-id="' + esc(cur.id) + '" aria-label="Play: ' + esc(cur.title) + '">' + PLAY_FILLED + '</button>';
      main = '<div class="section"><div class="video">' + player + '</div>' +
        '<div class="stack-2"><div style="font-size: 19px; font-weight: 700; line-height: 1.3">' + esc(cur.title) + '</div><div class="row-sub">' + esc(fmtDate(cur.published)) + '</div></div></div>';
      var rest = v.list.filter(function (x) { return x.id !== cur.id; }).slice(0, 6);
      if (rest.length) {
        main += '<section class="section"><h2>' + esc(t('latestVideos')) + '</h2>' + rest.map(function (x) {
          return '<button class="vid-row" data-action="play" data-id="' + esc(x.id) + '"><img src="' + thumb(x.id) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
            '<span class="stack-2"><span class="vid-title">' + esc(x.title) + '</span><span class="row-sub">' + esc(fmtDate(x.published)) + '</span></span></button>';
        }).join('') + '</section>';
      }
    } else if (v.status === 'error') {
      main = '<div class="card"><div class="row-sub">' + esc(t('videosUnavailable')) + '</div>' +
        '<a class="btn btn-primary" href="' + esc(C.youtube.channelUrl + '/streams') + '" target="_blank" rel="noopener">' + svg(I.yt) + esc(t('openYouTube')) + '</a></div>';
    } else {
      main = '<div class="video"><span style="color: #C9F0F0">' + esc(t('loadingVideos')) + '</span></div>';
    }

    var sun = C.meetings.filter(function (m) { return m.day === 0; })[0];
    return pageHead('watchTitle', 'watchSub') +
      '<div class="card live-bar" style="flex-direction: row"><span class="dot" style="width:10px;height:10px;flex:none"></span>' +
        '<div class="stack-2" style="flex:1"><div class="row-title">' + esc(t('sundayWorship')) + '</div><div class="row-sub">' + esc(t('everySunday')) + '</div></div>' +
        '<a class="btn btn-primary" href="' + esc(C.youtube.channelUrl + '/live') + '" target="_blank" rel="noopener">' + esc(t('liveNow')) + '</a></div>' +
      main +
      '<div class="btn-grid">' +
        '<a class="btn btn-plain" href="' + esc(C.youtube.channelUrl + '/streams') + '" target="_blank" rel="noopener">' + svg(I.yt) + esc(t('allStreams')) + '</a>' +
        (sun ? '<button class="btn btn-plain" data-action="cal" data-id="' + sun.id + '">' + svg(I.cal) + esc(t('remind')) + '</button>' : '') +
        '<a class="btn btn-plain" href="' + esc(C.facebook) + '" target="_blank" rel="noopener">' + svg(I.fb) + 'Facebook</a>' +
        '<a class="btn btn-plain" href="' + esc(C.youtube.channelUrl) + '" target="_blank" rel="noopener">' + svg(I.ext) + 'YouTube</a>' +
      '</div>';
  }

  // ---------- GIVE ----------
  function viewGive() {
    var b = C.giving.bank;
    var rows = state.region === 'uk'
      ? [['accName', b.accountName], ['sortCode', b.sortCode], ['accNumber', b.accountNumber], ['bank', b.bankName]]
      : [['accName', b.accountName], ['iban', b.iban], ['bic', b.bic], ['bank', b.bankName + ', UK']];
    var online = C.giving.stripePaymentLink
      ? '<section class="card"><div class="stack-2"><h2 style="font-size: 22px">' + esc(t('giveOnline')) + '</h2><div class="row-sub">' + esc(t('giveOnlineSub')) + '</div></div>' +
        '<a class="btn btn-lg btn-primary" href="' + esc(C.giving.stripePaymentLink) + '" target="_blank" rel="noopener">' + svg(I.card) + esc(t('giveOnline')) + '</a></section>'
      : '';
    return pageHead('giveTitle', 'giveSub', 'giveIntro') + online +
      '<section class="card"><div class="stack-2"><h2 style="font-size: 22px">' + esc(t('bankTitle')) + '</h2><div class="row-sub">' + esc(t('bankSub')) + '</div></div>' +
        '<div class="seg" role="group" aria-label="' + esc(t('bankTitle')) + '">' +
          '<button data-action="region" data-value="uk" aria-pressed="' + (state.region === 'uk') + '">' + esc(t('fromUK')) + '</button>' +
          '<button data-action="region" data-value="intl" aria-pressed="' + (state.region === 'intl') + '">' + esc(t('fromAbroad')) + '</button>' +
        '</div><div>' + rows.map(function (r) {
          var done = state.copied === r[0];
          var copyVal = r[0] === 'iban' ? r[1].replace(/\s/g, '') : r[1];
          return '<div class="kv"><div class="stack-2"><span class="k">' + esc(t(r[0])) + '</span><span class="v">' + esc(r[1]) + '</span></div>' +
            (r[0] === 'bank' ? '' : '<button class="copy' + (done ? ' done' : '') + '" data-action="copy" data-key="' + r[0] + '" data-value="' + esc(copyVal) + '" aria-label="' + esc(t('copy') + ' ' + t(r[0])) + '">' + esc(done ? t('copied') : t('copy')) + '</button>') + '</div>';
        }).join('') + '</div>' +
        '<div class="small">' + esc(t('reference')) + '</div></section>' +
      '<section class="card"><h2 style="font-size: 22px">' + esc(t('giftAidTitle')) + '</h2><div class="row-sub" style="line-height: 1.45">' + esc(t('giftAidText')) + '</div>' +
        '<a class="btn btn-outline" href="' + esc(mailLink('Gift Aid', t('giftAidMsg'))) + '">' + svg(I.mail, 18) + esc(t('giftAidAsk')) + '</a></section>' +
      '<p class="small center">' + esc(C.fullName) + ' · ' + esc(t('charity')) + ' ' + esc(C.charityNumber) + '</p>';
  }

  // ---------- PRAYER ----------
  function wallEnabled() { return !!(C.prayerWall.supabaseUrl && C.prayerWall.supabaseAnonKey); }
  function sbHeaders(extra) {
    var h = { apikey: C.prayerWall.supabaseAnonKey, Authorization: 'Bearer ' + C.prayerWall.supabaseAnonKey, 'Content-Type': 'application/json' };
    for (var k in extra) h[k] = extra[k];
    return h;
  }
  function loadWall() {
    if (!wallEnabled() || state.wall.status !== 'idle') return;
    state.wall.status = 'loading';
    fetch(C.prayerWall.supabaseUrl.replace(/\/$/, '') + '/rest/v1/prayer_requests?select=id,first_name,request,created_at&approved=eq.true&order=created_at.desc&limit=30', { headers: sbHeaders({}) })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (rows) { state.wall = { status: 'ok', items: rows }; if (route() === 'prayer') render(); })
      .catch(function () { state.wall = { status: 'error', items: [] }; if (route() === 'prayer') render(); });
  }
  function postToWall(name, req) {
    if (!wallEnabled()) return;
    fetch(C.prayerWall.supabaseUrl.replace(/\/$/, '') + '/rest/v1/prayer_requests', {
      method: 'POST', headers: sbHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ first_name: name.slice(0, 40) || null, request: req.slice(0, 1000) })
    }).catch(function () { /* the WhatsApp/email message is still sent */ });
  }
  function prayerMessage() {
    var p = state.prayer;
    return t('msgPrayer') + (p.name ? ' ' + t('msgFrom') + ' ' + p.name : '') + '\n\n' + p.req + '\n\n(' + (p.vis === 'team' ? t('msgTeam') : t('msgWall')) + ')';
  }
  function viewPrayer() {
    loadWall();
    var p = state.prayer;
    var thu = C.meetings.filter(function (m) { return m.id === 'thu'; })[0];
    var form = p.sent
      ? '<div class="thanks"><h2>' + esc(t('thanksTitle')) + '</h2><p>' + esc(t('thanksText')) + '</p>' +
        '<button class="btn btn-done" data-action="new-request">' + esc(t('newRequest')) + '</button></div>'
      : '<div class="card">' +
          '<div class="field"><label class="lbl" for="pname">' + esc(t('yourName')) + ' <span style="font-weight:400;color:var(--muted)">' + esc(t('optional')) + '</span></label>' +
          '<input class="input" id="pname" type="text" autocomplete="given-name" maxlength="40" placeholder="' + esc(t('firstName')) + '" value="' + esc(p.name) + '" data-input="name"></div>' +
          '<div class="field"><label class="lbl" for="preq">' + esc(t('request')) + '</label>' +
          '<textarea class="input" id="preq" rows="4" maxlength="1000" placeholder="' + esc(t('requestPh')) + '" data-input="req">' + esc(p.req) + '</textarea>' +
          (p.error ? '<div class="error" role="alert">' + esc(t('writeFirst')) + '</div>' : '') + '</div>' +
          '<div class="seg" role="radiogroup" aria-label="' + esc(t('request')) + '">' +
            '<button role="radio" data-action="vis" data-value="team" aria-pressed="' + (p.vis === 'team') + '" aria-checked="' + (p.vis === 'team') + '">' + esc(t('teamOnly')) + '</button>' +
            '<button role="radio" data-action="vis" data-value="wall" aria-pressed="' + (p.vis === 'wall') + '" aria-checked="' + (p.vis === 'wall') + '">' + esc(t('wallOk')) + '</button>' +
          '</div>' +
          '<div class="btn-grid"><button class="btn btn-lg btn-primary" data-action="send-wa">' + svg(I.wa) + 'WhatsApp</button>' +
          '<button class="btn btn-lg btn-outline" data-action="send-mail">' + svg(I.mail) + esc(t('email')) + '</button></div>' +
          '<div class="small center">' + esc(t('sendNote')) + '</div></div>';

    var wall = '';
    if (wallEnabled()) {
      var items = state.wall.items;
      wall = '<section class="section"><h2>' + esc(t('prayerWall')) + '</h2>' +
        (state.wall.status === 'ok' && !items.length ? '<div class="row-sub">' + esc(t('wallEmpty')) + '</div>' : '') +
        items.map(function (w) {
          var done = !!state.prayed[w.id];
          return '<div class="card wall-item"><div class="stack-2"><div class="row-title">' + esc(w.first_name || '—') + '</div><p>' + esc(w.request) + '</p></div>' +
            '<button class="btn ' + (done ? 'btn-done' : 'btn-plain') + '" style="align-self:flex-start" data-action="prayed" data-id="' + esc(w.id) + '" aria-pressed="' + done + '">' + esc(done ? t('prayed') : t('iPrayed')) + '</button></div>';
        }).join('') + '</section>';
    }

    return pageHead('prayerTitle', 'prayerSub', 'prayerIntro') +
      (thu ? '<div class="hero" style="flex-direction: row; align-items: center; padding: 16px; border-radius: 18px"><div class="datebox light"><span class="d">' + esc(t('daysShort')[thu.day]) + '</span><span class="t">' + esc(thu.time) + '</span></div>' +
        '<div class="stack-2"><div class="row-title">' + esc(t('prayerEvery')) + '</div><div class="sub" style="font-size:14px">' + esc(C.address) + '</div></div></div>' : '') +
      form + wall;
  }

  // ---------- render ----------
  var lastRoute = null;
  function render() {
    var r = route();
    document.documentElement.lang = state.lang;
    renderTabs(r);
    var view = document.getElementById('view');
    var html = r === 'meetings' ? viewMeetings() : r === 'watch' ? viewWatch() : r === 'give' ? viewGive() : r === 'prayer' ? viewPrayer() : viewHome();
    view.innerHTML = html;
    if (r !== lastRoute) {
      window.scrollTo(0, 0);
      if (lastRoute !== null) view.focus({ preventScroll: true });
      lastRoute = r;
    }
  }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');
    var val = el.getAttribute('data-value');

    if (a === 'lang') { state.lang = state.lang === 'en' ? 'ro' : 'en'; save('lang', state.lang); render(); }
    else if (a === 'filter') { state.filter = val; render(); }
    else if (a === 'cal') { var m = C.meetings.filter(function (x) { return x.id === id; })[0]; if (m) addMeetingToCalendar(m); }
    else if (a === 'cal-event') { var ev = (C.specialEvents || []).filter(function (x) { return x.id === id; })[0]; if (ev) addEventToCalendar(ev); }
    else if (a === 'region') { state.region = val; state.copied = ''; render(); }
    else if (a === 'copy') {
      var key = el.getAttribute('data-key');
      copyText(val).then(function () { state.copied = key; render(); toast(t('copied') + ' ✓'); });
    }
    else if (a === 'play') { state.playing = id; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (a === 'vis') { state.prayer.vis = val; render(); }
    else if (a === 'send-wa' || a === 'send-mail') {
      var p = state.prayer;
      if (!p.req.trim()) { p.error = true; render(); var ta = document.getElementById('preq'); if (ta) ta.focus(); return; }
      var msg = prayerMessage();
      if (p.vis === 'wall') postToWall(p.name.trim(), p.req.trim());
      if (a === 'send-wa') window.open(waLink(msg), '_blank', 'noopener');
      else window.location.href = mailLink(t('msgPrayer') + (p.name ? ' – ' + p.name : ''), msg);
      p.sent = true; p.error = false; render();
    }
    else if (a === 'new-request') { state.prayer = { name: '', req: '', vis: 'team', sent: false, error: false }; render(); }
    else if (a === 'prayed') { state.prayed[id] = !state.prayed[id]; save('prayed', state.prayed); render(); }
    else if (a === 'install' && state.installEvent) {
      state.installEvent.prompt();
      state.installEvent.userChoice.finally(function () { state.installEvent = null; render(); });
    }
    else if (a === 'dismiss-install') { state.installDismissed = true; save('installDismissed', true); render(); }
  });

  // typing updates state without re-rendering (keeps the keyboard open)
  document.addEventListener('input', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-input');
    if (!k) return;
    state.prayer[k] = e.target.value;
    if (k === 'req' && state.prayer.error && e.target.value.trim()) {
      state.prayer.error = false;
      var err = document.querySelector('.error'); if (err) err.remove();
    }
  });

  window.addEventListener('hashchange', function () { state.playing = ''; render(); });
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); state.installEvent = e; if (route() === 'home') render(); });

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  render();
})();
