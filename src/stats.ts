/* The Yellow Candle journal: Stats, equity curve and pattern breakdown.
   An ES module: it imports what it needs from the other files. */

import { weekdayOf } from "./calendar";
import { gradeOf } from "./checklist";
import { $, OPTIONS, axisLbl, clear, dollarMode, fmtDate, fmtV, h, rClass, s, trades, vd } from "./core";

/* ---------- stats ---------- */
export function sorted(list?) {
  return (list || trades).slice().sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return (a.created || 0) - (b.created || 0);
  });
}
function computeStats(list) {
  var n = list.length, wins = 0, gw = 0, gl = 0, total = 0;
  list.forEach(function (t) {
    total += t.r;
    if (t.r > 0) { wins++; gw += t.r; }
    if (t.r < 0) gl += -t.r;
  });
  var cum = 0, peak = 0, dd = 0;
  sorted(list).forEach(function (t) {
    cum += t.r;
    if (cum > peak) peak = cum;
    if (peak - cum > dd) dd = peak - cum;
  });
  var ruleAnswers = list.filter(function (t) { return t.rules === "Yes" || t.rules === "No"; });
  var ruleYes = ruleAnswers.filter(function (t) { return t.rules === "Yes"; }).length;
  return {
    n: n, total: total,
    winRate: n ? wins / n : null,
    avg: n ? total / n : null,
    pf: gl > 0 ? gw / gl : (gw > 0 ? Infinity : null),
    dd: n ? dd : null,
    rulesPct: ruleAnswers.length ? ruleYes / ruleAnswers.length : null,
    rulesN: ruleAnswers.length
  };
}
export var VIEWS = ["overview", "calendar", "patterns", "trades", "checklist"];
export var curView = "overview";
var chartsDirty = false, lastChartW = 0;
export function refreshCharts() {
  var w = $("curve-wrap");
  if (!w || curView !== "overview") return;
  var cw = Math.round(w.clientWidth);
  if (!cw) return;
  if (chartsDirty || cw !== lastChartW) { renderCurve(); renderDaily(); }
}
export function showView(v, quiet?) {
  if (VIEWS.indexOf(v) < 0) v = "overview";
  var changed = v !== curView;
  curView = v;
  document.body.setAttribute("data-view", v);
  document.querySelectorAll<HTMLElement>(".view").forEach(function (el) {
    var on = el.getAttribute("data-view") === v;
    el.hidden = !on;
    if (on && changed) { el.classList.remove("view-in"); void el.offsetWidth; el.classList.add("view-in"); }
  });
  document.querySelectorAll("#nav a").forEach(function (a) {
    var on = a.getAttribute("data-view") === v;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  $("filters").hidden = v === "checklist";
  if (!quiet && changed) window.scrollTo(0, 0);
  if (v === "overview") refreshCharts();
}
function makeRing(rate, nWin, nLoss) {
  var NS = "http://www.w3.org/2000/svg";
  var wrap = h("div", "ring");
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "72"); svg.setAttribute("height", "72"); svg.setAttribute("viewBox", "0 0 72 72");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Win rate " + Math.round(rate * 100) + " percent: " + nWin + " winners, " + nLoss + " losers");
  function circ(color, dash, rot) {
    var c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", "36"); c.setAttribute("cy", "36"); c.setAttribute("r", "30");
    c.setAttribute("fill", "none"); c.setAttribute("stroke", color); c.setAttribute("stroke-width", "6");
    if (dash) c.setAttribute("stroke-dasharray", dash);
    if (rot) c.setAttribute("transform", "rotate(-90 36 36)");
    return c;
  }
  var full = 2 * Math.PI * 30;
  svg.appendChild(circ(nLoss ? "#F77B75" : "#F1CD60", "", false));
  svg.appendChild(circ("#F1CD60", (rate * full).toFixed(1) + " " + full.toFixed(1), true));
  var tx = document.createElementNS(NS, "text");
  tx.setAttribute("x", "36"); tx.setAttribute("y", "41"); tx.setAttribute("text-anchor", "middle");
  tx.setAttribute("font-size", "16"); tx.setAttribute("font-weight", "600"); tx.setAttribute("fill", "#E9E5D8");
  tx.setAttribute("font-family", "-apple-system, 'SF Pro Text', system-ui, sans-serif");
  tx.textContent = Math.round(rate * 100) + "%";
  svg.appendChild(tx);
  wrap.appendChild(svg);
  wrap.appendChild(h("div", "", "win rate"));
  return wrap;
}
export function renderDaily() {
  var box = $("daily-wrap");
  if (!box) return;
  var list = vd();
  var W = Math.round(box.clientWidth);
  if (list.length && !W) { chartsDirty = true; return; }
  clear(box);
  if (!list.length) { box.appendChild(h("div", "empty", trades.length ? "No trades match these filters." : "Daily results appear as you log trades.")); return; }
  // Each day is drawn like a candle: the body is the day's result, the wick shows how far the
  // running total strayed above or below it during the day (only visible on days with 2+ trades).
  var by: any = {}, hi: any = {}, lo: any = {}, run: any = {};
  list.slice().sort(function (a, b) { return (a.created || 0) - (b.created || 0); }).forEach(function (t) {
    run[t.date] = (run[t.date] || 0) + t.r;
    by[t.date] = run[t.date];
    hi[t.date] = Math.max(hi[t.date] === undefined ? 0 : hi[t.date], run[t.date]);
    lo[t.date] = Math.min(lo[t.date] === undefined ? 0 : lo[t.date], run[t.date]);
  });
  var dates = Object.keys(by).sort();
  var cap = Math.max(10, Math.min(60, Math.floor(W / 9)));
  if (dates.length > cap) dates = dates.slice(-cap);
  var H = window.innerWidth > 960 ? 280 : 170, pad = 4, n = dates.length;
  var top = 10, plot = H - top - 30, mxP = 0.5, mxN = 0.5;
  dates.forEach(function (d) { if (hi[d] > mxP) mxP = hi[d]; if (-lo[d] > mxN) mxN = -lo[d]; });
  var k = plot / (mxP + mxN), base = Math.round(top + mxP * k);
  var slot = (W - pad * 2) / n, bw = Math.max(3, Math.min(34, slot * 0.62));
  var svg = s("svg", { "class": "daily", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": (dollarMode() ? "Profit and loss" : "Total R") + " for each trading day" });
  $("daily-sub").textContent = dollarMode() ? "USD per trading day" : "R per trading day";
  svg.appendChild(s("line", { "class": "base", x1: 0, x2: W, y1: base, y2: base }));
  var every = Math.ceil(n / (W < 420 ? 6 : 12));
  dates.forEach(function (d, i) {
    var v = by[d];
    var hgt = Math.max(Math.abs(v) * k, 1.5);
    var x0 = pad + slot * i + (slot - bw) / 2;
    var tone = v > 0 ? "#F1CD60" : v < 0 ? "#F77B75" : "#8d8d88";
    var up = Math.max(v, 0), down = Math.min(v, 0);
    if (hi[d] > up + 1e-9 || lo[d] < down - 1e-9) {
      var wx = (x0 + bw / 2).toFixed(1);
      svg.appendChild(s("line", { "class": "wick", x1: wx, x2: wx, y1: (base - hi[d] * k).toFixed(1), y2: (base - lo[d] * k).toFixed(1), style: "stroke:" + tone }));
    }
    var r = s("rect", { x: x0.toFixed(1), y: (v >= 0 ? base - hgt : base).toFixed(1), width: bw.toFixed(1), height: hgt.toFixed(1), rx: 2, style: "fill:" + tone });
    var wickNote = hi[d] > up + 1e-9 || lo[d] < down - 1e-9 ? " (high " + fmtV(Math.round(hi[d] * 100) / 100) + ", low " + fmtV(Math.round(lo[d] * 100) / 100) + " during the day)" : "";
    r.appendChild(s("title", {}, fmtDate(d) + ": " + fmtV(Math.round(v * 100) / 100) + wickNote));
    svg.appendChild(r);
    if (i % every === 0 && n - 1 - i >= every / 2 || i === n - 1) svg.appendChild(s("text", { x: (x0 + bw / 2).toFixed(1), y: H - 6, "text-anchor": "middle" }, String(parseInt(d.slice(8), 10))));
  });
  box.appendChild(svg);
}
export function renderStats() {
  var st = computeStats(vd());
  var box = $("stats");
  clear(box);
  function tile(label, valueText, cls, hint, lead?) {
    var d = h("div", "stat" + (lead ? " lead" : ""));
    d.appendChild(h("div", "label", label));
    d.appendChild(h("div", "value num " + (cls || ""), valueText));
    if (hint) d.appendChild(h("div", "hint", hint));
    box.appendChild(d);
  }
  var none = st.n === 0;
  var vl = vd();
  var nWin = vl.filter(function (t) { return t.r > 0; }).length;
  var nLoss = vl.filter(function (t) { return t.r < 0; }).length;
  tile(dollarMode() ? "Total P&L" : "Total R", none ? "-" : fmtV(st.total), none ? "zero" : rClass(st.total), st.n + (st.n === 1 ? " trade" : " trades") + (none ? "" : ". " + nWin + (nWin === 1 ? " winner, " : " winners, ") + nLoss + (nLoss === 1 ? " loser" : " losers")), true);
  if (!none) box.firstChild.appendChild(makeRing(st.winRate, nWin, nLoss));
  tile("Win rate", none ? "-" : Math.round(st.winRate * 100) + "%", "", none ? "" : "Winners over all trades");
  tile(dollarMode() ? "Average per trade" : "Average R", none ? "-" : fmtV(st.avg), none ? "zero" : rClass(st.avg), "Per trade");
  tile("Profit factor", none || st.pf === null ? "-" : (st.pf === Infinity ? "No losses" : st.pf.toFixed(2)), "", dollarMode() ? "Won over lost" : "Won R over lost R");
  tile("Max drawdown", none ? "-" : (st.dd === 0 ? fmtV(0) : fmtV(-st.dd)), "", "Peak to trough");
  tile("Rules followed", st.rulesPct === null ? "-" : Math.round(st.rulesPct * 100) + "%", "", st.rulesN ? "Of " + st.rulesN + " reviewed" : "Answer it per trade");
}

/* ---------- equity curve ---------- */
export function niceStep(x) {
  if (!(x > 0)) return 1;
  var p = Math.pow(10, Math.floor(Math.log(x) / Math.LN10));
  var f = x / p;
  var n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return n * p;
}
export function renderCurve() {
  var wrap = $("curve-wrap");
  var list = sorted(vd());
  var W = Math.round(wrap.clientWidth);
  if (list.length && !W) { chartsDirty = true; return; }
  clear(wrap);
  if (!list.length) {
    wrap.appendChild(h("div", "empty", trades.length ? "No trades match these filters." : "No trades yet. Your equity curve draws itself as you log trades."));
    return;
  }
  var H = W < 520 ? 220 : 280, L = 46, R = 66, T = 14, B = 30;
  var cum = [0];
  list.forEach(function (t) { cum.push(cum[cum.length - 1] + t.r); });
  var mn = Math.min.apply(null, cum.concat([0])), mx = Math.max.apply(null, cum.concat([0]));
  if (mx === mn) mx = mn + 1;
  var step = niceStep((mx - mn) / 4);
  var lo = Math.floor(mn / step) * step, hi = Math.ceil(mx / step) * step;
  if (hi === lo) hi = lo + step;
  function y(v) { return T + (hi - v) / (hi - lo) * (H - T - B); }
  function x(i) { return L + (cum.length > 1 ? i / (cum.length - 1) : 0.5) * (W - L - R); }
  var svg = s("svg", { "class": "curve", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": dollarMode() ? "Cumulative profit and loss after each trade" : "Cumulative R after each trade" });
  var defs = s("defs", {});
  var grad = s("linearGradient", { id: "fillgrad", x1: "0", y1: "0", x2: "0", y2: "1" });
  grad.appendChild(s("stop", { offset: "0", style: "stop-color:#F1CD60;stop-opacity:0.28" }));
  grad.appendChild(s("stop", { offset: "1", style: "stop-color:#F1CD60;stop-opacity:0" }));
  defs.appendChild(grad);
  svg.appendChild(defs);
  for (var v = lo; v <= hi + step / 1000; v += step) {
    var yy = y(v);
    svg.appendChild(s("line", { "class": v === 0 ? "zero-line" : "grid", x1: L, x2: W - R, y1: yy, y2: yy }));
    svg.appendChild(s("text", { x: L - 8, y: yy + 4, "text-anchor": "end" }, axisLbl(v)));
  }
  var every = Math.max(1, Math.ceil((cum.length - 1) / (W < 520 ? 4 : 8)));
  for (var i = 0; i < cum.length; i += every) {
    svg.appendChild(s("text", { x: x(i), y: H - 10, "text-anchor": "middle" }, i === 0 ? "Start" : "#" + i));
  }
  var pts = cum.map(function (c, i) { return x(i) + "," + y(c); });
  if (cum.length > 1) {
    var area = "M" + x(0) + "," + y(0) + " L" + pts.join(" L") + " L" + x(cum.length - 1) + "," + y(0) + " Z";
    svg.appendChild(s("path", { d: area, fill: "url(#fillgrad)" }));
    svg.appendChild(s("polyline", { "class": "line", points: pts.join(" ") }));
  }
  list.forEach(function (t, k) {
    var i = k + 1;
    var isLast = i === cum.length - 1;
    var dotR = isLast ? 5 : list.length > 90 ? 0 : list.length > 45 || W < 520 ? 2.5 : 3.5;
    if (!dotR) return;
    var dot = s("circle", { cx: x(i), cy: y(cum[i]), r: dotR, fill: t.r > 0 ? "#F1CD60" : t.r < 0 ? "#F77B75" : "#8d8d88" });
    dot.appendChild(s("title", {}, "#" + i + "  " + fmtDate(t.date) + "  " + (t.pair || "") + "  " + fmtV(t.r) + "  (total " + fmtV(Math.round(cum[i] * 100) / 100) + ")"));
    svg.appendChild(dot);
  });
  var last = cum[cum.length - 1];
  svg.appendChild(s("text", { "class": "end-label", x: x(cum.length - 1) + 10, y: y(last) + 4 }, fmtV(last)));
  wrap.appendChild(svg);
  chartsDirty = false;
  lastChartW = W;
  $("curve-sub").textContent = (dollarMode() ? "Cumulative P&L over " : "Cumulative R over ") + list.length + (list.length === 1 ? " trade" : " trades");
}

/* ---------- breakdown ---------- */
var GROUPS = [
  ["Setup score", "grade"], ["1h bias", "htf"], ["HTF POI", "poi"], ["Liquidity sweep", "sweep"], ["Trigger", "trigger"],
  ["Displacement", "disp"], ["Fresh zone", "fresh"], ["Followed rules", "rules"],
  ["Weekday", "wday"], ["Direction", "dir"], ["Execution timeframe", "tf"], ["Mindset", "mood"], ["Your tags", "tags"], ["Pair", "pair"]
];
/** Groups that read best in their natural order (days, timeframes, grades) are not re-sorted. */
var NATURAL_ORDER = { wday: true, tf: true, grade: true };
/** A pattern needs at least this many trades before the screen trusts it. */
var MIN_TRUSTED = 5;
export function renderBreakdown() {
  var box = $("breakdown");
  clear(box);
  var vlist = vd();
  if (!vlist.length) {
    box.appendChild(h("div", "empty", trades.length ? "No trades match these filters." : "Tag your trades and the patterns appear here: which setups pay, which ones cost you."));
    return;
  }
  // 1. gather every group's rows
  var groups: any[] = [];
  GROUPS.forEach(function (g) {
    var key = g[1], map: any = {}, order: string[] = [];
    vlist.forEach(function (t) {
      var raw = key === "grade" ? gradeOf(t) : key === "wday" ? weekdayOf(t.date) : t[key];
      var vals = Array.isArray(raw) ? raw : [raw];
      vals.forEach(function (v) {
        if (v === undefined || v === null || v === "") return;
        if (!map[v]) { map[v] = { v: v, n: 0, w: 0, sum: 0 }; order.push(v); }
        map[v].n++; map[v].sum += t.r; if (t.r > 0) map[v].w++;
      });
    });
    if (!order.length) return;
    var rows = order.map(function (v) { var m = map[v]; m.avg = m.sum / m.n; return m; });
    if (NATURAL_ORDER[key]) {
      var known = key === "wday" ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] : (OPTIONS[key] || []);
      rows.sort(function (a, b) {
        var ia = known.indexOf(a.v), ib = known.indexOf(b.v);
        if (ia === -1) ia = 99; if (ib === -1) ib = 99;
        return ia - ib || (a.v < b.v ? -1 : 1);
      });
    } else {
      // best first, but groups with few trades sink below the ones you can trust
      rows.sort(function (a, b) {
        var ta = a.n >= MIN_TRUSTED ? 0 : 1, tb = b.n >= MIN_TRUSTED ? 0 : 1;
        return ta - tb || b.avg - a.avg;
      });
    }
    groups.push({ title: g[0], key: key, rows: rows });
  });
  if (!groups.length) {
    box.appendChild(h("div", "empty", "None of your trades carry tags yet. Fill in the \"Why you took it\" section when you log."));
    return;
  }
  // 2. the standout best and worst, only among patterns with enough trades
  var trusted: any[] = [];
  groups.forEach(function (g) { g.rows.forEach(function (r) { if (r.n >= MIN_TRUSTED) trusted.push({ g: g, r: r }); }); });
  var best: any = null, worst: any = null;
  if (trusted.length >= 3) {
    trusted.forEach(function (x) {
      if (x.r.avg > 0 && (!best || x.r.avg > best.r.avg)) best = x;
      if (x.r.avg < 0 && (!worst || x.r.avg < worst.r.avg)) worst = x;
    });
  }
  function pick(x: any, label: string, tone: string) {
    var c = h("div", "pat-pick " + tone);
    c.appendChild(h("div", "pat-lab", label));
    c.appendChild(h("div", "pat-name", x.g.title + ": " + x.r.v));
    c.appendChild(h("div", "pat-fig num " + rClass(x.r.avg), fmtV(x.r.avg) + (dollarMode() ? " per trade" : " average")));
    c.appendChild(h("div", "pat-sub", x.r.n + " trades, " + Math.round(x.r.w / x.r.n * 100) + "% won"));
    return c;
  }
  if (best || worst) {
    var strip = h("div", "pat-sum");
    if (best) strip.appendChild(pick(best, "Your strongest pattern", "good"));
    if (worst) strip.appendChild(pick(worst, "Your costliest pattern", "bad"));
    box.appendChild(strip);
  }
  // 3. the cards
  var cards = h("div", "cards");
  groups.forEach(function (g) {
    var maxAbs = 0.01;
    g.rows.forEach(function (m) { maxAbs = Math.max(maxAbs, Math.abs(m.avg)); });
    var card = h("div", "bcard");
    var hd = h("div", "bhead");
    hd.appendChild(h("h3", "", g.title));
    hd.appendChild(h("span", "col", dollarMode() ? "Avg" : "Avg R"));
    hd.appendChild(h("span", "col", "Win"));
    hd.appendChild(h("span", "col", "Trades"));
    card.appendChild(hd);
    g.rows.forEach(function (m) {
      var thin = m.n < MIN_TRUSTED;
      var row = h("div", "brow" + (thin ? " thin" : "") + (best && best.r === m ? " is-best" : "") + (worst && worst.r === m ? " is-worst" : ""));
      var nm = h("div", "nm", m.v);
      if (best && best.r === m) nm.appendChild(h("span", "flag good", "Best"));
      if (worst && worst.r === m) nm.appendChild(h("span", "flag bad", "Costly"));
      row.appendChild(nm);
      var bar = h("div", "bar");
      var fill = h("i", m.avg >= 0 ? "p" : "n");
      fill.style.width = Math.min(50, Math.abs(m.avg) / maxAbs * 50) + "%";
      bar.appendChild(fill);
      row.appendChild(bar);
      row.appendChild(h("div", "avg num " + rClass(m.avg), fmtV(m.avg)));
      row.appendChild(h("div", "wr num", Math.round(m.w / m.n * 100) + "%"));
      row.appendChild(h("div", "cnt num", String(m.n)));
      card.appendChild(row);
    });
    cards.appendChild(card);
  });
  box.appendChild(cards);
  box.appendChild(h("div", "note", "Bars show average " + (dollarMode() ? "profit or loss" : "R") + " per trade: gold made money, red lost. Faded rows have fewer than " + MIN_TRUSTED + " trades, which is too few to trust. A trade tagged with both BOS and CHOCH counts in each row."));
}
