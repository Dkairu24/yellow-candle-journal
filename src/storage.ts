/* The Yellow Candle journal: Storage, CSV, backup and restore.
   An ES module: it imports what it needs from the other files. */

import { $, __set_trades, toArr, toast, todayIso, trades } from "./core";
import { view } from "./filters";
import { buildCsv } from "./form";
import { renderAll } from "./log";
import { shotGet, shotList, shotPut } from "./screenshots";
import { sorted } from "./stats";
import { quietPersist, scheduleSync } from "./sync";

/* ---------- storage (this browser only) ---------- */
var KEY = "yellow-candle-journal-v1";
export var storageOk = true;

export function cleanList(arr) {
  var out = [];
  if (!Array.isArray(arr)) return out;
  arr.forEach(function (t) {
    if (!t || typeof t !== "object") return;
    var r = Number(t.r);
    if (isNaN(r) || !t.date) return;
    var c: any = {};
    for (var k in t) c[k] = t[k];
    c.r = r;
    if (c.trigger !== undefined) c.trigger = toArr(c.trigger);
    c.id = String(t.id || ("t" + Date.now() + Math.random().toString(36).slice(2, 6)));
    out.push(c);
  });
  return out;
}
export function loadTrades() {
  try {
    var raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return cleanList(JSON.parse(raw));
  } catch (e) {
    storageOk = false;
    return [];
  }
}
export function showStatus(msg) {
  var st = $("status");
  st.textContent = msg;
  st.hidden = false;
  st.classList.add("warn");
  var mn = $("main");
  if (mn && mn.firstChild !== st) mn.insertBefore(st, mn.firstChild);
}
export function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trades));
  } catch (e) {
    storageOk = false;
    showStatus("This browser is blocking saved data, so trades will be lost when you close the page. Press Backup after logging.");
  }
  if (!quietPersist) scheduleSync();
}

/* ---------- files: CSV, backup, restore ---------- */
function saveFile(name, mime, text) {
  var blob = new Blob([text], { type: mime });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}
export function exportCsv() {
  if (!view().length) { toast(trades.length ? "No trades match the filters" : "Nothing to export yet"); return; }
  saveFile("yellow-candle-journal-" + todayIso() + ".csv", "text/csv", buildCsv());
  toast("CSV saved");
}
export function backupJson() {
  if (!trades.length) { toast("Nothing to back up yet"); return; }
  var list = sorted();
  var withShot = list.filter(function (t) { return t.shot; });
  function toDataUrl(b) {
    return new Promise(function (res) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result)); };
      fr.onerror = function () { res(""); };
      fr.readAsDataURL(b);
    });
  }
  var shots = {};
  var allKeys = [];
  withShot.forEach(function (t) { shotList(t).forEach(function (x) { allKeys.push(x.k); }); });
  Promise.all(allKeys.map(function (k) {
    return shotGet(k).then(function (b) { return b ? toDataUrl(b) : ""; }).catch(function () { return ""; })
      .then(function (u) { if (u) shots[k] = u; });
  })).then(function () {
    var doc: any = { app: "yellow-candle-journal", version: 2, trades: list };
    var n = Object.keys(shots).length;
    if (n) doc.shots = shots;
    saveFile("yellow-candle-backup-" + todayIso() + ".json", "application/json", JSON.stringify(doc, null, 2));
    toast(n ? "Backup saved with " + n + (n === 1 ? " screenshot" : " screenshots") : "Backup saved");
  });
}
export function restoreJson(file) {
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(String(reader.result));
      var list = cleanList(Array.isArray(data) ? data : data.trades);
      if (!list.length) { toast("No trades found in that file"); return; }
      var byId = {};
      trades.forEach(function (t) { byId[t.id] = t; });
      list.forEach(function (t) { byId[t.id] = t; });
      __set_trades(Object.keys(byId).map(function (k) { return byId[k]; }));
      persist();
      renderAll();
      var restored = 0;
      var sh = data && !Array.isArray(data) && data.shots && typeof data.shots === "object" ? data.shots : {};
      var restoreKeys = [];
      list.forEach(function (t) { if (t.shot) shotList(t).forEach(function (x) { if (typeof sh[x.k] === "string" && sh[x.k].indexOf("data:image/") === 0) restoreKeys.push(x.k); }); });
      Promise.all(restoreKeys.map(function (k) {
        return fetch(sh[k]).then(function (r) { return r.blob(); }).then(function (b) { return shotPut(k, b); }).then(function () { restored++; }).catch(function () {});
      })).then(function () {
        toast("Restored " + list.length + (list.length === 1 ? " trade" : " trades") + (restored ? " and " + restored + (restored === 1 ? " screenshot" : " screenshots") : ""));
      });
    } catch (e) {
      toast("That file is not a journal backup");
    }
  };
  reader.readAsText(file);
}
