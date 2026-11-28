/* The Yellow Candle journal: Broker import.
   An ES module: it imports what it needs from the other files. */

import { $, MON, clear, fmtDate, fmtPx, fmtR, h, rClass, toast, trades } from "./core";
import { renderAll } from "./log";
import { persist } from "./storage";

/* ---------- broker import (CSV or statement HTML, read in the browser) ---------- */
var IMP = { headers: [], data: [], map: {}, fileName: "", dealsExport: false };
var IMP_FIELDS = [
  ["symbol", "Symbol / pair"],
  ["type", "Buy or sell"],
  ["openTime", "Open time"],
  ["entry", "Entry price"],
  ["exit", "Exit price"],
  ["stop", "Stop loss"],
  ["profit", "Profit (money)"],
  ["id", "Ticket / ID"]
];
var SYN = {
  symbol: ["symbol", "item", "instrument", "pair", "market", "product", "ticker"],
  type: ["type", "side", "direction", "action", "ordertype", "buysell", "tradetype"],
  entry: ["openprice", "entryprice", "entry", "priceopen", "openingprice", "open"],
  exit: ["closeprice", "exitprice", "exit", "priceclose", "closingprice", "close"],
  stop: ["sl", "stoploss", "stoplossprice", "stop", "stoplevel"],
  openTime: ["opentime", "timeopen", "opendate", "entrytime", "openingtime"],
  closeTime: ["closetime", "timeclose", "closedate", "exittime", "closingtime"],
  profit: ["profit", "netprofit", "pl", "pnl", "profitloss", "realizedpl", "netpl", "grossprofit"],
  id: ["ticket", "position", "positionid", "order", "orderid", "ticketid", "tradeid", "deal", "id"]
};
function cleanH(s) { return String(s === undefined || s === null ? "" : s).toLowerCase().replace(/[^a-z0-9]/g, ""); }

// MT4/MT5 reports repeat "Time" and "Price": the first is the open, the second the close
function autoMap(headers) {
  var map: any = {}, seenTime = 0, seenPrice = 0;
  headers.forEach(function (hd, i) {
    var c = cleanH(hd);
    if (c === "time" || c === "datetime" || c === "date") {
      seenTime++;
      if (seenTime === 1 && map.openTime === undefined) map.openTime = i;
      else if (seenTime === 2 && map.closeTime === undefined) map.closeTime = i;
      return;
    }
    if (c === "price") {
      seenPrice++;
      if (seenPrice === 1 && map.entry === undefined) map.entry = i;
      else if (seenPrice === 2 && map.exit === undefined) map.exit = i;
      return;
    }
    Object.keys(SYN).forEach(function (k) {
      if (map[k] === undefined && SYN[k].indexOf(c) >= 0) map[k] = i;
    });
  });
  return map;
}
function looksLikeHeader(cells) {
  var m = autoMap(cells);
  return m.symbol !== undefined && m.type !== undefined && m.entry !== undefined;
}

function parseDelimited(text) {
  text = text.replace(/^﻿/, "");
  var lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ""; }).slice(0, 25);
  var best = ",", bestN = -1;
  [",", ";", "\t"].forEach(function (d) {
    var n = 0;
    lines.forEach(function (l) { n += l.split(d).length - 1; });
    if (n > bestN) { best = d; bestN = n; }
  });
  var rows = [], row = [], cell = "", q = false, i;
  for (i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    if (q) {
      if (ch === '"') { if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"') { q = true; }
    else if (ch === best) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text.charAt(i + 1) === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.map(function (r) { return r.map(function (c) { return c.trim(); }); });
}
function rowsFromHtml(text) {
  var doc = new DOMParser().parseFromString(text, "text/html");
  var rows = [];
  Array.prototype.forEach.call(doc.querySelectorAll("tr"), function (tr) {
    rows.push(Array.prototype.map.call(tr.querySelectorAll("td,th"), function (c) { return c.textContent.replace(/\s+/g, " ").trim(); }));
  });
  return rows;
}

function parseNum(v) {
  var s = String(v === undefined || v === null ? "" : v).replace(/ /g, " ").replace(/[^0-9.,\-]/g, "");
  if (s === "" || s === "-") return null;
  if (s.indexOf(",") >= 0 && s.indexOf(".") >= 0) s = s.replace(/,/g, "");
  else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
  var n = Number(s);
  return isNaN(n) ? null : n;
}
function parseDateIso(v, order) {
  var s = String(v || "").trim();
  var m = /(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})/.exec(s);
  var y, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else {
    m = /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/.exec(s);
    if (m) {
      var a = +m[1], b = +m[2];
      y = +m[3];
      var dmy = order === "dmy" || (order === "auto" && (a > 12 || b <= 12));
      if (order === "mdy" || (order === "auto" && b > 12)) dmy = false;
      if (dmy) { d = a; mo = b; } else { mo = a; d = b; }
    } else {
      m = /(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?,?\s+(\d{4})/.exec(s);
      if (!m) return null;
      mo = MON.map(function (x) { return x.toLowerCase(); }).indexOf(m[2].toLowerCase()) + 1;
      d = +m[1]; y = +m[3];
      if (!mo) return null;
    }
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return y + "-" + String(mo).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}
function normSym(v) {
  var s = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return "";
  if (s.indexOf("XAU") === 0 || s.indexOf("GOLD") === 0) return "XAUUSD";
  if (s.indexOf("XAG") === 0 || s.indexOf("SILVER") === 0) return "XAGUSD";
  var m = /^([A-Z]{6})(M|PRO|RAW|ECN|C|I|Z)$/.exec(s);
  return m ? m[1] : s;
}

function impLoadRows(rows, name) {
  IMP.fileName = name || "pasted rows";
  var hi = -1, i;
  for (i = 0; i < Math.min(rows.length, 60); i++) { if (looksLikeHeader(rows[i])) { hi = i; break; } }
  var guessed = false;
  if (hi < 0) {
    for (i = 0; i < Math.min(rows.length, 60); i++) {
      var filled = rows[i].filter(function (c) { return c !== ""; }).length;
      if (filled >= 4) { hi = i; guessed = true; break; }
    }
  }
  if (hi < 0) return "I could not find a table of trades in that file.";
  IMP.headers = rows[hi].map(function (c, k) { return c || ("Column " + (k + 1)); });
  IMP.map = autoMap(IMP.headers);
  IMP.data = [];
  for (i = hi + 1; i < rows.length; i++) {
    var r = rows[i];
    var nonEmpty = r.filter(function (c) { return c !== ""; }).length;
    if (nonEmpty === 0) continue;
    if (nonEmpty <= 1 && IMP.data.length) break;
    if (looksLikeHeader(r)) continue;
    IMP.data.push(r);
  }
  // a "deals" export lists each trade as separate in/out rows
  IMP.dealsExport = false;
  var dc = IMP.headers.map(cleanH).indexOf("direction");
  if (dc >= 0) {
    var vals = {};
    IMP.data.forEach(function (r) { vals[String(r[dc] || "").toLowerCase()] = true; });
    if (vals["in"] && vals["out"]) IMP.dealsExport = true;
  }
  if (!IMP.data.length) return "I found the headers but no trade rows under them.";
  return guessed ? "guessed" : "";
}

function impOpts() {
  return { order: $("imp-order").value, tf: $("imp-tf").value, riskUsd: Number($("imp-risk").value) || 0 };
}
function impBuild() {
  var m = IMP.map, o = impOpts(), out = [];
  IMP.data.forEach(function (row) {
    function get(k) {
      if (m[k] === undefined || m[k] === "") return "";
      var v = row[m[k]];
      return v === undefined || v === null ? "" : String(v).trim();
    }
    var typeRaw = get("type").toLowerCase();
    var dir = /buy|long/.test(typeRaw) ? "Long" : /sell|short/.test(typeRaw) ? "Short" : null;
    var sym = normSym(get("symbol"));
    if (!dir || !sym) return;                       // balance, deposit and other non-trade rows
    var entry = parseNum(get("entry")), exit = parseNum(get("exit"));
    var date = parseDateIso(get("openTime"), o.order);
    var stop = parseNum(get("stop"));
    var profit = parseNum(get("profit"));
    var label = fmtDate(date || "") + " " + sym + " " + dir;
    if (entry === null || exit === null) { out.push({ ok: false, label: label, why: "Missing a price" }); return; }
    if (!date) { out.push({ ok: false, label: label, why: "Could not read the date" }); return; }
    var r = null, why = "";
    var stopUsable = stop !== null && stop > 0 && stop !== entry && (dir === "Long" ? stop < entry : stop > entry);
    if (stopUsable) {
      r = (dir === "Short" ? entry - exit : exit - entry) / Math.abs(entry - stop);
    } else if (o.riskUsd > 0 && profit !== null) {
      r = profit / o.riskUsd;
    } else {
      why = stop !== null && stop > 0 && stop !== entry ? "Stop was moved past entry" : "No stop loss on the trade";
    }
    var idRaw = get("id").replace(/[^A-Za-z0-9]/g, "");
    var id = "imp-" + (idRaw || (date + "-" + sym + "-" + dir + "-" + entry + "-" + exit)).replace(/[^A-Za-z0-9._-]/g, "");
    var trade: any = { id: id, date: date, pair: sym, dir: dir, tf: o.tf, entry: entry, exit: exit, imported: true, created: Date.now() };
    if (stopUsable) trade.stop = stop;
    if (r !== null) trade.r = Math.round(r * 100) / 100;
    out.push({ ok: r !== null, label: label, why: why, trade: r !== null ? trade : null, usedRisk: !stopUsable && r !== null });
  });
  return out;
}
function impRender() {
  var res = impBuild();
  var ready = res.filter(function (x) { return x.ok; });
  var skipped = res.filter(function (x) { return !x.ok; });
  var have = {};
  trades.forEach(function (t) { have[t.id] = true; });
  var fresh = ready.filter(function (x) { return !have[x.trade.id]; });
  var dupes = ready.length - fresh.length;
  var usedRisk = ready.filter(function (x) { return x.usedRisk; }).length;
  var msg = $("imp-msg");
  clear(msg);
  if (IMP.dealsExport) {
    msg.appendChild(h("div", "form-error", "This looks like a deals export, where each trade is split into separate in and out rows. Export your closed positions instead, then import that file."));
  } else {
    msg.appendChild(h("div", "", fresh.length + " ready to import" + (dupes ? ", " + dupes + " already in your journal" : "") + (skipped.length ? ", " + skipped.length + " skipped" : "") + "." + (usedRisk ? " " + usedRisk + " used the risk amount instead of a stop." : "")));
    msg.appendChild(h("div", "note", "R uses the stop shown in the statement. If you moved a stop after entering, that trade's R can be off; edit it after importing."));
  }
  $("imp-go").disabled = IMP.dealsExport || !fresh.length;
  $("imp-go").textContent = fresh.length ? "Import " + fresh.length + (fresh.length === 1 ? " trade" : " trades") : "Nothing to import";
  var box = $("imp-preview");
  clear(box);
  var wrap = h("div", "table-scroll");
  var tb = h("table");
  tb.style.minWidth = "620px";
  var hr = h("tr");
  ["Trade", "Entry", "Stop", "Exit", "Result"].forEach(function (c) { hr.appendChild(h("th", "", c)); });
  var th = h("thead"); th.appendChild(hr); tb.appendChild(th);
  var body = h("tbody");
  res.slice(0, 12).forEach(function (x) {
    var tr = h("tr");
    tr.appendChild(h("td", "", x.label));
    if (x.trade) {
      tr.appendChild(h("td", "num", fmtPx(x.trade.entry, x.trade)));
      tr.appendChild(h("td", "num", x.trade.stop !== undefined ? fmtPx(x.trade.stop, x.trade) : "-"));
      tr.appendChild(h("td", "num", fmtPx(x.trade.exit, x.trade)));
      tr.appendChild(h("td", "r num " + rClass(x.trade.r), fmtR(x.trade.r)));
    } else {
      var td = h("td", "zero", x.why);
      td.colSpan = 4;
      tr.appendChild(td);
    }
    body.appendChild(tr);
  });
  tb.appendChild(body);
  wrap.appendChild(tb);
  box.appendChild(wrap);
  if (res.length > 12) box.appendChild(h("div", "note", "Showing the first 12 of " + res.length + " trade rows."));
  return fresh;
}
function impBuildMapUI() {
  var grid = $("imp-map");
  clear(grid);
  IMP_FIELDS.forEach(function (f) {
    var field = h("div", "field");
    var lab = h("label", "", f[1]);
    var id = "imp-col-" + f[0];
    lab.setAttribute("for", id);
    var sel = h("select");
    sel.id = id;
    var none = h("option", "", "Not in the file");
    none.value = "";
    sel.appendChild(none);
    IMP.headers.forEach(function (hd, i) {
      var o = h("option", "", hd + "  (col " + (i + 1) + ")");
      o.value = String(i);
      sel.appendChild(o);
    });
    sel.value = IMP.map[f[0]] === undefined ? "" : String(IMP.map[f[0]]);
    sel.addEventListener("change", function () {
      IMP.map[f[0]] = sel.value === "" ? undefined : Number(sel.value);
      impRender();
    });
    field.appendChild(lab); field.appendChild(sel);
    grid.appendChild(field);
  });
}
function impShowStep(n) {
  $("imp-step1").hidden = n !== 1;
  $("imp-step2").hidden = n !== 2;
}
function impUseRows(rows, name) {
  var err = impLoadRows(rows, name);
  if (err && err !== "guessed") { $("imp-err").textContent = err; return; }
  $("imp-err").textContent = "";
  impBuildMapUI();
  impShowStep(2);
  impRender();
  if (err === "guessed") toast("Check the column choices");
}
function openImport() {
  $("imp-err").textContent = "";
  $("imp-paste").value = "";
  impShowStep(1);
  $("imp-modal").hidden = false;
  document.body.style.overflow = "hidden";
  $("imp-close").focus();
}
function closeImport() {
  $("imp-modal").hidden = true;
  document.body.style.overflow = "";
}
export function initImportUI() {
  $("broker").addEventListener("click", openImport);
  $("imp-close").addEventListener("click", closeImport);
  $("imp-modal").addEventListener("click", function (e) { if (e.target === $("imp-modal")) closeImport(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("imp-modal").hidden) closeImport(); });
  $("imp-pick").addEventListener("click", function () { $("imp-file").click(); });
  $("imp-file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var text = String(reader.result);
      var isHtml = /\.html?$/i.test(f.name) || /<table/i.test(text.slice(0, 5000));
      impUseRows(isHtml ? rowsFromHtml(text) : parseDelimited(text), f.name);
    };
    reader.readAsText(f);
  });
  $("imp-parse").addEventListener("click", function () {
    var text = $("imp-paste").value;
    if (!text.trim()) { $("imp-err").textContent = "Paste the rows first."; return; }
    impUseRows(/<table/i.test(text) ? rowsFromHtml(text) : parseDelimited(text), "pasted rows");
  });
  $("imp-back").addEventListener("click", function () { impShowStep(1); });
  ["imp-order", "imp-tf", "imp-risk"].forEach(function (id) {
    $(id).addEventListener("input", function () { if (!$("imp-step2").hidden) impRender(); });
  });
  $("imp-go").addEventListener("click", function () {
    var fresh = impRender();
    if (!fresh.length) return;
    fresh.forEach(function (x) { trades.push(x.trade); });
    persist();
    renderAll();
    closeImport();
    toast("Imported " + fresh.length + (fresh.length === 1 ? " trade. Add the tags next." : " trades. Add the tags next."));
  });
}
