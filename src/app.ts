/* The Yellow Candle journal: Start the app.
   An ES module: it imports what it needs from the other files. */

import { initCalendarUI } from "./calendar";
import { initCardUI } from "./cards";
import { initCheckUI } from "./checklist";
import { $, __set_loaded, __set_trades, editingId, initUnitUI, loaded, trades } from "./core";
import { initFilterUI } from "./filters";
import { buildSegs, closeDrawer, onLogClick, onSubmit, openDrawer, resetForm, updatePreview } from "./form";
import { initImportUI } from "./import";
import { initLanding } from "./landing";
import { renderAll } from "./log";
import { initMotion } from "./motion";
import { bootPublic } from "./public";
import { initRecapUI } from "./recap";
import { initShotUI } from "./screenshots";
import { initShareUI } from "./share";
import { backupJson, exportCsv, loadTrades, restoreJson, showStatus, storageOk } from "./storage";
import { initSync } from "./sync";

function boot() {
  var pubSlug = null;
  try { pubSlug = new URLSearchParams(location.search).get("t"); } catch (e) { pubSlug = null; }
  if (pubSlug) { bootPublic(pubSlug); return; }
  buildSegs();
  resetForm();
  __set_trades(loadTrades());
  __set_loaded(true);
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
