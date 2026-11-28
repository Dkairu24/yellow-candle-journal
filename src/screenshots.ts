/* The Yellow Candle journal: Trade screenshots.
   An ES module: it imports what it needs from the other files. */

import { $, clear, editingId, h, toast, trades } from "./core";
import { sb, sbUser } from "./sync";

/* ---------- trade screenshots (kept in this browser only, never uploaded) ---------- */
var SHOTS = [], SHOT_GONE = [];
var shotDb: any = null;
function openShotDb(): Promise<any> {
  return new Promise<any>(function (resolve, reject) {
    if (shotDb) { resolve(shotDb); return; }
    if (!window.indexedDB) { reject(new Error("no idb")); return; }
    var req = indexedDB.open("yellow-candle-shots", 1);
    req.onupgradeneeded = function () { req.result.createObjectStore("shots"); };
    req.onsuccess = function () { shotDb = req.result; resolve(shotDb); };
    req.onerror = function () { reject(req.error); };
  });
}
function shotTx(mode: string, fn: any): Promise<any> {
  return openShotDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction("shots", mode);
      var out = fn(tx.objectStore("shots"));
      tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error); };
    });
  });
}
export function shotPut(id, blob) { return shotTx("readwrite", function (s) { return s.put(blob, id); }); }
export function shotGet(id) { return shotTx("readonly", function (s) { return s.get(id); }); }
export function shotDel(id) { return shotTx("readwrite", function (s) { return s.delete(id); }); }
function shrinkImage(file: File): Promise<Blob> {
  return new Promise<Blob>(function (resolve, reject) {
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function () {
      var max = 1400, w = img.naturalWidth, hgt = img.naturalHeight;
      var sc = Math.min(1, max / Math.max(w, hgt));
      var c = document.createElement("canvas");
      c.width = Math.round(w * sc); c.height = Math.round(hgt * sc);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { b ? resolve(b) : reject(new Error("encode")); }, "image/jpeg", 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.src = url;
  });
}
export var MAX_SHOTS = 6;
export function shotList(t) {
  if (t && Array.isArray(t.shots) && t.shots.length) return t.shots.filter(function (x) { return x && x.k; });
  return t && t.shot ? [{ k: t.id, c: "" }] : [];
}
function newShotKey(id) { return id + "_" + Math.random().toString(36).slice(2, 8); }
export function cloudShotRemove(keys) {
  if (!sb || !sbUser || !keys.length) return;
  sb.storage.from("shots").remove(keys.map(function (k) { return sbUser.id + "/" + k + ".jpg"; })).catch(function () {});
}
function renderShotPreview() {
  var box = $("shot-prev");
  clear(box);
  SHOTS.forEach(function (it, i) {
    var row = h("div", "shot-item");
    if (it.url) { var im = document.createElement("img"); im.src = it.url; im.alt = "Screenshot " + (i + 1); row.appendChild(im); }
    else row.appendChild(h("div", "shot-miss", it.pending ? "Loading..." : "Not on this device"));
    var side = h("div", "shot-side");
    var ci = document.createElement("input");
    ci.type = "text"; ci.maxLength = 140; ci.placeholder = "Caption (optional)"; ci.value = it.c || "";
    ci.setAttribute("aria-label", "Caption for screenshot " + (i + 1));
    ci.addEventListener("input", function () { it.c = ci.value; });
    side.appendChild(ci);
    var rm = h("button", "btn small shot-rm", "Remove"); rm.type = "button";
    rm.addEventListener("click", function () {
      if (it.url) URL.revokeObjectURL(it.url);
      if (it.k) SHOT_GONE.push(it.k);
      SHOTS.splice(SHOTS.indexOf(it), 1);
      renderShotPreview();
    });
    side.appendChild(rm);
    row.appendChild(side);
    box.appendChild(row);
  });
  box.hidden = !SHOTS.length;
}
export function resetShot() {
  SHOTS.forEach(function (it) { if (it.url) URL.revokeObjectURL(it.url); });
  SHOTS = []; SHOT_GONE = [];
  $("f-shot").value = "";
  renderShotPreview();
}
export function loadShotForEdit(t) {
  resetShot();
  var list = shotList(t);
  if (!list.length) return;
  SHOTS = list.map(function (x) { return { k: x.k, c: x.c || "", blob: null, url: "", pending: true }; });
  renderShotPreview();
  SHOTS.forEach(function (it) {
    shotGet(it.k).then(function (b) {
      if (editingId !== t.id || SHOTS.indexOf(it) < 0) return;
      it.pending = false;
      if (b) it.url = URL.createObjectURL(b);
      renderShotPreview();
    }).catch(function () { it.pending = false; renderShotPreview(); });
  });
}
function takeImage(file) {
  if (!file || !/^image\//.test(file.type)) { toast("That is not an image"); return Promise.resolve(); }
  if (SHOTS.length >= MAX_SHOTS) { toast("Up to " + MAX_SHOTS + " screenshots per trade"); return Promise.resolve(); }
  return shrinkImage(file).then(function (b) {
    if (SHOTS.length >= MAX_SHOTS) return;
    SHOTS.push({ k: null, c: "", blob: b, url: URL.createObjectURL(b) });
    renderShotPreview();
    toast("Screenshot added. Save the trade to keep it.");
  }).catch(function () { toast("Could not read that image"); });
}
export function saveShotFor(id, doc) {
  var list = [];
  SHOTS.forEach(function (it) {
    var key = it.k || newShotKey(id);
    if (it.blob) shotPut(key, it.blob).catch(function () { toast("This browser would not store a screenshot"); });
    list.push({ k: key, c: String(it.c || "").trim().slice(0, 140) });
  });
  var keep = {};
  list.forEach(function (x) { keep[x.k] = true; });
  var gone = SHOT_GONE.filter(function (k) { return !keep[k]; });
  gone.forEach(function (k) { shotDel(k).catch(function () {}); });
  cloudShotRemove(gone);
  if (list.length) { doc.shots = list; doc.shot = true; }
  else { delete doc.shots; delete doc.shot; }
}
export function openShot(id) {
  var modal = $("shot-modal"), box = $("shot-view");
  var t = trades.filter(function (x) { return x.id === id; })[0];
  clear(box);
  box.appendChild(h("p", "note", "Loading..."));
  modal.hidden = false;
  var list = t ? shotList(t) : [];
  Promise.all(list.map(function (it) { return shotGet(it.k).catch(function () { return null; }); })).then(function (blobs) {
    clear(box);
    var shown = 0;
    list.forEach(function (it, i) {
      if (!blobs[i]) return;
      var fig = h("figure");
      var im = document.createElement("img");
      im.alt = it.c || "Trade screenshot"; im.src = URL.createObjectURL(blobs[i]);
      fig.appendChild(im);
      if (it.c) fig.appendChild(h("figcaption", "", it.c));
      box.appendChild(fig); shown++;
    });
    if (!shown) box.appendChild(h("p", "note", "These screenshots are not stored on this device. This backup or browser does not hold them. Backups made before screenshots were added do not include them."));
  });
}
export function initShotUI() {
  $("f-shot").addEventListener("change", function (e) {
    var files = [].slice.call(e.target.files || []);
    e.target.value = "";
    files.reduce(function (p, f) { return p.then(function () { return takeImage(f); }); }, Promise.resolve());
  });
  document.addEventListener("paste", function (e: any) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === "file" && /^image\//.test(items[i].type)) {
        var tag = (e.target && e.target.tagName) || "";
        if (/INPUT|TEXTAREA/.test(tag) && e.target.type !== "file") { /* still take images pasted into any field */ }
        takeImage(items[i].getAsFile());
        e.preventDefault();
        return;
      }
    }
  });
  $("shot-close").addEventListener("click", function () { $("shot-modal").hidden = true; });
  $("shot-modal").addEventListener("click", function (e) { if (e.target === $("shot-modal")) $("shot-modal").hidden = true; });
}
