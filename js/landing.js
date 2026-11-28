"use strict";
/* The Yellow Candle journal: Landing page.
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- landing page (new visitors only) ---------- */
var authReady = false;
var landingDismissed = false;
try { landingDismissed = window.localStorage.getItem("yc-landing-dismissed") === "1"; } catch (e) { /* shown each visit */ }
var landingStarted = false;
var auraAnim = null;
function lpCount(an, el, dur, delay) {
  if (!el) return;
  var txt = el.textContent;
  var m = /^([+\u2212-]?)(\d+(?:\.\d+)?)(.*)$/.exec(txt);
  if (!m) return;
  var sign = m[1], target = parseFloat(m[2]), dec = (m[2].split(".")[1] || "").length, suf = m[3];
  var o = { v: 0 };
  el.setAttribute("data-final", txt);
  el.textContent = sign + (0).toFixed(dec) + suf;
  an.animate(o, {
    v: target, duration: dur, delay: delay || 0, ease: "outExpo",
    onUpdate: function () { el.textContent = sign + o.v.toFixed(dec) + suf; },
    onComplete: function () { el.textContent = txt; }
  });
}
var lpSettleTimer = null;
function lpSettle() {
  clearTimeout(lpSettleTimer);
  lpSettleTimer = setTimeout(function () { finishAll(landingAnims); }, 4500);
}
function onView(el, cb) {
  if (!el) return;
  if (!window.IntersectionObserver) { cb(); lpSettle(); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); lpSettle(); } });
  }, { threshold: 0.18 });
  io.observe(el);
}
function playPreview(an, card) {
  an.animate(card, { opacity: [0, 1], translateY: [56, 0], duration: 1000, ease: "outCubic" });
  lpCount(an, card.querySelector(".big"), 1800, 300);
  card.querySelectorAll(".lp-figs .v").forEach(function (el, i) { lpCount(an, el, 1300, 500 + i * 110); });
  var ring = card.querySelector(".ring circle:nth-of-type(2)");
  if (ring) {
    var ro = { v: 0 };
    ring.setAttribute("stroke-dasharray", "0 188.5");
    an.animate(ro, { v: 109.9, duration: 1500, delay: 350, ease: "outCubic", onUpdate: function () { ring.setAttribute("stroke-dasharray", ro.v.toFixed(1) + " 188.5"); } });
  }
  lpCount(an, card.querySelector(".ring text"), 1500, 350);
  var svgs = card.querySelectorAll(".lp-charts svg");
  if (svgs[0]) {
    var paths = svgs[0].querySelectorAll("path");
    var line = paths[1];
    if (line && line.getTotalLength) {
      var len = line.getTotalLength();
      line.style.strokeDasharray = len;
      an.animate(line, { strokeDashoffset: [len, 0], duration: 1700, delay: 700, ease: "outCubic", onComplete: function () { line.style.strokeDasharray = ""; line.style.strokeDashoffset = ""; } });
    }
    if (paths[0]) an.animate(paths[0], { opacity: [0, 1], duration: 900, delay: 1500 });
    an.animate(svgs[0].querySelectorAll("circle"), { opacity: [0, 1], duration: 300, delay: 2200 });
  }
  if (svgs[1]) {
    var rects = svgs[1].querySelectorAll("rect");
    rects.forEach(function (r) {
      var up = parseFloat(r.getAttribute("y")) + parseFloat(r.getAttribute("height")) <= 70.5;
      r.style.transformBox = "fill-box";
      r.style.transformOrigin = up ? "50% 100%" : "50% 0%";
    });
    an.animate(rects, { scaleY: [0, 1], duration: 800, delay: an.stagger(70, { start: 900 }), ease: "outCubic" });
  }
}
function startLanding() {
  var rawAn = A();
  var L = $("landing");
  if (!rawAn || !L) return;
  var an = tracked(rawAn, landingAnims);
  L.classList.add("lp-js");
  an.animate("#landing .lp-pill, #landing .lp-hero h1, #landing .lp-hero p", { opacity: [0, 1], translateY: [20, 0], duration: 900, delay: an.stagger(140), ease: "outCubic" });
  var card = L.querySelector(".lp-preview");
  onView(card, function () { playPreview(an, card); });
  onView(L.querySelector(".lp-points"), function () {
    an.animate("#landing .lp-point", { opacity: [0, 1], translateY: [22, 0], duration: 750, delay: an.stagger(120), ease: "outCubic" });
  });
  onView(L.querySelector(".lp-final"), function () {
    an.animate("#landing .lp-final", { opacity: [0, 1], translateY: [22, 0], duration: 800, ease: "outCubic" });
  });
  auraAnim = rawAn.animate("#landing .lp-aura", { scale: [1, 1.14], opacity: [0.45, 0.85], duration: 5200, ease: "inOutSine", loop: true, alternate: true });
  lpSettle();
}
function updateLanding() {
  var L = $("landing"), W = document.querySelector(".wrap");
  if (!L || !W || !authReady || !loaded) return;
  var show = !sbUser && !trades.length && !landingDismissed;
  L.hidden = !show;
  W.hidden = show;
  if (!show) refreshCharts();
  if (show && !landingStarted) { landingStarted = true; startLanding(); }
  if (auraAnim && auraAnim.pause) { if (show) auraAnim.play(); else auraAnim.pause(); }
  document.body.classList.remove("booting");
}
function openSignup() {
  $("acct-btn").click();
  setTimeout(function () { $("acct-email-in").focus(); }, 60);
}
function initLanding() {
  ["lp-signup", "lp-signin", "lp-signin-top"].forEach(function (id) { $(id).addEventListener("click", openSignup); });
  ["lp-try"].forEach(function (id) {
    $(id).addEventListener("click", function () {
      landingDismissed = true;
      try { window.localStorage.setItem("yc-landing-dismissed", "1"); } catch (e) { /* kept for this visit */ }
      updateLanding();
      window.scrollTo(0, 0);
    });
  });
  setTimeout(function () { authReady = true; updateLanding(); }, 2000);
}
