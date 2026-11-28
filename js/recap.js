"use strict";
/* The Yellow Candle journal: Recap cards.
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- recap cards (a period summary, drawn on a canvas, saved as PNG) ---------- */
var RECAP = { period: "week", from: "", to: "", fmt: "feed", n: 0 };

function isoOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function periodRange(p) {
  var now = new Date();
  var d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var dow = (d0.getDay() + 6) % 7; // Monday = 0
  var s, e;
  if (p === "week" || p === "lastweek") {
    s = new Date(d0); s.setDate(d0.getDate() - dow - (p === "lastweek" ? 7 : 0));
    e = new Date(s); e.setDate(s.getDate() + 6);
    return [isoOf(s), isoOf(e), "WEEKLY RECAP"];
  }
  if (p === "month" || p === "lastmonth") {
    var off = p === "lastmonth" ? -1 : 0;
    s = new Date(d0.getFullYear(), d0.getMonth() + off, 1);
    e = new Date(d0.getFullYear(), d0.getMonth() + off + 1, 0);
    return [isoOf(s), isoOf(e), "MONTHLY RECAP"];
  }
  if (p === "all") {
    var ds = trades.map(function (t) { return t.date; }).sort();
    return [ds[0] || isoOf(d0), ds[ds.length - 1] || isoOf(d0), "ALL-TIME RECORD"];
  }
  return [RECAP.from || isoOf(d0), RECAP.to || isoOf(d0), "TRADE RECAP"];
}
function recapRangeText(a, b) {
  var ma = /^(\d{4})-(\d{2})-(\d{2})/.exec(a), mb = /^(\d{4})-(\d{2})-(\d{2})/.exec(b);
  if (!ma || !mb) return "";
  var da = parseInt(ma[3], 10) + " " + MON[parseInt(ma[2], 10) - 1].toUpperCase();
  var db = parseInt(mb[3], 10) + " " + MON[parseInt(mb[2], 10) - 1].toUpperCase();
  if (a === b) return db + " " + mb[1];
  if (ma[1] === mb[1]) return da + " - " + db + " " + mb[1];
  return da + " " + ma[1] + " - " + db + " " + mb[1];
}
function recapTrades(range) {
  return sorted().filter(function (t) { return t.date >= range[0] && t.date <= range[1]; });
}
function listStats(list) {
  var n = list.length, wins = 0, gw = 0, gl = 0, total = 0, best = null, worst = null;
  var cum = 0, peak = 0, dd = 0, yes = 0, ans = 0;
  list.forEach(function (t) {
    total += t.r;
    if (t.r > 0) { wins++; gw += t.r; }
    if (t.r < 0) gl += -t.r;
    if (best === null || t.r > best) best = t.r;
    if (worst === null || t.r < worst) worst = t.r;
    cum += t.r;
    if (cum > peak) peak = cum;
    if (peak - cum > dd) dd = peak - cum;
    if (t.rules === "Yes" || t.rules === "No") { ans++; if (t.rules === "Yes") yes++; }
  });
  return {
    n: n, total: total, winRate: n ? wins / n : null, avg: n ? total / n : null,
    pf: gl > 0 ? gw / gl : (gw > 0 ? Infinity : null), dd: dd, best: best, worst: worst,
    rulesPct: ans ? yes / ans : null
  };
}

function drawCurveOn(ctx, list, x, y, w, h, accent) {
  var cum = [0];
  list.forEach(function (t) { cum.push(cum[cum.length - 1] + t.r); });
  var mn = Math.min.apply(null, cum.concat([0])), mx = Math.max.apply(null, cum.concat([0]));
  if (mx === mn) mx = mn + 1;
  var step = niceStep((mx - mn) / 4);
  var lo = Math.floor(mn / step) * step, hi = Math.ceil(mx / step) * step;
  if (hi === lo) hi = lo + step;
  var L = 88, R = 112, T = 30, B = 56;
  function yy(v) { return y + T + (hi - v) / (hi - lo) * (h - T - B); }
  function xx(i) { return x + L + (cum.length > 1 ? i / (cum.length - 1) : 0.5) * (w - L - R); }
  ctx.font = "400 20px " + BODY; ctx.textAlign = "right";
  for (var v = lo; v <= hi + step / 1000; v += step) {
    ctx.strokeStyle = v === 0 ? "#555555" : "#262626"; ctx.lineWidth = v === 0 ? 2 : 1;
    ctx.setLineDash(v === 0 ? [8, 8] : []);
    ctx.beginPath(); ctx.moveTo(x + L, yy(v)); ctx.lineTo(x + w - R, yy(v)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#8d8d88";
    ctx.fillText((v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v * 100) / 100) + "R", x + L - 14, yy(v) + 7);
  }
  var every = Math.max(1, Math.ceil((cum.length - 1) / 8));
  ctx.textAlign = "center"; ctx.fillStyle = "#8d8d88";
  for (var i = 0; i < cum.length; i += every) ctx.fillText(i === 0 ? "Start" : "#" + i, xx(i), y + h - 18);
  if (cum.length > 1) {
    var grad = ctx.createLinearGradient(0, y + T, 0, y + h - B);
    grad.addColorStop(0, "rgba(241,205,96,0.30)"); grad.addColorStop(1, "rgba(241,205,96,0)");
    ctx.beginPath(); ctx.moveTo(xx(0), yy(0));
    for (i = 0; i < cum.length; i++) ctx.lineTo(xx(i), yy(cum[i]));
    ctx.lineTo(xx(cum.length - 1), yy(0)); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(xx(0), yy(cum[0]));
    for (i = 1; i < cum.length; i++) ctx.lineTo(xx(i), yy(cum[i]));
    ctx.strokeStyle = "#F1CD60"; ctx.lineWidth = 4; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
  }
  list.forEach(function (t, k) {
    var j = k + 1;
    ctx.beginPath(); ctx.arc(xx(j), yy(cum[j]), j === cum.length - 1 ? 8 : 5, 0, Math.PI * 2);
    ctx.fillStyle = t.r > 0 ? "#F1CD60" : t.r < 0 ? "#F77B75" : "#8d8d88"; ctx.fill();
  });
  ctx.textAlign = "left"; ctx.fillStyle = accent; ctx.font = "700 24px " + BODY;
  ctx.fillText(fmtR(cum[cum.length - 1]), xx(cum.length - 1) + 16, yy(cum[cum.length - 1]) + 8);
}

function statRow(ctx, W, top, cols) {
  var colw = (W - 140) / 4;
  cols.forEach(function (c, i) {
    var cx = 70 + i * colw;
    if (i) { ctx.strokeStyle = "#262626"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 18, top - 14); ctx.lineTo(cx - 18, top + 62); ctx.stroke(); }
    ctx.fillStyle = "#969696"; ctx.font = "700 20px " + BODY;
    spaced(ctx, c[0], cx, top + 6, 2, "left");
    ctx.fillStyle = c[2]; ctx.font = "700 36px " + BODY; ctx.textAlign = "left";
    ctx.fillText(c[1], cx, top + 52);
  });
}

function drawRecap(canvas) {
  var size = CARD_SIZES[RECAP.fmt] || CARD_SIZES.feed, W = size[0], H = size[1];
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext("2d");
  var range = periodRange(RECAP.period);
  var list = recapTrades(range);
  var st = listStats(list);
  RECAP.n = st.n;
  var accent = st.total > 0.05 ? "#F1CD60" : st.total < -0.05 ? "#F77B75" : "#8d8d88";
  ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 2; ctx.strokeRect(24, 24, W - 48, H - 48);

  // header
  ctx.strokeStyle = "#F1CD60"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(81, 70); ctx.lineTo(81, 116); ctx.stroke();
  ctx.fillStyle = "#F1CD60"; ctx.fillRect(72, 80, 18, 26);
  ctx.font = "700 34px " + DISPLAY; ctx.textBaseline = "alphabetic";
  spaced(ctx, "THE YELLOW CANDLE", 112, 105, 2, "left");
  ctx.fillStyle = "#969696"; ctx.font = "700 28px " + BODY;
  spaced(ctx, CARD.handle || "", W - 70, 103, 0, "right");

  // period pill and dates
  var py = 150;
  ctx.font = "700 28px " + BODY;
  var pw = ctx.measureText(range[2]).width + 56;
  ctx.fillStyle = "#F1CD60"; rr(ctx, 71, py, pw, 58, 29); ctx.fill();
  ctx.fillStyle = "#000000"; ctx.textAlign = "left"; ctx.fillText(range[2], 71 + 28, py + 39);
  ctx.fillStyle = "#969696"; ctx.font = "700 26px " + BODY;
  spaced(ctx, recapRangeText(range[0], range[1]), W - 70, py + 38, 0, "right");

  // footer
  var footY = H - 150;
  ctx.strokeStyle = "#262626"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(70, footY); ctx.lineTo(W - 70, footY); ctx.stroke();
  ctx.fillStyle = "#787878"; ctx.font = "400 21px " + BODY; ctx.textAlign = "left";
  ctx.fillText("Past results do not predict future results. CFDs are high risk; most retail accounts lose money.", 70, footY + 36);
  ctx.fillStyle = "#969696"; ctx.font = "700 24px " + BODY;
  ctx.fillText("Gold up. Red down. Black is the discipline.", 70, footY + 70);

  if (!st.n) {
    ctx.fillStyle = "#8d8d88"; ctx.font = "700 34px " + DISPLAY; ctx.textAlign = "center";
    ctx.fillText("NO TRADES IN THIS PERIOD", W / 2, H / 2);
    ctx.font = "400 24px " + BODY;
    ctx.fillText("Pick another period or log trades first.", W / 2, H / 2 + 46);
    return;
  }

  // headline result
  var big = fmtR(st.total);
  var bigSize = H < 1200 ? 140 : 190;
  ctx.font = "700 " + bigSize + "px " + DISPLAY;
  while (ctx.measureText(big).width > W - 130 && bigSize > 60) { bigSize -= 6; ctx.font = "700 " + bigSize + "px " + DISPLAY; }
  var baseline = 235 + Math.round(bigSize * 0.86);
  ctx.fillStyle = accent; ctx.textAlign = "left";
  ctx.fillText(big, 62, baseline);
  ctx.font = "700 30px " + BODY;
  spaced(ctx, st.n + (st.n === 1 ? " TRADE" : " TRADES"), 70, baseline + 50, 4, "left");

  // stat rows, measured from the footer
  var twoRows = H >= 1300;
  var row2Top = footY - 24 - 110;
  var row1Top = twoRows ? row2Top - 120 : row2Top;
  var panelTop = baseline + 50 + 34;
  var panelBottom = row1Top - 40;
  var panelH = Math.max(180, panelBottom - panelTop);
  var px = 54, pwid = W - 108;
  ctx.fillStyle = "#0b0b0b"; rr(ctx, px, panelTop, pwid, panelH, 18); ctx.fill();
  ctx.save(); rr(ctx, px, panelTop, pwid, panelH, 18); ctx.clip();
  drawCurveOn(ctx, list, px, panelTop, pwid, panelH, accent);
  ctx.restore();
  ctx.strokeStyle = "#464646"; ctx.lineWidth = 2; rr(ctx, px, panelTop, pwid, panelH, 18); ctx.stroke();

  var pf = st.pf === null ? "-" : st.pf === Infinity ? "No losses" : st.pf.toFixed(2);
  statRow(ctx, W, row1Top, [
    ["WIN RATE", Math.round(st.winRate * 100) + "%", "#E9E5D8"],
    ["AVERAGE R", fmtR(st.avg), st.avg > 0 ? "#F1CD60" : "#F77B75"],
    ["PROFIT FACTOR", pf, "#E9E5D8"],
    ["MAX DRAWDOWN", st.dd === 0 ? "0.00R" : "−" + st.dd.toFixed(2) + "R", st.dd === 0 ? "#E9E5D8" : "#F77B75"]
  ]);
  if (twoRows) {
    statRow(ctx, W, row2Top, [
      ["BEST TRADE", fmtR(st.best), st.best > 0 ? "#F1CD60" : "#F77B75"],
      ["WORST TRADE", fmtR(st.worst), st.worst < 0 ? "#F77B75" : "#E9E5D8"],
      ["RULES KEPT", st.rulesPct === null ? "-" : Math.round(st.rulesPct * 100) + "%", "#E9E5D8"],
      ["TRADES", String(st.n), "#E9E5D8"]
    ]);
  }
}

function renderRecap() {
  var canvas = $("recap-canvas");
  var go = function () {
    drawRecap(canvas);
    $("recap-download").disabled = !RECAP.n;
  };
  if (document.fonts && document.fonts.load) {
    Promise.all([
      Promise.resolve(),
      document.fonts.load('700 24px "Inter"'),
      document.fonts.load('400 24px "Inter"')
    ]).then(go, go);
  } else { go(); }
}
function syncRecapUI() {
  Array.prototype.forEach.call($("recap-fmt").children, function (b) {
    b.setAttribute("aria-checked", b.getAttribute("data-v") === RECAP.fmt ? "true" : "false");
  });
  $("recap-period").value = RECAP.period;
  $("recap-custom").hidden = RECAP.period !== "custom";
  $("recap-from").value = RECAP.from;
  $("recap-to").value = RECAP.to;
  $("recap-handle").value = CARD.handle;
}
function openRecap() {
  $("recap-modal").hidden = false;
  document.body.style.overflow = "hidden";
  if (!RECAP.from) { RECAP.from = periodRange("month")[0]; RECAP.to = todayIso(); }
  syncRecapUI();
  renderRecap();
  $("recap-close").focus();
}
function closeRecap() {
  $("recap-modal").hidden = true;
  document.body.style.overflow = "";
}
function initRecapUI() {
  $("recap-btn").addEventListener("click", openRecap);
  var fmtBox = $("recap-fmt");
  [["feed", "Feed 4:5"], ["story", "Story 9:16"], ["square", "Square 1:1"]].forEach(function (f) {
    var b = h("button", "", f[1]);
    b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("data-v", f[0]); b.setAttribute("aria-checked", "false");
    b.addEventListener("click", function () { RECAP.fmt = f[0]; syncRecapUI(); renderRecap(); });
    fmtBox.appendChild(b);
  });
  $("recap-period").addEventListener("change", function (e) { RECAP.period = e.target.value; syncRecapUI(); renderRecap(); });
  $("recap-from").addEventListener("change", function (e) { RECAP.from = e.target.value; renderRecap(); });
  $("recap-to").addEventListener("change", function (e) { RECAP.to = e.target.value; renderRecap(); });
  $("recap-handle").addEventListener("input", function (e) {
    CARD.handle = e.target.value;
    try { window.localStorage.setItem("yellow-candle-handle", CARD.handle); } catch (err) { /* not saved */ }
    renderRecap();
  });
  $("recap-download").addEventListener("click", function () {
    $("recap-canvas").toBlob(function (blob) {
      if (!blob) { toast("Could not make the image"); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "yellow-candle-recap-" + RECAP.period + "-" + todayIso() + "-" + RECAP.fmt + ".png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Recap saved");
    }, "image/png");
  });
  $("recap-close").addEventListener("click", closeRecap);
  $("recap-modal").addEventListener("click", function (e) { if (e.target === $("recap-modal")) closeRecap(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("recap-modal").hidden) closeRecap(); });
}
