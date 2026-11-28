"use strict";
/* The Yellow Candle journal: The log-a-trade form and CSV export.
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- form ---------- */
function buildSegs() {
  Object.keys(OPTIONS).forEach(function (name) {
    var el = $("seg-" + name);
    if (!el) return;
    OPTIONS[name].forEach(function (opt) {
      var b = h("button", "", opt);
      b.type = "button";
      b.setAttribute("role", MULTI[name] ? "checkbox" : "radio");
      b.setAttribute("aria-checked", "false");
      b.setAttribute("data-v", opt);
      b.addEventListener("click", function () {
        if (MULTI[name]) {
          var cur = toArr(form[name]);
          var at = cur.indexOf(opt);
          if (at >= 0) cur.splice(at, 1); else cur.push(opt);
          form[name] = cur;
        } else {
          form[name] = form[name] === opt ? "" : opt;
        }
        syncSegs();
        updatePreview();
      });
      el.appendChild(b);
    });
  });
}
function syncSegs() {
  Object.keys(OPTIONS).forEach(function (name) {
    var el = $("seg-" + name);
    if (!el) return;
    Array.prototype.forEach.call(el.children, function (b) {
      var on = MULTI[name] ? toArr(form[name]).indexOf(b.getAttribute("data-v")) >= 0 : form[name] === b.getAttribute("data-v");
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
  });
}
function num(id) {
  var v = $(id).value;
  if (v === "" || v === null) return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}
function computeR() {
  var e = num("f-entry"), sp = num("f-stop"), x = num("f-exit");
  if (e === null && sp === null && x === null && editingId) {
    var kept = trades.filter(function (t) { return t.id === editingId; })[0];
    if (kept && (kept.entry === undefined || kept.entry === null || kept.entry === "")) return kept.r;
  }
  if (e === null || sp === null || x === null || !form.dir || e === sp) return null;
  var risk = Math.abs(e - sp);
  var move = form.dir === "Short" ? e - x : x - e;
  return move / risk;
}
function parseTags(str) {
  var seen = {}, out = [];
  String(str || "").split(",").forEach(function (x) {
    var v = x.trim().toLowerCase().slice(0, 24);
    if (v && !seen[v] && out.length < 8) { seen[v] = true; out.push(v); }
  });
  return out;
}
function allTags() {
  var m = {};
  trades.forEach(function (t) { toArr(t.tags).forEach(function (x) { m[x] = true; }); });
  return Object.keys(m).sort();
}
function planR(e, sp, tg, dir) {
  if (e === null || sp === null || tg === null || !dir || e === sp) return null;
  var move = dir === "Short" ? e - tg : tg - e;
  return move / Math.abs(e - sp);
}
function updatePreview() {
  var r = computeR();
  var p = $("r-preview");
  p.textContent = r === null ? "-" : fmtR(Math.round(r * 100) / 100);
  if (r !== null) {
    var probe = { pair: ($("f-pair").value || "").toUpperCase(), lots: num("f-lots"), entry: num("f-entry"), stop: num("f-stop"), exit: num("f-exit"), r: r };
    var rk = riskFor(probe);
    if (rk > 0) {
      var sm = h("span", "usd-note", money(r * rk) + ", risking $" + Math.round(rk * 100) / 100);
      p.appendChild(sm);
    }
  }
  p.className = "r-preview num " + (r === null ? "zero" : rClass(r));
}
var drawerOpen = false, drawerFocus = null;
function openDrawer() {
  if (drawerOpen) return;
  drawerOpen = true;
  drawerFocus = document.activeElement;
  var p = $("form-panel"), b = $("drawer-backdrop");
  b.hidden = false;
  p.setAttribute("aria-hidden", "false");
  requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.add("open"); b.classList.add("show"); }); });
  document.body.classList.add("drawer-open");
  setTimeout(function () { if (drawerOpen && window.innerWidth > 760) $("f-entry").focus(); }, 380);
}
function closeDrawer() {
  if (!drawerOpen) return;
  drawerOpen = false;
  var p = $("form-panel"), b = $("drawer-backdrop");
  p.classList.remove("open");
  b.classList.remove("show");
  p.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  setTimeout(function () { if (!drawerOpen) b.hidden = true; }, 320);
  if (drawerFocus && drawerFocus.focus) { try { drawerFocus.focus({ preventScroll: true }); } catch (e) { /* keep going */ } }
}
function resetForm() {
  editingId = null;
  form = { dir: "Short", tf: "5m" };
  $("f-date").value = todayIso();
  $("f-pair").value = "XAUUSD";
  ["f-entry", "f-stop", "f-exit", "f-lots", "f-tags", "f-link", "f-notes"].forEach(function (id) { $(id).value = ""; });
  $("form-title").textContent = "Log a trade";
  $("save").textContent = "Save trade";
  $("cancel").hidden = true;
  $("form-error").textContent = "";
  CHK = {};
  renderCheck();
  resetShot();
  syncSegs();
  updatePreview();
}
function startEdit(id) {
  var t = trades.filter(function (x) { return x.id === id; })[0];
  if (!t) return;
  editingId = id;
  form = {};
  Object.keys(OPTIONS).forEach(function (k) { form[k] = MULTI[k] ? toArr(t[k]) : (t[k] || ""); });
  $("f-date").value = t.date || todayIso();
  $("f-pair").value = t.pair || "";
  $("f-entry").value = t.entry === undefined || t.entry === null ? "" : t.entry;
  $("f-stop").value = t.stop === undefined || t.stop === null ? "" : t.stop;
  $("f-exit").value = t.exit === undefined || t.exit === null ? "" : t.exit;
  $("f-lots").value = hasVal(t.lots) ? t.lots : "";
  $("f-tags").value = toArr(t.tags).join(", ");
  loadShotForEdit(t);
  $("f-link").value = t.link || "";
  $("f-notes").value = t.notes || "";
  CHK = {};
  toArr(t.chk).forEach(function (id) { CHK[id] = true; });
  renderCheck();
  $("form-title").textContent = "Edit trade";
  $("save").textContent = "Update trade";
  $("cancel").hidden = false;
  $("form-error").textContent = "";
  syncSegs();
  updatePreview();
  openDrawer();
}
function onSubmit(ev) {
  ev.preventDefault();
  var err = $("form-error");
  err.textContent = "";
  var date = $("f-date").value;
  if (!date) { err.textContent = "Pick the trade date."; return; }
  if (!form.dir) { err.textContent = "Choose Long or Short."; return; }
  var r = computeR();
  if (r === null) { err.textContent = "Enter entry, stop and exit, or type the R result yourself."; return; }
  var doc = {
    date: date,
    pair: $("f-pair").value.trim().toUpperCase() || "XAUUSD",
    dir: form.dir,
    tf: form.tf || "",
    r: Math.round(r * 100) / 100
  };
  var e = num("f-entry"), sp = num("f-stop"), x = num("f-exit");
  if (e !== null) doc.entry = e;
  if (sp !== null) doc.stop = sp;
  if (x !== null) doc.exit = x;
  var lt = num("f-lots");
  if (lt !== null && lt > 0) doc.lots = lt;
  ["htf", "poi", "sweep", "trigger", "disp", "fresh", "rules", "mood"].forEach(function (k) {
    if (MULTI[k]) { var arr = toArr(form[k]); if (arr.length) doc[k] = arr; }
    else if (form[k]) doc[k] = form[k];
  });
  var tg2 = parseTags($("f-tags").value);
  if (tg2.length) doc.tags = tg2;
  var link = $("f-link").value.trim();
  if (link) doc.link = link;
  var notes = $("f-notes").value.trim();
  if (notes) doc.notes = notes;
  var ticked = CHECKLIST.filter(function (c) { return CHK[c.id]; });
  if (ticked.length) {
    doc.chk = ticked.map(function (c) { return c.id; });
    doc.chkS = ticked.length;
    doc.chkN = CHECKLIST.length;
  }
  var existing = editingId ? trades.filter(function (t) { return t.id === editingId; })[0] : null;
  doc.created = existing && existing.created ? existing.created : Date.now();
  if (existing) { ["target", "plan", "pnl"].forEach(function (k) { if (existing[k] !== undefined) doc[k] = existing[k]; }); }
  var id = editingId || ("t" + Date.now() + Math.random().toString(36).slice(2, 6));
  doc.id = id;
  doc.updated = Date.now();
  saveShotFor(id, doc);
  var wasEditing = !!editingId;
  var at = -1;
  trades.forEach(function (t, i) { if (t.id === id) at = i; });
  if (at >= 0) trades[at] = doc; else trades.push(doc);
  persist();
  toast(wasEditing ? "Trade updated" : "Trade saved");
  resetForm();
  closeDrawer();
  renderAll();
}
function onLogClick(ev) {
  var t = ev.target;
  if (!t || !t.getAttribute) return;
  var ed = t.getAttribute("data-edit");
  var del = t.getAttribute("data-del");
  var cd = t.getAttribute("data-card");
  var sh = t.getAttribute("data-shot");
  var shr = t.getAttribute("data-share");
  if (shr) { openShare(shr); return; }
  if (sh) { openShot(sh); return; }
  if (cd) { openCard(cd); return; }
  if (ed) { startEdit(ed); return; }
  if (del) {
    if (armedDelete === del) {
      clearTimeout(armTimer);
      armedDelete = null;
      var goneTrade = trades.filter(function (t) { return t.id === del; })[0];
      trades = trades.filter(function (t) { return t.id !== del; });
      var goneKeys = shotList(goneTrade || { id: del, shot: true }).map(function (x) { return x.k; });
      goneKeys.forEach(function (k) { shotDel(k).catch(function () {}); });
      cloudShotRemove(goneKeys);
      deleted[del] = Date.now();
      saveDeleted();
      persist();
      if (editingId === del) { resetForm(); closeDrawer(); }
      toast("Trade deleted");
      renderAll();
    } else {
      armedDelete = del;
      clearTimeout(armTimer);
      armTimer = setTimeout(function () { armedDelete = null; renderLog(); }, 4000);
      renderLog();
    }
  }
}

/* ---------- export ---------- */
function csvCell(v) {
  if (v === undefined || v === null) return "";
  var str = Array.isArray(v) ? v.join(" + ") : String(v);
  return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
}
function buildCsv() {
  var cols = ["date", "pair", "dir", "tf", "entry", "stop", "exit", "target", "plan", "r", "htf", "poi", "sweep", "trigger", "disp", "fresh", "rules", "chkS", "chkN", "mood", "tags", "link", "notes"];
  var lines = [cols.join(",")];
  sorted(view()).forEach(function (t) { lines.push(cols.map(function (c) { return csvCell(t[c]); }).join(",")); });
  return lines.join("\n");
}
