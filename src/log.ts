/* The Yellow Candle journal: The trades list.
   An ES module: it imports what it needs from the other files. */

import { renderCalendar } from "./calendar";
import { gradeOf } from "./checklist";
import { $, armedDelete, clear, fmtDate, fmtPx, fmtR, fmtV, h, loaded, rClass, shared, toArr, trades, vd } from "./core";
import { populateFilters, renderFilterSummary } from "./filters";
import { renderInsights } from "./insights";
import { updateLanding } from "./landing";
import { runMotion } from "./motion";
import { renderBreakdown, renderCurve, renderDaily, renderStats, sorted } from "./stats";

/* ---------- log ---------- */
export function renderLog() {
  var box = $("log");
  clear(box);
  var vl = vd();
  $("log-sub").textContent = vl.length ? vl.length + (vl.length === 1 ? " trade" : " trades") + ", newest first" : "";
  if (!vl.length) {
    box.appendChild(h("div", "empty", trades.length ? "No trades match these filters." : loaded ? "No trades yet. Press Log a trade to add your first one." : "Loading..."));
    return;
  }
  var list = sorted(vl).reverse();
  var wrap = h("div", "table-scroll");
  var table = h("table");
  var thead = h("thead");
  var hr = h("tr");
  ["Date", "Pair", "Side", "TF", "Entry / Exit", "Result", "Setup", "Rules", ""].forEach(function (c) { hr.appendChild(h("th", "", c)); });
  thead.appendChild(hr);
  table.appendChild(thead);
  var tb = h("tbody");
  list.forEach(function (t) {
    var tr = h("tr");
    tr.appendChild(h("td", "num", fmtDate(t.date)));
    tr.appendChild(h("td", "", t.pair || "-"));
    var tdSide = h("td");
    tdSide.appendChild(h("span", "pill " + (t.dir === "Short" ? "short" : "long"), t.dir || "-"));
    tr.appendChild(tdSide);
    tr.appendChild(h("td", "", t.tf || "-"));
    var tdPx = h("td", "num");
    var hasPx = t.entry !== undefined && t.entry !== null && t.entry !== "";
    tdPx.appendChild(document.createTextNode(hasPx ? fmtPx(t.entry, t) : "-"));
    if (hasPx && t.exit !== undefined && t.exit !== null && t.exit !== "") { var ex = h("div", "sub-line px-to"); ex.appendChild(h("span", "to-w", "to ")); ex.appendChild(document.createTextNode(fmtPx(t.exit, t))); tdPx.appendChild(ex); }
    tr.appendChild(tdPx);
    var tdRes = h("td", "r num " + rClass(t.r), fmtV(t.r));
    if (t.rR !== undefined) tdRes.appendChild(h("div", "sub-line", fmtR(t.rR)));
    tr.appendChild(tdRes);
    var tdTags = h("td");
    var chips = h("div", "chips");
    ["htf", "poi", "trigger"].forEach(function (k) { toArr(t[k]).forEach(function (x) { chips.appendChild(h("span", "chip", x)); }); });
    if (t.sweep === "Yes") chips.appendChild(h("span", "chip", "Sweep"));
    if (t.disp === "Strong") chips.appendChild(h("span", "chip", "Strong disp."));
    if (t.fresh === "Yes") chips.appendChild(h("span", "chip", "Fresh"));
    if (t.mood) chips.appendChild(h("span", "chip dim", t.mood));
    toArr(t.tags).forEach(function (x) { chips.appendChild(h("span", "chip dim", "#" + x)); });
    if (t.plan) chips.appendChild(h("span", "chip dim", "Plan " + fmtV(t.plan)));
    if (t.chkN) chips.appendChild(h("span", "chip", "Setup " + gradeOf(t) + "  " + t.chkS + "/" + t.chkN));
    if (t.imported && !t.htf && !t.poi && !toArr(t.trigger).length) chips.appendChild(h("span", "chip dim", "Needs tags"));
    var cl = chips.children;
    if (cl.length > 4) {
      var extra = cl.length - 4;
      for (var ci = 4; ci < cl.length; ci++) cl[ci].classList.add("more-chip");
      var tgl = h("button", "chip chip-toggle", "+" + extra); tgl.type = "button"; tgl.setAttribute("aria-label", "Show " + extra + " more tags");
      tgl.addEventListener("click", function () { var open = chips.classList.toggle("open"); tgl.textContent = open ? "Less" : "+" + extra; });
      chips.appendChild(tgl);
    }
    tdTags.appendChild(chips);
    if (t.notes) tdTags.appendChild(h("div", "sub-line", t.notes));
    if (t.link) {
      var a = h("a", "sub-line", "Chart snapshot");
      a.href = t.link; a.target = "_blank"; a.rel = "noopener noreferrer"; a.style.color = "var(--gold)"; a.style.display = "block";
      tdTags.appendChild(a);
    }
    tr.appendChild(tdTags);
    tr.appendChild(h("td", t.rules === "Yes" ? "pos" : t.rules === "No" ? "neg" : "zero", t.rules === "Yes" ? "Yes" : t.rules === "No" ? "No" : "-"));
    var tdAct = h("td");
    var act = h("div", "act");
    var be = h("button", "btn small", "Edit"); be.type = "button"; be.setAttribute("data-edit", t.id);
    var bd = h("button", "btn small" + (armedDelete === t.id ? " danger-armed" : ""), armedDelete === t.id ? "Confirm delete" : "Delete");
    bd.type = "button"; bd.setAttribute("data-del", t.id);
    var bc = h("button", "btn small", "Card"); bc.type = "button"; bc.setAttribute("data-card", t.id);
    if (t.shot) { var bs = h("button", "btn small", "Chart"); bs.type = "button"; bs.setAttribute("data-shot", t.id); act.appendChild(bs); }
    var bsh = h("button", "btn small" + (shared[t.id] ? " badge-shared" : ""), shared[t.id] ? "Shared" : "Share"); bsh.type = "button"; bsh.setAttribute("data-share", t.id);
    var menu = h("details", "more-menu");
    menu.appendChild(h("summary", "btn small", "\u22EF"));
    menu.firstChild.setAttribute("aria-label", "More actions");
    var pop = h("div", "more-pop");
    if (t.shot) pop.appendChild(act.firstChild);
    pop.appendChild(bc); pop.appendChild(bd);
    menu.appendChild(pop);
    if (armedDelete === t.id) menu.open = true;
    be.className = "btn small edit-main";
    act.appendChild(be); act.appendChild(bsh); act.appendChild(menu);
    tdAct.appendChild(act);
    tr.appendChild(tdAct);
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  wrap.appendChild(table);
  box.appendChild(wrap);
}

export function renderAll() {
  document.body.classList.toggle("no-trades", loaded && !trades.length);
  $("empty-hero").hidden = !loaded || trades.length > 0;
  populateFilters();
  renderFilterSummary();
  renderStats();
  renderInsights();
  renderCurve();
  renderDaily();
  renderCalendar();
  renderBreakdown();
  renderLog();
  runMotion();
  updateLanding();
}
