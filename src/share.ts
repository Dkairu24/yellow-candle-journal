/* The Yellow Candle journal: Public sharing (opt in, per trade).
   An ES module: it imports what it needs from the other files. */

import { $, __set_shared, clear, h, shared, toast, trades, usd } from "./core";
import { renderLog } from "./log";
import { MAX_SHOTS, shotGet, shotList } from "./screenshots";
import { sb, sbUser } from "./sync";

/* ---------- public sharing (opt in, per trade) ---------- */
var SHARE_FIELDS = ["date", "pair", "dir", "tf", "r", "entry", "stop", "exit", "target", "plan", "htf", "poi", "sweep", "trigger", "disp", "fresh", "rules", "mood", "tags", "link", "notes", "chkS", "chkN", "lots"];
function newSlug() {
  var a = new Uint8Array(12);
  (window.crypto || window.msCrypto).getRandomValues(a);
  var al = "abcdefghijkmnpqrstuvwxyz23456789", out = "";
  for (var i = 0; i < a.length; i++) out += al[a[i] % al.length];
  return out;
}
function shareUrl(slug) { return location.origin + location.pathname + "?t=" + slug; }
export function loadShared() {
  if (!sb || !sbUser) return Promise.resolve();
  return sb.from("shared_trades").select("trade_id,slug").then(function (r) {
    if (r.error) return;
    __set_shared({});
    (r.data || []).forEach(function (x) { shared[x.trade_id] = x.slug; });
    renderLog();
  });
}
function closeShare() { $("share-modal").hidden = true; }
export function openShare(id) {
  var t = trades.filter(function (x) { return x.id === id; })[0];
  if (!t) return;
  var body = $("share-body");
  clear(body);
  $("share-modal").hidden = false;
  if (!sb || !sbUser) {
    body.appendChild(h("p", "share-note", "Sign in first. A public link is stored in your account, so it can be switched off later."));
    var b = h("button", "btn primary", "Sign in"); b.type = "button";
    b.addEventListener("click", function () { closeShare(); $("acct-btn").click(); });
    body.appendChild(b);
    return;
  }
  function draw(msg?) {
    clear(body);
    var slug = shared[id];
    if (!slug) {
      body.appendChild(h("p", "share-note", "Anyone with the link will see this trade: the pair, side, prices, result, your setup checklist, mood, notes and chart screenshot. Nothing else in your journal is shown, and the link is not listed anywhere."));
      var go = h("button", "btn primary", "Create public link"); go.type = "button";
      go.addEventListener("click", function () { go.disabled = true; go.textContent = "Creating..."; publish(t, null).then(function () { draw(); }).catch(function (e) { draw(); body.appendChild(h("p", "share-note neg", shareError(e))); }); });
      body.appendChild(go);
      if (msg) body.appendChild(h("p", "share-note neg", msg));
      return;
    }
    var url = shareUrl(slug);
    var row = h("div", "share-url");
    var inp = document.createElement("input"); inp.readOnly = true; inp.value = url; inp.setAttribute("aria-label", "Public link");
    inp.addEventListener("focus", function () { inp.select(); });
    var cp = h("button", "btn primary", "Copy"); cp.type = "button";
    cp.addEventListener("click", function () {
      var done = function () { toast("Link copied"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { inp.select(); document.execCommand("copy"); done(); });
      else { inp.select(); document.execCommand("copy"); done(); }
    });
    row.appendChild(inp); row.appendChild(cp);
    body.appendChild(row);
    body.appendChild(h("p", "share-note", "This trade is public. Edited it since? Press Update so the page matches."));
    var acts = h("div", "share-row");
    var up = h("button", "btn small", "Update page"); up.type = "button";
    up.addEventListener("click", function () { up.disabled = true; publish(t, slug).then(function () { toast("Public page updated"); draw(); }).catch(function (e) { draw(shareError(e)); }); });
    var op = h("a", "btn small", "Open"); op.href = url; op.target = "_blank"; op.rel = "noopener";
    var off = h("button", "btn small", "Stop sharing"); off.type = "button";
    off.addEventListener("click", function () { off.disabled = true; unpublish(t).then(function () { toast("Link switched off"); draw(); }).catch(function (e) { draw(shareError(e)); }); });
    acts.appendChild(up); acts.appendChild(op); acts.appendChild(off);
    body.appendChild(acts);
    if (msg) body.appendChild(h("p", "share-note neg", msg));
  }
  draw();
}
function shareError(e) {
  var m = String((e && e.message) || e || "");
  if (/shared_trades|relation|schema cache|does not exist/i.test(m)) return "Sharing is not set up on your database yet. Run supabase_share.sql in the Supabase SQL Editor, then try again.";
  return "Could not do that: " + m;
}
function publish(t, existing) {
  var slug = existing || newSlug();
  var uid = sbUser.id;
  var data: any = {};
  SHARE_FIELDS.forEach(function (k) { if (t[k] !== undefined && t[k] !== null && t[k] !== "") data[k] = t[k]; });
  var uv = usd(t);
  if (uv !== null) data.usd = uv;
  var items = shotList(t).slice(0, MAX_SHOTS);
  var p = Promise.all(items.map(function (it, i) {
    return shotGet(it.k).then(function (blob) {
      if (!blob) return null;
      var path = uid + "/" + slug + "_" + i + ".jpg";
      return sb.storage.from("public-shots").upload(path, blob, { contentType: "image/jpeg", upsert: true }).then(function (r) { return r.error ? null : { p: path, c: it.c || "" }; });
    }).catch(function () { return null; });
  })).then(function (arr) {
    arr = arr.filter(Boolean);
    var stale = [uid + "/" + slug + ".jpg"];
    for (var i = arr.length; i < MAX_SHOTS; i++) stale.push(uid + "/" + slug + "_" + i + ".jpg");
    sb.storage.from("public-shots").remove(stale).catch(function () {});
    if (arr.length) data._shots = arr;
    return arr.length > 0;
  });
  return p.then(function (hasShot) {
    return sb.from("shared_trades").upsert({ slug: slug, trade_id: t.id, user_id: uid, data: data, has_shot: hasShot, updated_at: new Date().toISOString() }, { onConflict: "slug" });
  }).then(function (r) {
    if (r.error) throw r.error;
    shared[t.id] = slug;
    renderLog();
  });
}
function unpublish(t) {
  var slug = shared[t.id];
  return sb.from("shared_trades").delete().eq("slug", slug).then(function (r) {
    if (r.error) throw r.error;
    var gonePaths = [sbUser.id + "/" + slug + ".jpg"];
    for (var gi = 0; gi < MAX_SHOTS; gi++) gonePaths.push(sbUser.id + "/" + slug + "_" + gi + ".jpg");
    sb.storage.from("public-shots").remove(gonePaths).catch(function () {});
    delete shared[t.id];
    renderLog();
  });
}
export function initShareUI() {
  $("share-close").addEventListener("click", closeShare);
  $("share-modal").addEventListener("click", function (e) { if (e.target === $("share-modal")) closeShare(); });
}
