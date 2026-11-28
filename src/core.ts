/* The Yellow Candle journal: Shared helpers, formatting, dollars or R.
   An ES module: it imports what it needs from the other files. */

import type { Trade } from "./types";
import { view } from "./filters";
import { renderAll } from "./log";

export var OPTIONS = {
  dir: ["Long", "Short"],
  tf: ["1m", "3m", "5m", "15m"],
  htf: ["Bullish", "Bearish"],
  poi: ["1H Supply", "1H Demand", "1H FVG", "Key level", "Other"],
  sweep: ["Yes", "No"],
  trigger: ["CHOCH", "BOS"],
  disp: ["Strong", "Weak"],
  fresh: ["Yes", "No"],
  rules: ["Yes", "No"],
  mood: ["Calm", "Confident", "Rushed", "Bored", "Fear", "FOMO", "Revenge"],
  grade: ["A", "B", "C"]
};
export var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export var trades: Trade[] = [];
export var shared: Record<string, string> = {};
/* ---------- dollars or R ---------- */
var RISK_KEY = "yellow-candle-risk-v1", UNIT_KEY = "yellow-candle-unit-v1";
var riskUsd = 0, UNIT = "R";
try {
  riskUsd = Number(window.localStorage.getItem(RISK_KEY)) || 0;
  UNIT = window.localStorage.getItem(UNIT_KEY) === "$" ? "$" : "R";
} catch (e) { /* defaults */ }
export function hasVal(v) { return v !== undefined && v !== null && v !== "" && isFinite(Number(v)); }
/* Dollars per 1.00 lot. Direct = quoted in USD. Inverse = USD is the first currency, so divide by price. */
function contractFor(pair) {
  var p = String(pair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/^(XAU|XPT|XPD)USD/.test(p)) return { size: 100, inv: false };
  if (/^XAGUSD/.test(p)) return { size: 5000, inv: false };
  if (/^(BTC|ETH|LTC|BCH|SOL|BNB|XRP|ADA|DOGE)USD/.test(p)) return { size: 1, inv: false };
  if (/^(US30|DJI|DOW|US500|SPX500|SPX|NAS100|NDX|US100)/.test(p)) return { size: 1, inv: false };
  if (/^[A-Z]{3}USD$/.test(p)) return { size: 100000, inv: false };
  if (/^USD[A-Z]{3}$/.test(p)) return { size: 100000, inv: true };
  return null;
}
function lotMoney(t, move, px) {
  var c = contractFor(t.pair);
  if (!c || !hasVal(t.lots) || !(Number(t.lots) > 0) || !isFinite(move)) return null;
  var v = move * Number(t.lots) * c.size;
  if (c.inv) { if (!(px > 0)) return null; v = v / px; }
  return v;
}
/* dollars risked on this trade: from lot size and stop distance, else your flat risk setting */
export function riskFor(t) {
  if (hasVal(t.entry) && hasVal(t.stop)) {
    var m = lotMoney(t, Math.abs(Number(t.entry) - Number(t.stop)), Number(t.exit) || Number(t.entry));
    if (m !== null && m > 0) return m;
  }
  return riskUsd;
}
export function usd(t) {
  var rf = riskFor(t);
  return rf > 0 ? Number(t.r) * rf : null;
}
export function dollarMode() { return UNIT === "$" && (riskUsd > 0 || trades.some(function (t) { return hasVal(t.lots) && usd(t) !== null; })); }
export function money(v) {
  if (v === null || v === undefined || isNaN(v)) return "-";
  var a = Math.abs(v), sign = v > 0 ? "+" : v < 0 ? "\u2212" : "";
  var txt = a < 10 ? a.toFixed(2) : Math.round(a).toLocaleString("en-US");
  return sign + "$" + txt;
}
export function moneyShort(v) {
  var a = Math.abs(v), sign = v > 0 ? "+" : v < 0 ? "\u2212" : "";
  return sign + (a >= 10000 ? (a / 1000).toFixed(0) + "k" : a >= 1000 ? (a / 1000).toFixed(1) + "k" : String(Math.round(a)));
}
export function axisLbl(v) {
  var a = Math.abs(v), sign = v > 0 ? "+" : v < 0 ? "\u2212" : "";
  if (!dollarMode()) return sign + Math.abs(Math.round(v * 100) / 100) + "R";
  return sign + "$" + (a >= 1000 ? (Math.round(a / 100) / 10) + "k" : Math.round(a));
}
export function fmtV(v) { return dollarMode() ? money(v) : fmtR(v); }
/** The trades as the screen shows them: in dollar mode each copy carries its dollar result in `r`. */
export function toDisplay(l: Trade[]): Trade[] {
  if (!dollarMode()) return l;
  return l.filter(function (t) { return usd(t) !== null; }).map(function (t) {
    var c: any = {}, k;
    for (k in t) c[k] = t[k];
    c.rR = t.r;
    c.r = usd(t);
    if (hasVal(t.plan)) c.plan = Number(t.plan) * riskFor(t);
    return c;
  });
}
export function vd() { return toDisplay(view()); }
function dollarModeAvail() { return riskUsd > 0 || trades.some(function (t) { return hasVal(t.lots) && usd(t) !== null; }); }
function setUnit(u) {
  UNIT = u;
  try { window.localStorage.setItem(UNIT_KEY, u); } catch (e) { /* session only */ }
  syncUnitUI();
  renderAll();
}
function syncUnitUI() {
  var on = dollarMode() ? "$" : "R";
  [].forEach.call(document.querySelectorAll("#unit-seg button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-unit") === on)); });
}
export function openRisk() {
  $("risk-in").value = riskUsd > 0 ? String(riskUsd) : "";
  $("risk-modal").hidden = false;
  setTimeout(function () { $("risk-in").focus(); }, 30);
}
function saveRisk(v) {
  riskUsd = v > 0 ? v : 0;
  try { window.localStorage.setItem(RISK_KEY, String(riskUsd)); } catch (e) { /* session only */ }
  if (riskUsd > 0) UNIT = "$"; else UNIT = "R";
  try { window.localStorage.setItem(UNIT_KEY, UNIT); } catch (e) { /* session only */ }
  $("risk-modal").hidden = true;
  syncUnitUI();
  renderAll();
  toast(riskUsd > 0 ? "Showing dollars at $" + riskUsd + " risk per trade" : "Showing R");
}
export function initUnitUI() {
  syncUnitUI();
  [].forEach.call(document.querySelectorAll("#unit-seg button"), function (b) {
    b.addEventListener("click", function () {
      var u = b.getAttribute("data-unit");
      if (u === "$" && !dollarModeAvail()) { openRisk(); return; }
      setUnit(u);
    });
  });
  $("risk-open").addEventListener("click", function () { openRisk(); });
  $("risk-close").addEventListener("click", function () { $("risk-modal").hidden = true; });
  $("risk-modal").addEventListener("click", function (e) { if (e.target === $("risk-modal")) $("risk-modal").hidden = true; });
  $("risk-save").addEventListener("click", function () {
    var v = Number($("risk-in").value);
    if (!(v > 0)) { toast("Enter an amount above 0"); return; }
    saveRisk(v);
  });
  $("risk-clear").addEventListener("click", function () { saveRisk(0); });
  $("risk-in").addEventListener("keydown", function (e) { if (e.key === "Enter") $("risk-save").click(); });
}
export var loaded = false;
var coll = null;
export var editingId: string | null = null;
export var armedDelete: string | null = null;
export var armTimer: any = null;
export var form: any = {};
export var MULTI = { trigger: true };
export function toArr(v) { return Array.isArray(v) ? v.slice() : (v ? [v] : []); }

export function $(id: string): any { return document.getElementById(id); }
export function h(tag: string, cls?: string, text?: any): any {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}
export var SVGNS = "http://www.w3.org/2000/svg";
export function s(tag: string, attrs?: any, text?: any): any {
  var e = document.createElementNS(SVGNS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (text !== undefined) e.textContent = text;
  return e;
}
export function clear(node: Node) { while (node.firstChild) node.removeChild(node.firstChild); }

export function fmtR(v) {
  if (v === null || v === undefined || isNaN(v)) return "-";
  var sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return sign + Math.abs(v).toFixed(2) + "R";
}
export function rClass(v) { return v > 0 ? "pos" : v < 0 ? "neg" : "zero"; }
export function fmtDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return parseInt(m[3], 10) + " " + MON[parseInt(m[2], 10) - 1] + " " + m[1].slice(2);
}
function pairDecimals(pair) {
  var p = String(pair || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (/JPY$/.test(p)) return 3;
  if (/^(XAU|XAG|XPT|XPD)/.test(p)) return 3;
  if (/^(BTC|ETH|LTC|XRP|SOL|BNB|ADA|DOGE)/.test(p)) return 2;
  if (/^(NAS100|NDX|US100|US30|DJI|DOW|US500|SPX500|SPX|GER40|GER30|DAX|UK100|FTSE|JP225|NIKKEI|HK50|AUS200|FRA40|EU50)/.test(p)) return 2;
  if (/^[A-Z]{6}$/.test(p)) return 5;
  return 3;
}
function typedDecimals(t) {
  var m = 0;
  ["entry", "stop", "exit", "target"].forEach(function (k) {
    var v = t && t[k];
    if (v === undefined || v === null || v === "") return;
    var str = String(v), i = str.indexOf(".");
    if (i >= 0 && !/e/i.test(str)) m = Math.max(m, str.length - i - 1);
  });
  return Math.min(m, 6);
}
export function fmtPx(v, t) {
  var n = Number(v);
  if (v === null || v === undefined || v === "" || isNaN(n)) return "-";
  var d = t ? Math.max(pairDecimals(t.pair), typedDecimals(t)) : 3;
  return n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
export function todayIso() {
  var d = new Date();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}
export function toast(msg) {
  var t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(function () { t.classList.remove("show"); }, 2200);
}

export function __set_trades(value: any) { trades = value; return value; }

export function __set_loaded(value: any) { loaded = value; return value; }

export function __set_editingId(value: any) { editingId = value; return value; }

export function __set_form(value: any) { form = value; return value; }

export function __set_armedDelete(value: any) { armedDelete = value; return value; }

export function __set_armTimer(value: any) { armTimer = value; return value; }

export function __set_shared(value: any) { shared = value; return value; }
