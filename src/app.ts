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

/** Footer: its buttons press the matching buttons in the header menu, and the year stays current. */
function initFooter() {
  var yr = $("sf-year");
  if (yr) yr.textContent = String(new Date().getFullYear());
  var f = $("site-foot");
  if (!f) return;
  f.addEventListener("click", function (e: any) {
    var b = e.target.closest ? e.target.closest("[data-click]") : null;
    if (b) { var t = $(b.getAttribute("data-click")); if (t) t.click(); return; }
    if (e.target.closest && e.target.closest("#sf-top")) window.scrollTo({ top: 0, behavior: "smooth" });
  });
}
function boot() {
  var pubSlug = null;
  try { pubSlug = new URLSearchParams(location.search).get("t"); } catch (e) { pubSlug = null; }
  if (pubSlug) { bootPublic(pubSlug); return; }
  buildSegs();
  resetForm();
  initFooter();
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
