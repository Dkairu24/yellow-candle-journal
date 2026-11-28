"use strict";
/* The Yellow Candle journal: Account and sync (Supabase).
   Plain script, no build step. Files share one global scope and load in the order listed in index.html. */

/* ---------- account and sync (Supabase) ---------- */
var SB_URL = "https://ehocjjfcbpchxqouipvy.supabase.co";
var SB_KEY = "sb_publishable__5JwB7XvODt2D6da_tfGeA_mSl645mL";
var DEL_KEY = "yellow-candle-deleted-v1";
var sb = null, sbUser = null, syncing = false, syncAgain = false, syncTimer = null, lastSync = 0, syncMsg = "";
var quietPersist = false;
function loadDeleted() {
  try {
    var o = JSON.parse(window.localStorage.getItem(DEL_KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch (e) { return {}; }
}
var deleted = loadDeleted();
function saveDeleted() {
  try { window.localStorage.setItem(DEL_KEY, JSON.stringify(deleted)); } catch (e) { /* kept for this visit */ }
}
function tsOf(t) { return t.updated || t.created || 0; }
function clock(d) { return p2(d.getHours()) + ":" + p2(d.getMinutes()); }
var syncState = "off";
var recovering = false;
var bannerDefault = null;
function applyBtn() {
  var b = $("acct-btn");
  if (!b) return;
  var label = !sbUser ? "Sign in" : syncState === "busy" ? "Syncing..." : syncState === "fail" ? "Sync failed" : syncState === "offline" ? "Offline" : "Synced";
  b.textContent = label;
  b.classList.toggle("warn", !!sbUser && (syncState === "fail" || syncState === "offline"));
  b.title = sbUser ? syncMsg : "";
}
function updateBanner() {
  var st = $("status");
  if (!st || !storageOk) return;
  if (bannerDefault === null) bannerDefault = st.textContent;
  st.textContent = sbUser ? "You are signed in: your trades and screenshots sync to your account." : bannerDefault;
}
function setSyncText(msg, state) {
  syncMsg = msg;
  if (state) syncState = state;
  var s = $("acct-status");
  if (s) s.textContent = msg;
  applyBtn();
}
function setUser(u) {
  var was = sbUser && sbUser.id;
  sbUser = u || null;
  renderAcct();
  updateLanding();
  if (sbUser && sbUser.id !== was) { scheduleSync(0); loadShared(); }
  if (!sbUser) { shared = {}; renderLog(); setSyncText("Not signed in"); }
}
function scheduleSync(ms) {
  if (!sb || !sbUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, ms === undefined ? 1500 : ms);
}
function chunk(arr, n) {
  var out = [];
  for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
function syncShots(uid, ids, goneIds) {
  var store = sb.storage.from("shots");
  return store.list(uid, { limit: 1000 }).then(function (res) {
    var have = {};
    ((res && res.data) || []).forEach(function (f) { have[f.name] = true; });
    var chain = Promise.resolve();
    ids.forEach(function (id) {
      chain = chain.then(function () {
        return shotGet(id).then(function (blob) {
          var name = id + ".jpg";
          if (blob && !have[name]) {
            return store.upload(uid + "/" + name, blob, { contentType: "image/jpeg", upsert: true });
          }
          if (!blob && have[name]) {
            return store.download(uid + "/" + name).then(function (d) {
              if (d && d.data) return shotPut(id, d.data);
            });
          }
        }).catch(function () { /* one screenshot failing must not stop the rest */ });
      });
    });
    var rm = [];
    Object.keys(have).forEach(function (name) {
      goneIds.forEach(function (g) { if (name === g + ".jpg" || name.indexOf(g + "_") === 0) rm.push(uid + "/" + name); });
    });
    if (rm.length) chain = chain.then(function () { return store.remove(rm); }).catch(function () {});
    return chain;
  });
}
function syncNow() {
  if (!sb || !sbUser) return Promise.resolve();
  if (syncing) { syncAgain = true; return Promise.resolve(); }
  syncing = true;
  setSyncText("Syncing...", "busy");
  var uid = sbUser.id;
  return sb.from("trades").select("id,data,updated_at,deleted").then(function (res) {
    if (res.error) throw res.error;
    var rows = res.data || [];
    var remote = {}, rTr = {}, rDel = {}, rTs = {};
    rows.forEach(function (r) {
      remote[r.id] = r;
      var ts = (r.data && r.data.updated) || Date.parse(r.updated_at) || 0;
      rTs[r.id] = ts;
      if (r.deleted) rDel[r.id] = ts;
      else {
        var one = cleanList([Object.assign({}, r.data, { id: r.id })])[0];
        if (one) rTr[r.id] = one;
      }
    });
    var map = {};
    trades.forEach(function (t) { map[t.id] = t; });
    Object.keys(rTr).forEach(function (id) {
      if (!map[id] || tsOf(rTr[id]) > tsOf(map[id])) map[id] = rTr[id];
    });
    var del = {};
    [deleted, rDel].forEach(function (d) {
      Object.keys(d).forEach(function (k) { del[k] = Math.max(del[k] || 0, d[k]); });
    });
    Object.keys(map).forEach(function (id) {
      if (del[id] && del[id] >= tsOf(map[id])) delete map[id];
    });
    var merged = Object.keys(map).map(function (k) { return map[k]; });
    var changed = merged.length !== trades.length || merged.some(function (t) {
      return trades.indexOf(t) < 0;
    });
    var delChanged = Object.keys(del).length !== Object.keys(deleted).length;
    trades = merged;
    deleted = del;
    if (changed || delChanged) {
      quietPersist = true;
      persist();
      quietPersist = false;
      saveDeleted();
      renderAll();
    }
    var up = [];
    merged.forEach(function (t) {
      var r = remote[t.id];
      if (!r || r.deleted || tsOf(t) > rTs[t.id]) {
        up.push({ id: t.id, user_id: uid, data: t, updated_at: new Date(tsOf(t) || Date.now()).toISOString(), deleted: false });
      }
    });
    Object.keys(del).forEach(function (id) {
      var r = remote[id];
      if (r && r.deleted && rTs[id] >= del[id]) return;
      up.push({ id: id, user_id: uid, data: { updated: del[id] }, updated_at: new Date(del[id]).toISOString(), deleted: true });
    });
    var chain = Promise.resolve();
    chunk(up, 200).forEach(function (part) {
      chain = chain.then(function () {
        return sb.from("trades").upsert(part, { onConflict: "user_id,id" }).then(function (r) { if (r.error) throw r.error; });
      });
    });
    return chain.then(function () {
      var withShot = [];
      merged.forEach(function (t) { if (t.shot) shotList(t).forEach(function (x) { withShot.push(x.k); }); });
      return syncShots(uid, withShot, Object.keys(del));
    });
  }).then(function () {
    lastSync = Date.now();
    syncing = false;
    setSyncText("Synced at " + clock(new Date()), "ok");
  }).catch(function (e) {
    syncing = false;
    if (navigator.onLine === false) setSyncText("Offline. Your trades are safe here and will sync later.", "offline");
    else setSyncText("Sync failed: " + ((e && e.message) || "try again") + ". Your trades are safe on this device.", "fail");
  }).then(function () {
    if (syncAgain) { syncAgain = false; scheduleSync(300); }
  });
}
function renderAcct() {
  var out = $("acct-out"), inn = $("acct-in");
  if (!out) return;
  out.hidden = !!sbUser || recovering;
  inn.hidden = !sbUser || recovering;
  $("acct-new").hidden = !recovering;
  applyBtn();
  updateBanner();
  if (sbUser) $("acct-email").textContent = sbUser.email || "your account";
}
var INTRO_SIGNIN = "Sign in to keep your trades and screenshots in your own account, on every device. Without signing in, the journal still works on this device only.";
var acctMode = "signin";
function setAcctMode(m) {
  acctMode = m;
  var reset = m === "reset";
  $("acct-title").textContent = reset ? "Reset your password" : "Your account";
  $("acct-intro").textContent = reset ? "Enter the email you signed up with and we will send you a link to choose a new password." : INTRO_SIGNIN;
  $("acct-pw-f").hidden = reset;
  $("acct-btns").hidden = reset;
  $("acct-forgot-p").hidden = reset;
  $("acct-reset-row").hidden = !reset;
  $("acct-back-p").hidden = !reset;
  acctMsg("");
  if (reset) setTimeout(function () { $("acct-email-in").focus(); }, 30);
}
function acctMsg(t, bad) {
  var m = $("acct-msg");
  m.textContent = t || "";
  m.className = "note" + (bad ? " bad" : "");
}
function initSync() {
  try {
    if (window.supabase) sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  } catch (e) { sb = null; }
  $("acct-btn").addEventListener("click", function () { setAcctMode("signin"); renderAcct(); acctMsg(""); $("acct-modal").hidden = false; });
  $("acct-close").addEventListener("click", function () { $("acct-modal").hidden = true; });
  $("acct-modal").addEventListener("click", function (e) { if (e.target === $("acct-modal")) $("acct-modal").hidden = true; });
  if (!sb) { setSyncText("Sync is unavailable right now. The journal still works on this device."); authReady = true; updateLanding(); return; }
  function creds() {
    var email = $("acct-email-in").value.trim(), pw = $("acct-pw").value;
    if (!email || email.indexOf("@") < 1) { acctMsg("Enter your email address.", true); return null; }
    if (pw.length < 8) { acctMsg("Use a password of at least 8 characters.", true); return null; }
    return { email: email, password: pw };
  }
  $("acct-signin").addEventListener("click", function () {
    var c = creds(); if (!c) return;
    acctMsg("Signing in...");
    sb.auth.signInWithPassword(c).then(function (r) {
      if (r.error) { acctMsg(r.error.message, true); return; }
      $("acct-pw").value = "";
      acctMsg("");
      $("acct-modal").hidden = true;
      toast("Signed in. Syncing your trades.");
    }).catch(function () { acctMsg("Could not reach the sign-in service.", true); });
  });
  $("acct-signup").addEventListener("click", function () {
    var c = creds(); if (!c) return;
    acctMsg("Creating your account...");
    sb.auth.signUp({ email: c.email, password: c.password, options: { emailRedirectTo: location.href.split("#")[0] } }).then(function (r) {
      if (r.error) { acctMsg(r.error.message, true); return; }
      $("acct-pw").value = "";
      if (r.data && r.data.session) { acctMsg(""); $("acct-modal").hidden = true; toast("Account created. Syncing your trades."); }
      else acctMsg("Check your email and press the confirmation link, then come back and sign in.");
    }).catch(function () { acctMsg("Could not reach the sign-in service.", true); });
  });
  $("acct-email-in").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); if (acctMode === "reset") $("acct-sendreset").click(); else $("acct-pw").focus(); } });
  $("acct-pw").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); $("acct-signin").click(); } });
  $("acct-reset").addEventListener("click", function () { setAcctMode("reset"); });
  $("acct-back").addEventListener("click", function () { setAcctMode("signin"); });
  $("acct-sendreset").addEventListener("click", function () {
    var email = $("acct-email-in").value.trim();
    if (!email || email.indexOf("@") < 1) { acctMsg("Enter your email address.", true); return; }
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] }).then(function (r) {
      acctMsg(r.error ? r.error.message : "If that email has an account, a reset link is on its way.", !!r.error);
    }).catch(function () { acctMsg("Could not reach the sign-in service.", true); });
  });
  $("acct-sync").addEventListener("click", function () { scheduleSync(0); });
  $("acct-signout").addEventListener("click", function () {
    sb.auth.signOut().then(function () {
      $("acct-modal").hidden = true;
      toast("Signed out. Your trades stay on this device.");
    });
  });
  sb.auth.getSession().then(function (r) { authReady = true; setUser(r.data && r.data.session && r.data.session.user); updateLanding(); }).catch(function () { authReady = true; updateLanding(); });
  sb.auth.onAuthStateChange(function (ev, session) {
    if (ev === "PASSWORD_RECOVERY") { recovering = true; acctMsg(""); renderAcct(); $("acct-modal").hidden = false; }
    setUser(session && session.user);
  });
  $("acct-setpw").addEventListener("click", function () {
    var pw = $("acct-newpw").value;
    if (pw.length < 8) { acctMsg("Use a password of at least 8 characters.", true); return; }
    sb.auth.updateUser({ password: pw }).then(function (r) {
      if (r.error) { acctMsg(r.error.message, true); return; }
      recovering = false;
      $("acct-newpw").value = "";
      renderAcct();
      acctMsg("Password updated. You are signed in.");
    }).catch(function () { acctMsg("Could not reach the sign-in service.", true); });
  });
  var wipeArmed = false, wipeTimer = null;
  $("acct-wipe").addEventListener("click", function () {
    var btn = $("acct-wipe");
    if (!wipeArmed) {
      wipeArmed = true;
      btn.textContent = "Press again to delete everything in your cloud account";
      wipeTimer = setTimeout(function () { wipeArmed = false; btn.textContent = "Delete my cloud data"; }, 5000);
      return;
    }
    clearTimeout(wipeTimer);
    wipeArmed = false;
    btn.textContent = "Delete my cloud data";
    var uid = sbUser.id, store = sb.storage.from("shots");
    acctMsg("Deleting...");
    sb.from("trades").delete().eq("user_id", uid).then(function (r) {
      if (r.error) throw r.error;
      return store.list(uid, { limit: 1000 });
    }).then(function (r) {
      var names = ((r && r.data) || []).map(function (f) { return uid + "/" + f.name; });
      return names.length ? store.remove(names) : null;
    }).then(function () {
      return sb.auth.signOut();
    }).then(function () {
      acctMsg("Your cloud data is deleted and you are signed out. Your trades are still on this device.");
    }).catch(function (e) { acctMsg("Could not delete: " + ((e && e.message) || "try again"), true); });
  });
  window.addEventListener("online", function () { scheduleSync(500); });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && sbUser && Date.now() - lastSync > 30000) scheduleSync(300);
  });
  setSyncText("Not signed in");
}
