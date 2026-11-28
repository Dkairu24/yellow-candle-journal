"use strict";
/* The Yellow Candle journal: Motion (anime.js).
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- motion (anime.js; switched off when the device asks for reduced motion) ---------- */
var REDUCE = false;
try { REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* motion stays on */ }
var motionSig = "";
var settleTimer = null;
var lastVals = {};
var motionAnims = [];
var landingAnims = [];
function tracked(an, list) {
  return { stagger: an.stagger, animate: function () { var a = an.animate.apply(an, arguments); list.push(a); return a; } };
}
function finishAll(list) {
  list.splice(0).forEach(function (a) { try { if (a.complete) a.complete(); } catch (e) { /* already done */ } });
}
function A() { return !REDUCE && window.anime && window.anime.animate ? window.anime : null; }
function updateGlow() {
  var g = $("glow");
  if (!g) return;
  var l = view();
  var t = sumR(l);
  g.className = "glow " + (!l.length ? "off" : t > 0 ? "gain" : t < 0 ? "loss" : "off");
}
function countUp(an, first) {
  document.querySelectorAll("#stats .stat .value").forEach(function (el) {
    var txt = el.textContent;
    var m = /^([+−-]?)(\d+(?:\.\d+)?)(.*)$/.exec(txt);
    var key = el.parentNode.firstChild.textContent;
    if (!m) { delete lastVals[key]; return; }
    var sign = m[1], target = parseFloat(m[2]), dec = (m[2].split(".")[1] || "").length, suf = m[3];
    var from = first ? 0 : (lastVals[key] !== undefined ? lastVals[key] : 0);
    lastVals[key] = target;
    if (from === target) return;
    var o = { v: from };
    el.setAttribute("data-final", txt);
    el.textContent = sign + from.toFixed(dec) + suf;
    an.animate(o, {
      v: target, duration: first ? 900 : 450, ease: "outExpo",
      onUpdate: function () { el.textContent = sign + o.v.toFixed(dec) + suf; },
      onComplete: function () { el.textContent = txt; }
    });
  });
}
function reveal(an, sel, total) {
  var els = document.querySelectorAll(sel);
  if (!els.length) return;
  an.animate(els, { opacity: [0, 1], translateY: [8, 0], duration: 420, delay: an.stagger(Math.min(40, total / els.length)), ease: "outQuad" });
}
function runMotion() {
  var l = view();
  var sig = l.length + "|" + sumR(l).toFixed(3) + "|" + JSON.stringify(FILTER);
  var first = motionSig === "";
  var changed = sig !== motionSig;
  motionSig = sig;
  updateGlow();
  var rawAn = A();
  if (!rawAn || !changed) return;
  var an = tracked(rawAn, motionAnims);
  countUp(an, first);
  var line = curView === "overview" ? document.querySelector("#curve-wrap polyline.line") : null;
  var len = 0;
  try { if (line && line.getTotalLength) len = line.getTotalLength(); } catch (e) { len = 0; }
  if (line && len) {
    line.style.strokeDasharray = len;
    an.animate(line, {
      strokeDashoffset: [len, 0], duration: first ? 1100 : 600, ease: "outCubic",
      onComplete: function () { line.style.strokeDasharray = ""; line.style.strokeDashoffset = ""; }
    });
    an.animate("#curve-wrap svg path", { opacity: [0, 1], duration: 700, delay: 250, ease: "outQuad" });
    an.animate("#curve-wrap svg circle", { opacity: [0, 1], duration: 300, delay: an.stagger(25, { start: 500 }) });
  }
  an.animate("#daily-wrap rect", { opacity: [0, 1], duration: 400, delay: an.stagger(22) });
  reveal(an, ".ins", 300);
  clearTimeout(settleTimer);
  settleTimer = setTimeout(function () {
    finishAll(motionAnims);
    document.querySelectorAll(".ins, .cal-c, #breakdown .cards > *, #log tbody tr, #daily-wrap rect").forEach(function (e) { e.style.opacity = ""; e.style.transform = ""; });
    document.querySelectorAll("#stats .stat .value[data-final]").forEach(function (e) { e.textContent = e.getAttribute("data-final"); });
  }, 4500);
}
function initShell() {
  var mb = $("more-btn"), mm = $("more-menu");
  function setMenu(open) { mm.hidden = !open; mb.setAttribute("aria-expanded", open ? "true" : "false"); }
  mb.addEventListener("click", function (e) { e.stopPropagation(); setMenu(mm.hidden); });
  mm.addEventListener("click", function () { setMenu(false); });
  document.addEventListener("click", function (e) { if (!mm.hidden && !mm.contains(e.target) && !mb.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !mm.hidden) { setMenu(false); mb.focus(); } });
  $("fab").addEventListener("click", function () { if (editingId) resetForm(); openDrawer(); });
  $("empty-log").addEventListener("click", function () { openDrawer(); });
  $("empty-import").addEventListener("click", function () { $("broker").click(); });
  $("flt-toggle").addEventListener("click", function () {
    var open = !$("filters").classList.contains("open");
    $("filters").classList.toggle("open", open);
    $("flt-toggle").setAttribute("aria-expanded", open ? "true" : "false");
  });
  window.addEventListener("hashchange", function () {
    var v = location.hash.slice(1);
    if (VIEWS.indexOf(v) >= 0) showView(v);
  });
  var v0 = location.hash.slice(1);
  showView(VIEWS.indexOf(v0) >= 0 ? v0 : "overview", true);
  var rt = null;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(refreshCharts, 160); });
}
function initMotion() {
  initShell();
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (drawerOpen) { closeDrawer(); return; }
    var open = document.querySelector(".modal:not([hidden])");
    if (!open) return;
    var b = open.querySelector(".modal-head .btn");
    if (b) b.click(); else open.hidden = true;
  });
  document.querySelectorAll(".modal").forEach(function (m) {
    new MutationObserver(function () {
      var an = A();
      var box = m.querySelector(".modal-box");
      document.body.classList.toggle("modal-open", [].some.call(document.querySelectorAll(".modal"), function (x) { return !x.hidden; }));
      if (!m.hidden && an && box) an.animate(box, { opacity: [0, 1], translateY: [14, 0], duration: 260, ease: "outCubic" });
    }).observe(m, { attributes: true, attributeFilter: ["hidden"] });
  });
}
