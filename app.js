/* Computability practice site. Questions come from bank.js (generated from the summary site). */
(function () {
  "use strict";
  var B = window.BANK, Q = B.questions;
  var QID = {}; Q.forEach(function (q) { QID[q.id] = q; });
  var EX = {}; B.exams.forEach(function (e) { EX[e.code] = e; });
  var TP = {}; B.topics.forEach(function (t) { TP[t.key] = t; });
  var LET = "אבגדהוזח";
  var app = document.getElementById("app");

  /* ---------- saved progress (this device only) ---------- */
  var KEY = "computque-v1";
  var S = { ans: {}, grades: {}, marked: [], mcq: {} };
  try { var s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) S = Object.assign(S, s); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function plain(h) { var d = document.createElement("div"); d.innerHTML = h || ""; return d.textContent.trim(); }
  function done(id) { return S.grades[id] !== undefined; }

  /* ---------- WHILE syntax highlighting (same as the summary site) ---------- */
  var KW = /^(read|write|while|do|if|then|else|case|of|goto|where|and|push|pop)$/, OP = /^(hd|tl|cons|list|succ|pred|quote|var)$/, CST = /^(nil|true|false)$/;
  function hl(src) {
    var re = /(\/\/[^\n]*)|("[^"\n]*")|(^[ \t]*\d+:)|([A-Za-z_][A-Za-z0-9_]*)|(\d+)|([\s\S])/gm, out = "", m;
    while ((m = re.exec(src))) {
      if (m[1]) out += '<span class="cmt">' + esc(m[1]) + "</span>";
      else if (m[2]) out += '<span class="cst">' + esc(m[2]) + "</span>";
      else if (m[3]) out += '<span class="lbl">' + esc(m[3]) + "</span>";
      else if (m[4]) out += KW.test(m[4]) ? '<span class="kw">' + m[4] + "</span>" : OP.test(m[4]) ? '<span class="op">' + m[4] + "</span>" : CST.test(m[4]) ? '<span class="cst">' + m[4] + "</span>" : m[4];
      else if (m[5]) out += '<span class="cst">' + m[5] + "</span>";
      else out += esc(m[6]);
    }
    return out;
  }
  function hlAll(root) { root.querySelectorAll("pre.wh").forEach(function (p) { p.innerHTML = hl(p.textContent); }); }

  /* ---------- question card ---------- */
  function hintsHTML(hs) {
    return (hs || []).map(function (h) {
      return '<details class="hint" data-nocopy><summary>💡 ' + esc(h.label || "רמז") + "</summary><div>" + h.html + "</div></details>";
    }).join("");
  }
  function partLabel(p, i, q) {
    if (p.label) return p.label;
    return q.parts.length > 1 ? "סעיף " + (i + 1) : "";
  }
  function card(q) {
    var marked = S.marked.indexOf(q.id) >= 0, g = S.grades[q.id];
    var h = '<article class="qcard practice-question" id="q-' + esc(q.id) + '" data-qid="' + esc(q.id) + '" data-label="' + esc("מבחן " + EX[q.exam].label + " · " + q.label) + '">';
    h += '<div class="qtop"><a class="tag ex" href="#exam-' + q.exam + '">מבחן ' + esc(EX[q.exam].label) + " · " + esc(q.label) + "</a>";
    h += '<a class="tag" href="#topic-' + q.topic + '">' + esc(TP[q.topic].label) + "</a>";
    if (q.points) h += '<span class="tag pts">' + q.points + " נק׳</span>";
    if (g !== undefined) h += '<span class="grade-badge g' + g + '">' + ["לא הצלחתי", "חלקית", "פתרתי ✓"][g] + "</span>";
    h += '<button type="button" class="star' + (marked ? " on" : "") + '" data-act="mark">' + (marked ? "★ מסומנת" : "☆ סמן לחזרה") + "</button></div>";
    if (plain(q.title)) h += '<h3 class="qt">' + q.title + "</h3>";
    h += '<div class="question-text">';
    if (q.intro) h += q.intro;
    if (q.introHints && q.introHints.length) h += '<div class="ctrl" data-nocopy>' + hintsHTML(q.introHints) + "</div>";
    if (q.type === "mcq") {
      h += q.parts[0].q + "</div>";
      var chosen = S.mcq[q.id];
      h += '<div class="options-list">' + q.options.map(function (o, i) {
        var cls = chosen === undefined ? "" : i === q.correct ? " right" : i === chosen ? " wrong" : "";
        return '<button type="button" class="option-item' + cls + '" data-act="opt" data-i="' + i + '"' + (chosen !== undefined ? " disabled" : "") + '><span class="ol">' + LET[i] + ".</span><span>" + o + "</span></button>";
      }).join("") + "</div>";
      h += '<div class="ctrl" data-nocopy>' + hintsHTML(q.parts[0].hints) + "</div>";
      h += '<div class="explanation" data-nocopy' + (chosen === undefined ? " hidden" : "") + '><span class="exp-label">פתרון · התשובה הנכונה: ' + LET[q.correct] + "</span>" + q.parts[0].sol + "</div>";
      if (chosen === undefined) h += '<div class="ctrl" data-nocopy><div class="row"><button type="button" class="btn ghost" data-act="reveal-mcq">לא יודע/ת, הצג פתרון</button></div></div>';
    } else {
      q.parts.forEach(function (p, i) {
        var lab = partLabel(p, i, q), mine = (S.ans[q.id] || {})[i] || "";
        h += '<section class="qpart">' + p.q;
        h += '<div class="ctrl" data-nocopy>' + hintsHTML(p.hints);
        if (p.sol) {
          h += '<textarea data-i="' + i + '" placeholder="התשובה שלי' + (lab ? " ל" + esc(lab) : "") + ' (נשמרת אוטומטית במכשיר הזה)">' + esc(mine) + "</textarea>";
          h += '<div class="row"><button type="button" class="btn" data-act="sol" data-i="' + i + '">הצג פתרון' + (lab ? " · " + esc(lab) : "") + '</button><span class="saved"></span></div>';
        }
        h += "</div>";
        if (p.sol) h += '<div class="explanation" data-nocopy data-i="' + i + '" hidden><span class="exp-label">פתרון' + (lab ? " · " + esc(lab) : "") + "</span>" + p.sol + "</div>";
        h += "</section>";
      });
      h += "</div>";
    }
    h += '<div class="selfgrade" data-nocopy><span>איך הלך?</span>' +
      [[2, "✓ פתרתי"], [1, "~ חלקית"], [0, "✗ לא הצלחתי"]].map(function (x) {
        return '<button type="button" data-act="grade" data-g="' + x[0] + '" aria-pressed="' + (g === x[0]) + '">' + x[1] + "</button>";
      }).join("") + "</div>";
    return h + "</article>";
  }

  /* ---------- views ---------- */
  var timer = { t: 0, on: false, h: null };
  function fmt(s) { var p = function (n) { return String(n).padStart(2, "0"); }; return p(Math.floor(s / 3600)) + ":" + p(Math.floor(s / 60) % 60) + ":" + p(s % 60); }

  function home() {
    var solved = Q.filter(function (q) { return S.grades[q.id] === 2; }).length;
    var h = '<header class="hero"><div class="hero-meta"><span class="chip-code">חישוביות</span><span>המכללה האקדמית תל אביב-יפו · פרופ׳ עופר אריאלי</span></div>' +
      "<h1>חישוביות</h1>" +
      '<p class="sub">תרגול למבחן מתוך מבחני העבר של הקורס. לכל שאלה רמז, מקום לכתוב תשובה, ופתרון מלא.</p>' +
      '<div class="stats"><div class="stat"><b>' + Q.length + "</b><span>שאלות</span></div>" +
      '<div class="stat"><b>' + B.exams.length + "</b><span>מבחנים</span></div>" +
      '<div class="stat"><b>' + Object.keys(S.grades).length + "</b><span>שאלות שתרגלת</span></div>" +
      '<div class="stat"><b>' + solved + "</b><span>פתרת נכון</span></div>" +
      '<div class="stat"><b>' + S.marked.length + "</b><span>מסומנות</span></div></div></header>";
    h += '<h2 class="sec">בחרו מצב תרגול</h2><div class="modes">' +
      mode("topic", "◉", "תרגול לפי נושא", "כל השאלות של פרק אחד, מכל המבחנים. מתאים לחזרה על נושא.", "לבחור נושא", "#EDE6F5") +
      mode("exam-" + B.exams[B.exams.length - 1].code, "⏱", "מבחן מלא", "כל שאלות המבחן לפי הסדר, עם שעון עצר. מתאים לסימולציה לפני המבחן.", "לבחור מבחן", "#FAE9EC") +
      mode("marked", "★", "שאלות מסומנות", "השאלות שסימנת לחזרה, ואלה שלא הצלחת בהן.", "לחזרה", "#FBF3D9") +
      '<a class="mode" href="../computsum/" style="--tint:#E3F1EB"><span class="ic">📖</span><h3>אתר הסיכום</h3><p>החומר המלא של הקורס, עם מעבדות שמריצות תוכניות WHILE בדפדפן.</p><span class="go">לאתר הסיכום ↗</span></a>' +
      "</div>";
    h += '<h2 class="sec">לפי נושא</h2><div class="tlist">' + B.topics.filter(function (t) { return Q.some(function (q) { return q.topic === t.key; }); }).map(function (t) {
      var qs = Q.filter(function (q) { return q.topic === t.key; }), d = qs.filter(function (q) { return done(q.id); }).length;
      return '<a class="trow" href="#topic-' + t.key + '"><span class="n">פרק ' + t.ch + '</span><span class="t">' + esc(t.label) +
        '<div class="bar"><i style="width:' + Math.round(100 * d / qs.length) + '%"></i></div></span><span class="c">' + d + "/" + qs.length + "</span></a>";
    }).join("") + "</div>";
    h += '<h2 class="sec">לפי מבחן</h2><div class="chips">' + B.exams.map(function (e) {
      return '<a class="chip" href="#exam-' + e.code + '">' + esc(e.label) + " <small>· " + e.n + "</small></a>";
    }).join("") + "</div>";
    h += '<p class="note">שאלות על חומר שכבר לא נלמד בקורס לא נכללו. ההתקדמות והתשובות שכתבת נשמרות רק במכשיר הזה.</p>';
    return h;
  }
  function mode(hash, ic, t, p, go, tint) {
    return '<a class="mode" href="#' + hash + '" style="--tint:' + tint + '"><span class="ic">' + ic + "</span><h3>" + t + "</h3><p>" + p + '</p><span class="go">' + go + " ←</span></a>";
  }
  function head(title, extra) {
    return '<div class="vhead"><a class="back" href="#">→ לעמוד הראשי</a></div><div class="vhead"><h2>' + title + "</h2>" + (extra || "") + "</div>";
  }
  function topicView(key) {
    var t = TP[key] || B.topics[0];
    var h = head("תרגול לפי נושא", "");
    h += '<div class="chips">' + B.topics.filter(function (x) { return Q.some(function (q) { return q.topic === x.key; }); }).map(function (x) {
      return '<a class="chip' + (x.key === t.key ? " on" : "") + '" href="#topic-' + x.key + '">' + esc(x.label) + " <small>· " + Q.filter(function (q) { return q.topic === x.key; }).length + "</small></a>";
    }).join("") + "</div>";
    h += '<p class="note">החומר לפרק הזה: <a href="../computsum/#' + t.sum + '">פרק ' + t.ch + " באתר הסיכום ↗</a></p>";
    return h + Q.filter(function (q) { return q.topic === t.key; }).map(card).join("");
  }
  function examView(code) {
    var e = EX[code] || B.exams[0];
    var tm = '<span class="timer"><span id="tval">' + fmt(timer.t) + '</span><button type="button" data-act="timer">' + (timer.on ? "השהיה" : timer.t ? "המשך" : "התחלת שעון") + '</button><button type="button" data-act="treset">איפוס</button></span>';
    var h = head("מבחן " + esc(e.label), tm);
    h += '<div class="chips">' + B.exams.map(function (x) {
      return '<a class="chip' + (x.code === e.code ? " on" : "") + '" href="#exam-' + x.code + '">' + esc(x.label) + "</a>";
    }).join("") + "</div>";
    return h + Q.filter(function (q) { return q.exam === e.code; }).map(card).join("");
  }
  function markedView() {
    var qs = Q.filter(function (q) { return S.marked.indexOf(q.id) >= 0 || S.grades[q.id] === 0 || S.grades[q.id] === 1; });
    return head("שאלות לחזרה", "") + '<p class="note">כאן מופיעות השאלות שסימנת בכוכב, ואלה שסימנת "חלקית" או "לא הצלחתי".</p>' +
      (qs.length ? qs.map(card).join("") : '<p class="empty">עוד אין שאלות לחזרה.</p>');
  }

  function route() {
    var hsh = decodeURIComponent(location.hash.slice(1));
    var html;
    if (hsh.indexOf("topic") === 0) html = topicView(hsh.slice(6));
    else if (hsh.indexOf("exam-") === 0) html = examView(hsh.slice(5));
    else if (hsh === "marked") html = markedView();
    else if (hsh.indexOf("q-") === 0 && QID[hsh.slice(2)]) html = head("שאלה", "") + card(QID[hsh.slice(2)]);
    else html = home();
    app.innerHTML = html;
    hlAll(app);
    if (window.MTATheme) window.MTATheme.footer();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ---------- interactions ---------- */
  var saveT = null;
  app.addEventListener("input", function (e) {
    if (e.target.tagName !== "TEXTAREA" || !e.target.dataset.i) return;
    var c = e.target.closest(".qcard"), id = c.dataset.qid, i = e.target.dataset.i;
    S.ans[id] = S.ans[id] || {}; S.ans[id][i] = e.target.value;
    var lab = e.target.parentNode.querySelector(".saved");
    clearTimeout(saveT); saveT = setTimeout(function () { save(); if (lab) lab.textContent = "נשמר ✓"; }, 400);
  });
  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var c = b.closest(".qcard"), id = c && c.dataset.qid, q = id && QID[id], act = b.dataset.act;
    if (act === "timer") {
      timer.on = !timer.on;
      if (timer.on) timer.h = setInterval(function () { timer.t++; var v = document.getElementById("tval"); if (v) v.textContent = fmt(timer.t); }, 1000);
      else clearInterval(timer.h);
      b.textContent = timer.on ? "השהיה" : "המשך"; return;
    }
    if (act === "treset") { clearInterval(timer.h); timer = { t: 0, on: false, h: null }; route(); return; }
    if (act === "mark") {
      var k = S.marked.indexOf(id); if (k >= 0) S.marked.splice(k, 1); else S.marked.push(id); save();
      b.classList.toggle("on", k < 0); b.textContent = k < 0 ? "★ מסומנת" : "☆ סמן לחזרה"; return;
    }
    if (act === "sol") {
      var x = c.querySelector('.explanation[data-i="' + b.dataset.i + '"]'); x.hidden = !x.hidden;
      b.textContent = (x.hidden ? "הצג פתרון" : "הסתר פתרון") + b.textContent.replace(/^(הצג|הסתר) פתרון/, ""); return;
    }
    if (act === "opt" || act === "reveal-mcq") {
      var ch = act === "opt" ? +b.dataset.i : -1;
      S.mcq[id] = ch; S.grades[id] = ch === q.correct ? 2 : 0; save();
      c.outerHTML = card(q); var nc = document.getElementById("q-" + id); hlAll(nc); return;
    }
    if (act === "grade") {
      var g = +b.dataset.g; if (S.grades[id] === g) delete S.grades[id]; else S.grades[id] = g; save();
      c.querySelectorAll('[data-act="grade"]').forEach(function (y) { y.setAttribute("aria-pressed", String(S.grades[id] === +y.dataset.g)); });
      var bd = c.querySelector(".grade-badge"); if (bd) bd.remove();
      if (S.grades[id] !== undefined) c.querySelector(".star").insertAdjacentHTML("beforebegin", '<span class="grade-badge g' + S.grades[id] + '">' + ["לא הצלחתי", "חלקית", "פתרתי ✓"][S.grades[id]] + "</span>");
    }
  });

  route();
})();
