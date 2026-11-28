/* The Yellow Candle journal: Calendar.
   An ES module: it imports what it needs from the other files. */

import { $, clear, dollarMode, fmtDate, fmtV, h, moneyShort, todayIso, vd } from "./core";
import { sorted } from "./stats";

/* ---------- calendar (one month at a time, follows the filters) ---------- */
var CAL = null;
var WDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
var WDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function weekdayOf(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return "";
  return WDAY_FULL[new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
}
export function p2(n) { return (n < 10 ? "0" : "") + n; }
export function renderCalendar() {
  var box = $("cal-body");
  clear(box);
  var list = vd();
  if (!CAL) {
    var base = list.length ? sorted(list)[list.length - 1].date : todayIso();
    CAL = { y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 };
  }
  var prefix = CAL.y + "-" + p2(CAL.m + 1) + "-";
  var days = {}, total = 0, count = 0;
  list.forEach(function (t) {
    if (t.date.indexOf(prefix) !== 0) return;
    var d = days[t.date] || (days[t.date] = { r: 0, n: 0 });
    d.r += t.r; d.n++; total += t.r; count++;
  });
  var keys = Object.keys(days);
  var up = keys.filter(function (k) { return days[k].r > 0; }).length;
  $("cal-title").textContent = MONTHS_FULL[CAL.m] + " " + CAL.y;
  $("cal-sub").textContent = count
    ? count + (count === 1 ? " trade" : " trades") + ", " + fmtV(total) + ", " + up + " of " + keys.length + " trading " + (keys.length === 1 ? "day" : "days") + " up"
    : "No trades this month";
  var nd = 5; // Monday to Friday only; weekend trades still count in the week total
  var grid = h("div", "cal-grid");
  grid.style.gridTemplateColumns = "repeat(" + nd + ", minmax(0, 1fr)) minmax(0, 1.2fr)";
  WDAYS.slice(0, nd).forEach(function (w) { grid.appendChild(h("div", "cal-h", w)); });
  grid.appendChild(h("div", "cal-h wk", "Week"));
  var first = new Date(CAL.y, CAL.m, 1);
  var lead = (first.getDay() + 6) % 7;
  var dim = new Date(CAL.y, CAL.m + 1, 0).getDate();
  var weeks = Math.ceil((lead + dim) / 7), shownWeek = 0, weekendN = 0;
  function amount(cell, v) {
    var rr = h("span", "cal-r num");
    rr.appendChild(h("span", "full", fmtV(v)));
    rr.appendChild(h("span", "short", dollarMode() ? moneyShort(v) : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1)));
    cell.appendChild(rr);
  }
  for (var w = 0; w < weeks; w++) {
    var rowCells = [], wsum = 0, wn = 0, hasDay = false;
    for (var c = 0; c < 7; c++) {
      var d = w * 7 + c - lead + 1;
      if (c >= nd) {
        var wi = days[prefix + p2(d)];
        if (d >= 1 && d <= dim && wi) { wsum += wi.r; wn += wi.n; weekendN += wi.n; hasDay = true; }
        continue;
      }
      if (d < 1 || d > dim) { rowCells.push(h("div", "cal-c blank")); continue; }
      hasDay = true;
      var iso = prefix + p2(d);
      var info = days[iso];
      var cell = h("div", "cal-c" + (info ? (info.r > 0 ? " win" : info.r < 0 ? " loss" : " flat") : "") + (iso === todayIso() ? " today" : ""));
      cell.appendChild(h("span", "cal-d", String(d)));
      if (info) {
        amount(cell, info.r);
        cell.appendChild(h("span", "cal-n", info.n + (info.n === 1 ? " trade" : " trades")));
        cell.title = fmtDate(iso) + ": " + fmtV(info.r) + " from " + info.n + (info.n === 1 ? " trade" : " trades");
        wsum += info.r; wn += info.n;
      }
      rowCells.push(cell);
    }
    if (!hasDay) continue;
    shownWeek++;
    rowCells.forEach(function (x) { grid.appendChild(x); });
    var wc = h("div", "cal-c wk" + (wn ? (wsum > 0 ? " win" : wsum < 0 ? " loss" : " flat") : ""));
    wc.appendChild(h("span", "cal-d", "W" + shownWeek));
    if (wn) {
      amount(wc, wsum);
      wc.appendChild(h("span", "cal-n", wn + (wn === 1 ? " trade" : " trades")));
      wc.title = "Week " + shownWeek + ": " + fmtV(wsum) + " from " + wn + (wn === 1 ? " trade" : " trades");
    }
    grid.appendChild(wc);
  }
  box.appendChild(grid);
  if (weekendN) box.appendChild(h("p", "note", weekendN + (weekendN === 1 ? " weekend trade is" : " weekend trades are") + " not shown as days but is included in the week totals."));
}
export function initCalendarUI() {
  function go(dm) {
    if (!CAL) renderCalendar();
    var d = new Date(CAL.y, CAL.m + dm, 1);
    CAL = { y: d.getFullYear(), m: d.getMonth() };
    renderCalendar();
  }
  $("cal-prev").addEventListener("click", function () { go(-1); });
  $("cal-next").addEventListener("click", function () { go(1); });
  $("cal-today").addEventListener("click", function () {
    var t = todayIso();
    CAL = { y: +t.slice(0, 4), m: +t.slice(5, 7) - 1 };
    renderCalendar();
  });
}
