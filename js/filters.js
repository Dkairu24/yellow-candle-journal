"use strict";
/* The Yellow Candle journal: Filters.
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- filters (change what the stats, curve, patterns and log show) ---------- */
var FILTER = { period: "all", from: "", to: "", pair: "", dir: "", tf: "", grade: "", tag: "" };
var TF_ORDER = ["1m", "3m", "5m", "15m", "30m", "1h", "4h"];

function fRange() {
  var p = FILTER.period;
  if (p === "all") return null;
  if (p === "custom") return [FILTER.from || "0000-00-00", FILTER.to || "9999-99-99"];
  if (p === "last30") {
    var now = new Date();
    var e = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var s = new Date(e);
    s.setDate(e.getDate() - 29);
    return [isoOf(s), isoOf(e)];
  }
  var r = periodRange(p);
  return [r[0], r[1]];
}
function filtersActive() {
  return FILTER.period !== "all" || !!FILTER.pair || !!FILTER.dir || !!FILTER.tf || !!FILTER.grade || !!FILTER.tag;
}
function view() {
  var r = fRange();
  return trades.filter(function (t) {
    if (r && (t.date < r[0] || t.date > r[1])) return false;
    if (FILTER.pair && t.pair !== FILTER.pair) return false;
    if (FILTER.dir && t.dir !== FILTER.dir) return false;
    if (FILTER.tf && t.tf !== FILTER.tf) return false;
    if (FILTER.tag && toArr(t.tags).indexOf(FILTER.tag) < 0) return false;
    if (FILTER.grade === "none") { if (gradeOf(t)) return false; }
    else if (FILTER.grade && gradeOf(t) !== FILTER.grade) return false;
    return true;
  });
}
function fillSelect(id, values, allLabel, key) {
  var sel = $(id);
  var keep = FILTER[key];
  clear(sel);
  var first = h("option", "", allLabel);
  first.value = "";
  sel.appendChild(first);
  values.forEach(function (v) {
    var o = h("option", "", v);
    o.value = v;
    sel.appendChild(o);
  });
  if (keep && values.indexOf(keep) < 0) { FILTER[key] = ""; keep = ""; }
  sel.value = keep || "";
}
function populateFilters() {
  var pairs = {}, tfs = {};
  trades.forEach(function (t) {
    if (t.pair) pairs[t.pair] = true;
    if (t.tf) tfs[t.tf] = true;
  });
  var dl = $("tag-list");
  clear(dl);
  allTags().forEach(function (x) { var o = document.createElement("option"); o.value = x; dl.appendChild(o); });
  fillSelect("flt-tag", allTags(), "All", "tag");
  fillSelect("flt-pair", Object.keys(pairs).sort(), "All", "pair");
  fillSelect("flt-tf", Object.keys(tfs).sort(function (a, b) {
    var ia = TF_ORDER.indexOf(a), ib = TF_ORDER.indexOf(b);
    if (ia < 0) ia = 99;
    if (ib < 0) ib = 99;
    return ia - ib || (a < b ? -1 : 1);
  }), "All", "tf");
  $("flt-period").value = FILTER.period;
  $("flt-dir").value = FILTER.dir;
  $("flt-grade").value = FILTER.grade;
  $("flt-from-f").hidden = FILTER.period !== "custom";
  $("flt-to-f").hidden = FILTER.period !== "custom";
  $("flt-from").value = FILTER.from;
  $("flt-to").value = FILTER.to;
}
function renderFilterSummary() {
  var total = trades.length;
  var shown = view().length;
  var active = filtersActive();
  $("flt-summary").textContent = active
    ? "Showing " + shown + " of " + total + (total === 1 ? " trade" : " trades")
    : total + (total === 1 ? " trade" : " trades");
  var nSet = 0;
  [["flt-period", "all"], ["flt-pair", ""], ["flt-dir", ""], ["flt-tf", ""], ["flt-tag", ""], ["flt-grade", ""]].forEach(function (p) {
    var el = $(p[0]);
    var on = el.value !== p[1];
    if (on) nSet++;
    el.parentNode.classList.toggle("set", on);
  });
  $("flt-count").textContent = nSet ? String(nSet) : "";
  $("flt-count").hidden = !nSet;
  $("flt-clear").hidden = !active;
  $("filters").classList.toggle("on", active);
}
function initFilterUI() {
  [["flt-pair", "pair"], ["flt-tag", "tag"], ["flt-dir", "dir"], ["flt-tf", "tf"], ["flt-grade", "grade"]].forEach(function (p) {
    $(p[0]).addEventListener("change", function (e) { FILTER[p[1]] = e.target.value; renderAll(); });
  });
  $("flt-period").addEventListener("change", function (e) {
    FILTER.period = e.target.value;
    if (FILTER.period === "custom" && !FILTER.from) {
      FILTER.from = periodRange("month")[0];
      FILTER.to = todayIso();
    }
    renderAll();
  });
  $("flt-from").addEventListener("change", function (e) { FILTER.from = e.target.value; renderAll(); });
  $("flt-to").addEventListener("change", function (e) { FILTER.to = e.target.value; renderAll(); });
  $("flt-clear").addEventListener("click", function () {
    FILTER = { period: "all", from: "", to: "", pair: "", dir: "", tf: "", grade: "", tag: "" };
    renderAll();
  });
}
