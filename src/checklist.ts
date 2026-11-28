/* The Yellow Candle journal: Pre-trade checklist.
   An ES module: it imports what it needs from the other files. */

import { $, clear, h, toast } from "./core";
import { openDrawer } from "./form";

/* ---------- pre-trade checklist (your rules, saved in this browser) ---------- */
var CHK_KEY = "yellow-candle-checklist-v1";
var CHK_DEFAULT = [
  { id: "bias", text: "1h bias is clear: I can name the last BOS" },
  { id: "align", text: "This trade is in the direction of the 1h bias" },
  { id: "poi", text: "Price reached a fresh HTF POI (1h zone or imbalance)" },
  { id: "sweep", text: "Liquidity was swept before the move" },
  { id: "trigger", text: "LTF CHOCH or BOS in my direction, confirmed by a body close" },
  { id: "disp", text: "The leg out of my zone shows strong displacement" },
  { id: "fresh", text: "My entry zone is fresh and untested" },
  { id: "stop", text: "Stop is beyond the zone and my risk is set" },
  { id: "rr", text: "At least 3R to target, or to the next BOS" },
  { id: "mind", text: "I am calm: no chasing, no revenge" }
];
export var CHK: Record<string, boolean> = {};
var chkEditing = false;
function defaultChecklist() { return CHK_DEFAULT.map(function (c) { return { id: c.id, text: c.text }; }); }
function loadChecklist() {
  try {
    var raw = window.localStorage.getItem(CHK_KEY);
    if (raw) {
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        var ok = arr.filter(function (c) { return c && typeof c.id === "string" && typeof c.text === "string"; });
        if (ok.length) return ok;
      }
    }
  } catch (e) { /* use the defaults */ }
  return defaultChecklist();
}
export var CHECKLIST = loadChecklist();
function saveChecklist() {
  try { window.localStorage.setItem(CHK_KEY, JSON.stringify(CHECKLIST)); } catch (e) { /* kept for this visit only */ }
}
export function gradeOf(t) {
  if (!t || !t.chkN) return "";
  var p = t.chkS / t.chkN;
  return p >= 0.9 ? "A" : p >= 0.7 ? "B" : "C";
}
function updateCheckScore() {
  var total = CHECKLIST.length;
  var ticked = CHECKLIST.filter(function (c) { return CHK[c.id]; });
  var p = total ? ticked.length / total : 0;
  var grade = !ticked.length ? "" : p >= 0.9 ? "A" : p >= 0.7 ? "B" : "C";
  $("check-score").textContent = ticked.length + "/" + total;
  var gp = $("check-grade");
  gp.textContent = grade || "-";
  gp.className = "grade-pill" + (grade ? " " + grade : "");
  $("drawer-score").textContent = ticked.length + "/" + total;
  var dg = $("drawer-grade");
  dg.textContent = grade || "-";
  dg.className = "grade-pill" + (grade ? " " + grade : "");
  var verdict = !total ? "Add some rules to your checklist." :
    !ticked.length ? "Nothing ticked yet." :
    grade === "A" ? (ticked.length === total ? "A-grade setup. Every rule you set is met." : "A-grade setup. " + (total - ticked.length) + (total - ticked.length === 1 ? " rule is" : " rules are") + " still open.") :
    grade === "B" ? "Close. Fix what is missing before you enter." :
    "Not ready. This setup is missing too much.";
  $("check-verdict").textContent = verdict;
  var miss = $("check-missing");
  clear(miss);
  if (ticked.length && ticked.length < total) {
    CHECKLIST.forEach(function (c) { if (!CHK[c.id]) miss.appendChild(h("span", "chip dim", "Missing: " + c.text)); });
  }
}
function renderCheckList() {
  var box = $("check-list");
  clear(box);
  $("check-edit").textContent = chkEditing ? "Done editing" : "Edit list";
  if (!chkEditing) {
    CHECKLIST.forEach(function (c) {
      var row = h("label", "check-item");
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = !!CHK[c.id];
      cb.addEventListener("change", function () { CHK[c.id] = cb.checked; updateCheckScore(); });
      row.appendChild(cb);
      row.appendChild(h("span", "", c.text));
      box.appendChild(row);
    });
    if (!CHECKLIST.length) box.appendChild(h("div", "empty", "Your checklist is empty. Press Edit list to add rules."));
    return;
  }
  CHECKLIST.forEach(function (c, i) {
    var row = h("div", "edit-row");
    var input = document.createElement("input");
    input.type = "text"; input.value = c.text; input.maxLength = 120;
    input.setAttribute("aria-label", "Rule " + (i + 1));
    input.addEventListener("change", function () {
      var v = input.value.trim();
      if (!v) { input.value = c.text; return; }
      c.text = v; saveChecklist(); updateCheckScore();
    });
    var del = h("button", "btn small", "Delete");
    del.type = "button";
    del.addEventListener("click", function () {
      CHECKLIST.splice(i, 1);
      delete CHK[c.id];
      saveChecklist(); renderCheckList(); updateCheckScore();
    });
    row.appendChild(input); row.appendChild(del);
    box.appendChild(row);
  });
  var actions = h("div", "row");
  actions.style.marginTop = "10px";
  var add = h("button", "btn small", "Add a rule"); add.type = "button";
  add.addEventListener("click", function () {
    if (CHECKLIST.length >= 15) { toast("15 rules is the limit"); return; }
    CHECKLIST.push({ id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), text: "New rule" });
    saveChecklist(); renderCheckList(); updateCheckScore();
    var inputs = box.querySelectorAll("input[type=text]");
    if (inputs.length) { inputs[inputs.length - 1].focus(); inputs[inputs.length - 1].select(); }
  });
  var reset = h("button", "btn small", "Restore my starting list"); reset.type = "button";
  reset.addEventListener("click", function () {
    CHECKLIST = defaultChecklist(); CHK = {};
    saveChecklist(); renderCheckList(); updateCheckScore();
    toast("Starting list restored");
  });
  actions.appendChild(add); actions.appendChild(reset);
  box.appendChild(actions);
}
export function renderCheck() {
  renderCheckList();
  updateCheckScore();
}
export function initCheckUI() {
  $("check-edit").addEventListener("click", function () { chkEditing = !chkEditing; renderCheckList(); });
  $("check-clear").addEventListener("click", function () { CHK = {}; renderCheck(); });
  $("check-log").addEventListener("click", function () { openDrawer(); });
}

export function __set_CHK(value: any) { CHK = value; return value; }
