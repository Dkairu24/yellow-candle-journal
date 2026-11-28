"use strict";
/* The Yellow Candle journal: The public trade page.
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- the public page: read only, one trade ---------- */
function pubMsg(box, title, text) {
  clear(box);
  var d = h("div", "pub-msg");
  d.appendChild(h("h1", "", title)); d.appendChild(h("p", "", text));
  var a = h("a", "btn primary", "Visit The Yellow Candle"); a.href = location.pathname;
  d.appendChild(a);
  box.appendChild(d);
}
function pubCard(title) { var c = h("section", "pub-card"); c.appendChild(h("h2", "", title)); return c; }
function pubLadder(t) {
  var L = [];
  var dirLong = t.dir !== "Short";
  [["Target", "target", t.target], ["Entry", "entry", t.entry], ["Stop", "stop", t.stop], ["Exit", "exit", t.exit]].forEach(function (x) {
    var v = Number(x[2]);
    if (x[2] !== undefined && x[2] !== null && x[2] !== "" && !isNaN(v)) L.push({ nm: x[0], k: x[1], v: v });
  });
  if (L.length < 2) return null;
  var hi = Math.max.apply(null, L.map(function (x) { return x.v; })), lo = Math.min.apply(null, L.map(function (x) { return x.v; }));
  var span = hi - lo || 1, H = 200, GAP = 38;
  L.sort(function (a, b) { return b.v - a.v; });
  var prev = -GAP;
  L.forEach(function (x) { var y = (hi - x.v) / span * H; x.y = Math.max(y, prev + GAP); prev = x.y; });
  var box = h("div", "ladder"); box.style.height = (prev + 18) + "px";
  box.appendChild(h("div", "rail"));
  var en = L.filter(function (x) { return x.k === "entry"; })[0], ex = L.filter(function (x) { return x.k === "exit"; })[0];
  if (en && ex) {
    var seg = h("div", "seg" + (t.r < 0 ? " loss" : ""));
    seg.style.top = (Math.min(en.y, ex.y) + 9) + "px"; seg.style.height = Math.abs(en.y - ex.y) + "px";
    box.appendChild(seg);
  }
  L.forEach(function (x) {
    var row = h("div", "lv " + x.k + (x.k === "exit" && t.r < 0 ? " loss" : ""));
    row.style.top = x.y + "px";
    row.appendChild(h("i")); row.appendChild(h("span", "nm", x.nm)); row.appendChild(h("span", "px num", fmtPx(x.v, t)));
    box.appendChild(row);
  });
  return box;
}
function renderPublic(box, d, sharedAt) {
  clear(box);
  var t = d.data || {};
  var loss = Number(t.r) < 0;
  var top = h("div", "pub-top");
  var br = h("a", "pub-brand"); br.href = location.pathname;
  var mark = document.createElementNS(SVGNS, "svg");
  mark.setAttribute("viewBox", "0 0 22 40"); mark.setAttribute("width", "14"); mark.setAttribute("height", "26"); mark.setAttribute("aria-hidden", "true");
  mark.appendChild(s("line", { x1: 11, y1: 0, x2: 11, y2: 40, stroke: "#FFD43B", "stroke-width": 2 }));
  mark.appendChild(s("rect", { x: 2, y: 9, width: 18, height: 22, rx: 2, fill: "#FFD43B" }));
  br.appendChild(mark);
  var nm = h("div"); nm.appendChild(h("b", "", "The Yellow Candle")); nm.appendChild(h("span", "", "Shared trade"));
  br.appendChild(nm);
  top.appendChild(br);
  var cta = h("a", "btn small", "Get the journal"); cta.href = location.pathname;
  top.appendChild(cta);
  box.appendChild(top);

  var wrap = h("div", "pub-wrap");
  var tk = h("section", "pub-ticket" + (loss ? " loss" : ""));
  var id = h("div", "pub-id");
  id.appendChild(h("span", "pub-pair", t.pair || "-"));
  id.appendChild(h("span", "pill " + (t.dir === "Short" ? "short" : "long"), t.dir || "-"));
  if (t.tf) id.appendChild(h("span", "pill", t.tf));
  id.appendChild(h("span", "pub-date", fmtDate(t.date)));
  tk.appendChild(id);
  var res = h("div", "pub-result");
  var hasUsd = hasVal(t.usd);
  res.appendChild(h("span", "pub-r num " + rClass(t.r), hasUsd ? money(Number(t.usd)) : fmtR(Number(t.r))));
  res.appendChild(h("span", "pub-verdict", (Number(t.r) > 0 ? "Winner" : Number(t.r) < 0 ? "Loser" : "Break even") + (hasUsd ? ", " + fmtR(Number(t.r)) : "")));
  tk.appendChild(res);
  if (t.plan) tk.appendChild(h("div", "pub-plan", "Planned " + fmtR(Number(t.plan)) + " at the target"));
  wrap.appendChild(tk);

  var grid = h("div", "pub-grid");
  var lad = pubLadder(t);
  if (lad) { var c1 = pubCard("Price levels"); c1.appendChild(lad); grid.appendChild(c1); }
  var c2 = pubCard("Setup");
  var kv = h("dl", "kv");
  var rows = [["1h bias", t.htf], ["HTF POI", t.poi], ["Liquidity sweep", t.sweep], ["Trigger", toArr(t.trigger).join(" + ")], ["Displacement", t.disp], ["Fresh zone", t.fresh], ["Followed rules", t.rules], ["Mindset", t.mood]];
  if (t.chkN) rows.push(["Setup score", "Grade " + gradeOf(t) + ", " + t.chkS + "/" + t.chkN + " ticked"]);
  rows.forEach(function (r) {
    if (!r[1]) return;
    var cell = h("div"); cell.appendChild(h("dt", "", r[0])); cell.appendChild(h("dd", "", r[1]));
    kv.appendChild(cell);
  });
  c2.appendChild(kv);
  var tg = toArr(t.tags);
  if (tg.length) { var ch = h("div", "chips"); ch.style.marginTop = "14px"; tg.forEach(function (x) { ch.appendChild(h("span", "chip dim", "#" + x)); }); c2.appendChild(ch); }
  grid.appendChild(c2);
  if (grid.children.length) wrap.appendChild(grid);
  if (grid.children.length === 1) grid.style.gridTemplateColumns = "minmax(0, 1fr)";

  if (t.notes) { var c3 = pubCard("Notes"); c3.appendChild(h("div", "pub-notes", t.notes)); wrap.appendChild(c3); }
  var pics = Array.isArray(t._shots) ? t._shots : (t._shot ? [{ p: t._shot, c: "" }] : []);
  if (d.has_shot && pics.length) {
    var c4 = pubCard(pics.length > 1 ? "Charts" : "Chart"); c4.className += " pub-shot";
    pics.forEach(function (pc) {
      if (!pc || typeof pc.p !== "string") return;
      var fig = h("figure");
      var im = document.createElement("img");
      im.alt = pc.c || "Chart screenshot of this trade"; im.loading = "lazy";
      im.src = SB_URL + "/storage/v1/object/public/public-shots/" + pc.p.split("/").map(encodeURIComponent).join("/");
      im.addEventListener("error", function () { fig.remove(); });
      fig.appendChild(im);
      if (pc.c) fig.appendChild(h("figcaption", "", String(pc.c)));
      c4.appendChild(fig);
    });
    wrap.appendChild(c4);
  }
  if (t.link && /^https?:\/\//i.test(t.link)) {
    var c5 = pubCard("Chart link");
    var a = h("a", "", t.link); a.href = t.link; a.target = "_blank"; a.rel = "noopener noreferrer nofollow"; a.style.color = "var(--gold)"; a.style.overflowWrap = "anywhere";
    c5.appendChild(a); wrap.appendChild(c5);
  }
  var ft = h("div", "pub-foot");
  ft.appendChild(h("span", "", "Shared " + (sharedAt ? fmtDate(String(sharedAt).slice(0, 10)) : "") + ". A personal trade journal entry, not financial advice."));
  wrap.appendChild(ft);
  box.appendChild(wrap);
  document.title = (t.pair || "Trade") + " " + (t.dir || "") + " " + (hasVal(t.usd) ? money(Number(t.usd)) : fmtR(Number(t.r))) + " | The Yellow Candle";
}
function bootPublic(slug) {
  document.body.classList.add("public-mode");
  document.body.classList.remove("booting");
  var box = $("public");
  var tries = 0;
  (function go() {
    if (!window.supabase) { if (tries++ < 20) { setTimeout(go, 250); return; } pubMsg(box, "Could not load", "Check your connection and refresh."); return; }
    var cl = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    box.appendChild(h("div", "pub-msg", "Loading trade..."));
    if (!/^[a-z0-9]{8,64}$/i.test(slug)) { pubMsg(box, "Trade not found", "This link is not valid."); return; }
    cl.rpc("get_shared_trade", { p_slug: slug }).then(function (r) {
      if (r.error || !r.data) { pubMsg(box, "This trade is not shared", "The link may be wrong, or the owner switched sharing off."); return; }
      renderPublic(box, r.data, r.data.shared_at);
    }, function () { pubMsg(box, "Could not load", "Check your connection and refresh."); });
  })();
}
