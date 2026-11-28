/* The Yellow Candle journal: Result cards.
   An ES module: it imports what it needs from the other files. */

import { gradeOf } from "./checklist";
import { $, MON, dollarMode, fmtPx, fmtR, h, money, toArr, toast, todayIso, trades, usd } from "./core";

/* ---------- result cards (drawn on a canvas, saved as PNG) ---------- */
export var CARD = { trade: null, img: null, fmt: "feed", prices: true, tags: true, handle: "@theyellowcandlefx" };
export var CARD_SIZES = { feed: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };
try {
  var savedHandle = window.localStorage.getItem("yellow-candle-handle");
  if (savedHandle) CARD.handle = savedHandle;
} catch (e) { /* keep the default handle */ }

function cardDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  return parseInt(m[3], 10) + " " + MON[parseInt(m[2], 10) - 1].toUpperCase() + " " + m[1];
}
export function spaced(ctx, str, x, y, sp, align) {
  var total = 0, i;
  for (i = 0; i < str.length; i++) total += ctx.measureText(str.charAt(i)).width + sp;
  total -= sp;
  var cx = align === "right" ? x - total : x;
  ctx.textAlign = "left";
  for (i = 0; i < str.length; i++) {
    ctx.fillText(str.charAt(i), cx, y);
    cx += ctx.measureText(str.charAt(i)).width + sp;
  }
  return total;
}
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
function cardTags(t) {
  var out = [];
  if (t.htf) out.push(t.htf + " 1H bias");
  if (t.poi) out.push(t.poi);
  if (t.sweep === "Yes") out.push("Liquidity sweep");
  toArr(t.trigger).forEach(function (x) { out.push(x); });
  if (t.disp === "Strong") out.push("Strong displacement");
  if (t.fresh === "Yes") out.push("Fresh zone");
  if (t.chkN) out.push("Setup " + gradeOf(t));
  return out;
}
function isNum(v) { return v !== undefined && v !== null && v !== "" && !isNaN(Number(v)); }

export var DISPLAY = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif';
export var BODY = '-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif';

function drawLevels(ctx, t, x, y, w, h, accent, win) {
  var hasPx = isNum(t.entry) && isNum(t.stop) && isNum(t.exit) && Number(t.entry) !== Number(t.stop);
  ctx.fillStyle = "#8d8d88";
  ctx.font = "700 22px " + BODY;
  spaced(ctx, (t.dir === "Short" ? "SHORT" : "LONG") + "  " + (t.pair || ""), x + 28, y + 44, 3, "left");
  if (!hasPx) {
    // no prices to draw: compare the risk (1R) with the result
    var maxR = Math.max(1, Math.abs(t.r));
    var bx = x + 56, bw = w - 112;
    var bh = Math.max(24, Math.min(64, (h - 70 - 68 - 24 - 20) / 2));
    var y1 = y + 104, y2 = y1 + bh + 24 + 34;
    ctx.fillStyle = "#8d8d88";
    ctx.font = "700 22px " + BODY;
    spaced(ctx, "RISK", bx, y1 - 14, 3, "left");
    spaced(ctx, "RESULT", bx, y2 - 14, 3, "left");
    ctx.fillStyle = "#E9E5D8";
    rr(ctx, bx, y1, Math.max(8, bw * (1 / maxR)), bh, 10); ctx.fill();
    ctx.fillStyle = accent;
    rr(ctx, bx, y2, Math.max(8, bw * (Math.abs(t.r) / maxR)), bh, 10); ctx.fill();
    ctx.font = "700 32px " + DISPLAY;
    ctx.fillStyle = "#E9E5D8"; ctx.textAlign = "left";
    ctx.fillText("1.00R", bx + 18, y1 + bh / 2 + 11);
    ctx.fillStyle = "#000000";
    ctx.fillText(fmtR(t.r), bx + 18, y2 + bh / 2 + 11);
    return;
  }
  var e = Number(t.entry), s = Number(t.stop), xt = Number(t.exit);
  var lo = Math.min(e, s, xt), hi = Math.max(e, s, xt);
  var pad = (hi - lo) * 0.2 || 1;
  lo -= pad; hi += pad;
  var top = y + 70, bottom = y + h - 40;
  function yOf(v) { return bottom - (v - lo) / (hi - lo) * (bottom - top); }
  var x1 = x + 56, x2 = x + w - 330;
  // risk zone (entry to stop) and result zone (entry to exit)
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  ctx.fillRect(x1, Math.min(yOf(e), yOf(s)), x2 - x1, Math.abs(yOf(e) - yOf(s)));
  ctx.fillStyle = win ? "rgba(241,205,96,0.30)" : "rgba(247,123,117,0.26)";
  ctx.fillRect(x1, Math.min(yOf(e), yOf(xt)), x2 - x1, Math.abs(yOf(e) - yOf(xt)));
  // level lines
  function line(v, color, wd, dash?) {
    ctx.strokeStyle = color; ctx.lineWidth = wd; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(x1, yOf(v)); ctx.lineTo(x2, yOf(v)); ctx.stroke(); ctx.setLineDash([]);
  }
  line(s, "#E9E5D8", 4);
  line(e, "#E9E5D8", 3, [12, 10]);
  line(xt, accent, 5);
  // labels on the right, pushed apart so they never overlap
  var items: any[] = [
    { v: s, name: "STOP", color: "#F77B75" },
    { v: e, name: "ENTRY", color: "#E9E5D8" },
    { v: xt, name: "EXIT", color: accent }
  ];
  items.sort(function (a, b) { return yOf(a.v) - yOf(b.v); });
  var gap = Math.min(74, (h - 100) / 3), prev = -1e9;
  items.forEach(function (it) { it.y = Math.max(yOf(it.v), prev + gap); prev = it.y; });
  var overflow = items[items.length - 1].y - (y + h - 30);
  if (overflow > 0) items.forEach(function (it) { it.y -= overflow; });
  items.forEach(function (it) {
    ctx.strokeStyle = "#555555"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x2, yOf(it.v)); ctx.lineTo(x2 + 26, it.y); ctx.stroke();
    ctx.fillStyle = "#8d8d88"; ctx.font = "700 20px " + BODY;
    spaced(ctx, it.name, x2 + 40, it.y - 8, 3, "left");
    ctx.fillStyle = it.color; ctx.font = "700 34px " + DISPLAY; ctx.textAlign = "left";
    ctx.fillText(fmtPx(it.v, t), x2 + 40, it.y + 28);
  });
}

function drawCard(canvas) {
  var t = CARD.trade;
  if (!t) return;
  var size = CARD_SIZES[CARD.fmt] || CARD_SIZES.feed, W = size[0], H = size[1];
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext("2d");
  var win = t.r >= 0.1, loss = t.r <= -0.1;
  var accent = win ? "#F1CD60" : loss ? "#F77B75" : "#8d8d88";
  ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 2; ctx.strokeRect(24, 24, W - 48, H - 48);

  // header: candle mark, name, handle
  ctx.strokeStyle = "#F1CD60"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(81, 70); ctx.lineTo(81, 116); ctx.stroke();
  ctx.fillStyle = "#F1CD60"; ctx.fillRect(72, 80, 18, 26);
  ctx.font = "700 34px " + DISPLAY; ctx.textBaseline = "alphabetic";
  spaced(ctx, "THE YELLOW CANDLE", 112, 105, 2, "left");
  ctx.fillStyle = "#969696"; ctx.font = "700 28px " + BODY;
  spaced(ctx, CARD.handle || "", W - 70, 103, 0, "right");

  // pair and side pills, date
  var py = 150;
  ctx.font = "700 30px " + BODY;
  var pair = t.pair || "XAUUSD";
  var pw = ctx.measureText(pair).width + 56;
  ctx.strokeStyle = "#E9E5D8"; ctx.lineWidth = 2; rr(ctx, 71, py + 1, pw, 56, 28); ctx.stroke();
  ctx.fillStyle = "#E9E5D8"; ctx.textAlign = "left"; ctx.fillText(pair, 71 + 28, py + 39);
  var side = (t.dir || "").toUpperCase();
  var sw = ctx.measureText(side).width + 56, sx = 71 + pw + 16;
  ctx.fillStyle = t.dir === "Short" ? "#E9E5D8" : "#F1CD60";
  rr(ctx, sx, py, sw, 58, 29); ctx.fill();
  ctx.fillStyle = "#000000"; ctx.fillText(side, sx + 28, py + 39);
  ctx.fillStyle = "#969696"; ctx.font = "700 26px " + BODY;
  spaced(ctx, cardDate(t.date) + "  |  " + (t.tf || "").toUpperCase(), W - 70, py + 38, 0, "right");

  // the result
  var big = dollarMode() ? money(usd(t)) : fmtR(t.r);
  var bigSize = H < 1200 ? 150 : 210;
  ctx.font = "700 " + bigSize + "px " + DISPLAY;
  while (ctx.measureText(big).width > W - 130 && bigSize > 60) { bigSize -= 6; ctx.font = "700 " + bigSize + "px " + DISPLAY; }
  var baseline = 235 + Math.round(bigSize * 0.86);
  ctx.fillStyle = accent; ctx.textAlign = "left";
  ctx.fillText(big, 62, baseline);
  var label = win ? "WINNER" : loss ? (t.r <= -0.95 ? "STOPPED OUT" : "LOSS") : "BREAKEVEN";
  ctx.font = "700 30px " + BODY;
  spaced(ctx, label, 70, baseline + 50, 4, "left");

  // bottom blocks, measured from the foot of the card
  var footY = H - 150;
  var statsTop = footY - 24 - 110;
  var tags = CARD.tags ? cardTags(t) : [];
  var tagsTop = statsTop - 74;
  var panelTop = baseline + 50 + 34;
  var panelBottom = (tags.length ? tagsTop : statsTop) - 28;
  var panelH = Math.max(160, panelBottom - panelTop);
  var px = 54, pwid = W - 108;

  // chart panel: screenshot if given, else the levels drawn to scale
  ctx.save();
  rr(ctx, px, panelTop, pwid, panelH, 18); ctx.clip();
  ctx.fillStyle = "#0b0b0b"; ctx.fillRect(px, panelTop, pwid, panelH);
  if (CARD.img) {
    var sc = Math.max(pwid / CARD.img.width, panelH / CARD.img.height);
    var iw = CARD.img.width * sc, ih = CARD.img.height * sc;
    ctx.drawImage(CARD.img, px + (pwid - iw) / 2, panelTop + (panelH - ih) / 2, iw, ih);
  } else if (CARD.prices) {
    drawLevels(ctx, t, px, panelTop, pwid, panelH, accent, win);
  } else {
    drawLevels(ctx, { r: t.r, dir: t.dir, pair: t.pair }, px, panelTop, pwid, panelH, accent, win);
  }
  ctx.restore();
  ctx.strokeStyle = "#464646"; ctx.lineWidth = 2; rr(ctx, px, panelTop, pwid, panelH, 18); ctx.stroke();

  // setup tags
  if (tags.length) {
    var cx = 70;
    ctx.font = "600 22px " + BODY;
    tags.forEach(function (tg) {
      var cw = ctx.measureText(tg).width + 30;
      if (cx + cw > W - 70) return;
      ctx.strokeStyle = "#555555"; ctx.lineWidth = 2; rr(ctx, cx, tagsTop, cw, 40, 10); ctx.stroke();
      ctx.fillStyle = "#F4F4F2"; ctx.textAlign = "left"; ctx.fillText(tg, cx + 15, tagsTop + 28);
      cx += cw + 10;
    });
  }

  // stats row
  var cols;
  if (CARD.prices && isNum(t.entry)) {
    cols = [["ENTRY", fmtPx(t.entry, t), "#E9E5D8"], ["STOP", isNum(t.stop) ? fmtPx(t.stop, t) : "-", "#E9E5D8"],
            ["EXIT", isNum(t.exit) ? fmtPx(t.exit, t) : "-", accent], ["TIMEFRAME", (t.tf || "-").toUpperCase(), "#E9E5D8"]];
  } else {
    cols = [["PAIR", pair, "#E9E5D8"], ["SIDE", (t.dir || "-").toUpperCase(), "#E9E5D8"],
            ["TIMEFRAME", (t.tf || "-").toUpperCase(), "#E9E5D8"], ["RESULT", dollarMode() ? money(usd(t)) : fmtR(t.r), accent]];
  }
  var colw = (W - 140) / 4;
  cols.forEach(function (c, i) {
    var cx2 = 70 + i * colw;
    if (i) { ctx.strokeStyle = "#262626"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx2 - 18, statsTop - 14); ctx.lineTo(cx2 - 18, statsTop + 62); ctx.stroke(); }
    ctx.fillStyle = "#969696"; ctx.font = "700 22px " + BODY;
    spaced(ctx, c[0], cx2, statsTop + 6, 3, "left");
    ctx.fillStyle = c[2]; ctx.font = "700 36px " + BODY; ctx.textAlign = "left";
    ctx.fillText(c[1], cx2, statsTop + 52);
  });

  // footer
  ctx.strokeStyle = "#262626"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(70, footY); ctx.lineTo(W - 70, footY); ctx.stroke();
  ctx.fillStyle = "#787878"; ctx.font = "400 21px " + BODY; ctx.textAlign = "left";
  ctx.fillText("Not financial advice. CFDs are high risk; most retail accounts lose money.", 70, footY + 36);
  ctx.fillStyle = "#969696"; ctx.font = "700 24px " + BODY;
  ctx.fillText("Gold up. Red down. Black is the discipline.", 70, footY + 70);
}

function renderCard() {
  var canvas = $("card-canvas");
  var go = function () { drawCard(canvas); };
  if (document.fonts && document.fonts.load) {
    Promise.all([
      Promise.resolve(),
      document.fonts.load('700 24px "Inter"'),
      document.fonts.load('600 24px "Inter"'),
      document.fonts.load('400 24px "Inter"')
    ]).then(go, go);
  } else { go(); }
}
function syncCardUI() {
  Array.prototype.forEach.call($("card-fmt").children, function (b) {
    b.setAttribute("aria-checked", b.getAttribute("data-v") === CARD.fmt ? "true" : "false");
  });
  $("card-prices").checked = CARD.prices;
  $("card-tags").checked = CARD.tags;
  $("card-handle").value = CARD.handle;
  $("card-img-clear").hidden = !CARD.img;
  $("card-img-btn").textContent = CARD.img ? "Change screenshot" : "Add screenshot";
}
export function openCard(id) {
  var t = trades.filter(function (x) { return x.id === id; })[0];
  if (!t) return;
  CARD.trade = t;
  CARD.img = null;
  $("card-modal").hidden = false;
  document.body.style.overflow = "hidden";
  syncCardUI();
  renderCard();
  $("card-close").focus();
}
function closeCard() {
  $("card-modal").hidden = true;
  document.body.style.overflow = "";
}
export function initCardUI() {
  var fmtBox = $("card-fmt");
  [["feed", "Feed 4:5"], ["story", "Story 9:16"], ["square", "Square 1:1"]].forEach(function (f) {
    var b = h("button", "", f[1]);
    b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("data-v", f[0]); b.setAttribute("aria-checked", "false");
    b.addEventListener("click", function () { CARD.fmt = f[0]; syncCardUI(); renderCard(); });
    fmtBox.appendChild(b);
  });
  $("card-prices").addEventListener("change", function (e) { CARD.prices = e.target.checked; renderCard(); });
  $("card-tags").addEventListener("change", function (e) { CARD.tags = e.target.checked; renderCard(); });
  $("card-handle").addEventListener("input", function (e) {
    CARD.handle = e.target.value;
    try { window.localStorage.setItem("yellow-candle-handle", CARD.handle); } catch (err) { /* not saved */ }
    renderCard();
  });
  $("card-img-btn").addEventListener("click", function () { $("card-img-file").click(); });
  $("card-img-clear").addEventListener("click", function () { CARD.img = null; syncCardUI(); renderCard(); });
  $("card-img-file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () { CARD.img = img; syncCardUI(); renderCard(); };
      img.onerror = function () { toast("That file is not an image"); };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
  });
  $("card-download").addEventListener("click", function () {
    $("card-canvas").toBlob(function (blob) {
      if (!blob) { toast("Could not make the image"); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "yellow-candle-" + String((CARD.trade && CARD.trade.pair) || "trade").toLowerCase() + "-" + ((CARD.trade && CARD.trade.date) || todayIso()) + "-" + CARD.fmt + ".png";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      toast("Card saved");
    }, "image/png");
  });
  $("card-close").addEventListener("click", closeCard);
  $("card-modal").addEventListener("click", function (e) { if (e.target === $("card-modal")) closeCard(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("card-modal").hidden) closeCard(); });
}
