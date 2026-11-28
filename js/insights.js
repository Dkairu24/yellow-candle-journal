"use strict";
/* The Yellow Candle journal: Discipline insights.
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- discipline insights (plain-language warnings from your own trades) ---------- */
function sumR(l) { return l.reduce(function (a, t) { return a + t.r; }, 0); }
function avgR(l) { return l.length ? sumR(l) / l.length : 0; }
function buildInsights(list) {
  var out = [];
  var s = sorted(list);
  // streak
  var k = s.length - 1, run = 0, sign = 0;
  if (k >= 0 && s[k].r !== 0) {
    sign = s[k].r > 0 ? 1 : -1;
    while (k >= 0 && (s[k].r > 0 ? 1 : s[k].r < 0 ? -1 : 0) === sign) { run++; k--; }
  }
  if (sign < 0 && run >= 3) out.push({ tone: "warn", title: run + " losses in a row", text: "Your last " + run + " trades lost " + fmtR(sumR(s.slice(-run))) + ". Step away, review them, and only come back with a clean A-grade setup." });
  else if (sign > 0 && run >= 3) out.push({ tone: "good", title: run + " wins in a row", text: "Last " + run + " trades made " + fmtR(sumR(s.slice(-run))) + ". Stay with the checklist; streaks make people loosen their rules." });
  // rules
  var no = list.filter(function (t) { return t.rules === "No"; });
  var yes = list.filter(function (t) { return t.rules === "Yes"; });
  if (no.length >= 2) {
    var cost = sumR(no);
    out.push({ tone: cost < 0 ? "warn" : "info", title: "Rule-breaking trades: " + fmtR(cost), text: no.length + " trades broke your rules, averaging " + fmtR(avgR(no)) + (yes.length ? " against " + fmtR(avgR(yes)) + " when you followed them." : ".") });
  }
  // mindset
  ["FOMO", "Revenge", "Rushed", "Fear", "Bored"].forEach(function (m) {
    var l = list.filter(function (t) { return t.mood === m; });
    if (l.length >= 2 && sumR(l) < 0) out.push({ tone: "warn", title: m + " trades: " + fmtR(sumR(l)), text: l.length + " trades taken while feeling " + (m === "FOMO" ? m : m.toLowerCase()) + " averaged " + fmtR(avgR(l)) + ". Notice the feeling and skip the trade." });
  });
  var calm = list.filter(function (t) { return t.mood === "Calm" || t.mood === "Confident"; });
  if (calm.length >= 3 && avgR(calm) > 0) out.push({ tone: "good", title: "Calm trades pay", text: calm.length + " trades taken calm or confident averaged " + fmtR(avgR(calm)) + "." });
  // planned vs actual
  var pl = list.filter(function (t) { return t.plan > 0; });
  if (pl.length >= 3) {
    var planned = pl.reduce(function (a, t) { return a + t.plan; }, 0);
    var got = sumR(pl);
    var early = pl.filter(function (t) { return t.r > 0 && t.r < t.plan - 0.5; });
    var hit = pl.filter(function (t) { return t.r >= t.plan * 0.95; });
    out.push({ tone: got >= planned * 0.6 ? "info" : "warn", title: "Plan vs result: " + fmtR(got) + " of " + fmtR(planned), text: "Across " + pl.length + " trades with a planned target you captured " + Math.round(got / planned * 100) + "% of the R you planned. " + hit.length + " of " + pl.length + " reached the target." });
    if (early.length >= 2) {
      var left = early.reduce(function (a, t) { return a + (t.plan - t.r); }, 0);
      out.push({ tone: "warn", title: "Exiting early: " + fmtR(left) + " left behind", text: early.length + " winners closed well short of target. If the plan was sound, let the trade reach it." });
    }
  }
  // setup score
  var low = list.filter(function (t) { return gradeOf(t) === "C"; });
  var top = list.filter(function (t) { return gradeOf(t) === "A"; });
  if (low.length >= 2 && avgR(low) < 0) out.push({ tone: "warn", title: "C-grade setups: " + fmtR(sumR(low)), text: low.length + " trades scored C on your checklist and averaged " + fmtR(avgR(low)) + ". If it is not at least a B, it is not a trade." });
  if (top.length >= 3 && avgR(top) > 0) out.push({ tone: "good", title: "A-grade setups pay", text: top.length + " A-grade trades averaged " + fmtR(avgR(top)) + (low.length ? " against " + fmtR(avgR(low)) + " for C-grade." : ".") });
  // overtrading
  var byDay = {};
  list.forEach(function (t) { (byDay[t.date] = byDay[t.date] || []).push(t); });
  var busyDays = Object.keys(byDay).filter(function (d) { return byDay[d].length >= 4; });
  if (busyDays.length >= 1) {
    var bt = [];
    busyDays.forEach(function (d) { bt = bt.concat(byDay[d]); });
    out.push({ tone: avgR(bt) < 0 ? "warn" : "info", title: "Overtrading: " + busyDays.length + (busyDays.length === 1 ? " day" : " days") + " with 4+ trades", text: "Those days made " + fmtR(sumR(bt)) + " over " + bt.length + " trades, averaging " + fmtR(avgR(bt)) + " each." });
  }
  // weekdays
  var wd = {};
  list.forEach(function (t) { var w = weekdayOf(t.date); if (w) (wd[w] = wd[w] || []).push(t); });
  var names = Object.keys(wd).filter(function (w) { return wd[w].length >= 3; });
  if (names.length >= 2) {
    names.sort(function (a, b) { return avgR(wd[a]) - avgR(wd[b]); });
    var worst = names[0], best = names[names.length - 1];
    if (avgR(wd[worst]) < 0) out.push({ tone: "warn", title: "Weakest day: " + worst, text: wd[worst].length + " trades on " + worst + "s averaged " + fmtR(avgR(wd[worst])) + "." });
    if (avgR(wd[best]) > 0) out.push({ tone: "good", title: "Strongest day: " + best, text: wd[best].length + " trades on " + best + "s averaged " + fmtR(avgR(wd[best])) + "." });
  }
  var rank = { warn: 0, good: 1, info: 2 };
  out.sort(function (a, b) { return rank[a.tone] - rank[b.tone]; });
  return out;
}
function renderInsights() {
  var box = $("insights");
  clear(box);
  var list = view();
  if (list.length < 3) {
    box.appendChild(h("div", "empty", trades.length && !list.length ? "No trades match these filters." : "Log at least 3 trades, with mindset, rules and checklist score filled in, and warnings about your habits appear here."));
    return;
  }
  var items = buildInsights(list);
  if (!items.length) {
    box.appendChild(h("div", "empty", "Nothing to flag yet. Warnings appear once a habit shows up in at least 2 to 3 trades."));
    return;
  }
  var grid = h("div", "ins-grid");
  items.forEach(function (it) {
    var c = h("div", "ins " + it.tone);
    c.appendChild(h("div", "ins-t", it.title));
    c.appendChild(h("div", "ins-x", it.text));
    grid.appendChild(c);
  });
  box.appendChild(grid);
  var counts = {};
  list.forEach(function (t) {
    if (["Rushed", "FOMO", "Revenge", "Fear", "Bored"].indexOf(t.mood) >= 0) counts[t.mood] = (counts[t.mood] || 0) + 1;
    if (t.rules === "No") counts["Broke rules"] = (counts["Broke rules"] || 0) + 1;
  });
  var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
  if (names.length) {
    var mk = h("div", "mistakes");
    mk.appendChild(h("div", "lab", "Most common mistakes"));
    var chips = h("div", "chips");
    names.forEach(function (nm) { chips.appendChild(h("span", "chip", nm + " \u00d7" + counts[nm])); });
    mk.appendChild(chips);
    box.appendChild(mk);
  }
}
