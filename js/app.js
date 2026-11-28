"use strict";
/* The Yellow Candle journal: Start the app.
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

function boot() {
  var pubSlug = null;
  try { pubSlug = new URLSearchParams(location.search).get("t"); } catch (e) { pubSlug = null; }
  if (pubSlug) { bootPublic(pubSlug); return; }
  buildSegs();
  resetForm();
  trades = loadTrades();
  loaded = true;
  if (!storageOk) showStatus("This browser is blocking saved data, so trades will be lost when you close the page. Press Backup after logging.");
  renderAll();
  $("trade-form").addEventListener("submit", onSubmit);
  $("cancel").addEventListener("click", function () { resetForm(); closeDrawer(); });
  $("drawer-close").addEventListener("click", closeDrawer);
  $("drawer-backdrop").addEventListener("click", closeDrawer);
  $("drawer-to-check").addEventListener("click", function () { closeDrawer(); location.hash = "checklist"; });
  $("log").addEventListener("click", onLogClick);
  $("jump").addEventListener("click", function () { if (editingId) resetForm(); openDrawer(); });
  ["f-entry", "f-stop", "f-exit", "f-lots", "f-pair"].forEach(function (id) { $(id).addEventListener("input", updatePreview); });
  initCardUI();
  initImportUI();
  initRecapUI();
  initCheckUI();
  initFilterUI();
  initShotUI();
  initShareUI();
  initUnitUI();
  initLanding();
  initSync();
  initMotion();
  initCalendarUI();
  $("export").addEventListener("click", exportCsv);
  $("backup").addEventListener("click", backupJson);
  $("import").addEventListener("click", function () { $("import-file").click(); });
  $("import-file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    if (f) restoreJson(f);
    e.target.value = "";
  });
}

boot();
