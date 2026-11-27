import { initEffects, confetti, chime, jingle, sound, tilt, sparkleAt, fireworks, flash, startMusic, stopMusic, setSfx, reelTick, tada, whoosh, toastSound, sleighBell, sleighShake, snowcap, showPlanet, flyIntoPlanet, isPlanetUp, glitter, slotSfx, giftRain, cannons } from "./effects.js";
import * as CFG from "./firebase-config.js";
const { firebaseConfig, ADMIN_EMAILS } = CFG;
const DEFAULTS = CFG.DEFAULTS || { date: "2026-12-11", budget: 35, wishlistDeadline: "2026-12-01" };
import { icon } from "./icons.js";
import { treeSVG } from "./scene.js";
import { mountPicker, ornamentSVG, spinName } from "./picker.js";
import { runSlot } from "./slot.js";

const DEMO = !firebaseConfig.apiKey || /PASTE/i.test(firebaseConfig.apiKey);
const api = DEMO ? await import("./demo-api.js") : await import("./firebase-api.js");
const NAMES = (await (await fetch("names.json", { cache: "no-cache" })).json()).sort((a, b) => a.localeCompare(b));

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const COLORS = ["#ff3b5c", "#22c55e", "#ffd166", "#4cc9f0", "#c77dff", "#ff8fab"];
const colorFor = (n) => COLORS[Math.max(0, NAMES.indexOf(n)) % COLORS.length];
function safeUrl(u) {
  try {
    if (!u || u.length > 500) return "";
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : "";
  } catch { return ""; }
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return store.mem[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { store.mem[k] = v; } },
  mem: {},
};
function toast(msg, kind = "", ic = kind === "bad" ? "alert" : "sparkles") {
  const box = $("#toasts");
  for (const old of box.children) if (old.textContent === msg) old.remove();
  while (box.children.length >= 2) box.firstElementChild.remove();
  const t = document.createElement("div");
  t.className = "toast " + kind;
  toastSound(kind === "bad");
  t.innerHTML = icon(ic);
  const sp = document.createElement("span");
  sp.textContent = msg;
  t.appendChild(sp);
  $("#toasts").appendChild(t);
  setTimeout(() => t.classList.add("out"), 2400);
  setTimeout(() => t.remove(), 2900);
}
const daysToXmas = () => {
  const now = new Date();
  let x = new Date(now.getFullYear(), 11, 25);
  if (now > x) x = new Date(now.getFullYear() + 1, 11, 25);
  return Math.ceil((x - now) / 864e5);
};

const budgetNum = () => {
  const b = S.event?.budget ?? DEFAULTS.budget;
  if (typeof b === "number") return b > 0 ? b : null;
  const m = String(b || "").match(/\d+(\.\d+)?/);
  return m ? +m[0] : null;
};
// Event date: "YYYY-MM-DD" (day only) or a full date-time
function eventWhen() {
  const raw = S.event?.date || DEFAULTS.date;
  if (!raw) return null;
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(raw);
  return isNaN(d) ? null : { d, dayOnly: !!m };
}
const deadlineStr = () => S.event?.wishlistDeadline || DEFAULTS.wishlistDeadline || "";
function deadlineInfo() {
  const d = deadlineStr();
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const now = new Date();
  const left = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
  const label = new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const short = new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { left, label, short };
}
const myListDone = () => S.myList.length > 0 || (S.myProfile?.interests || []).length > 0;
function deadlineBanner(where) {
  const d = deadlineInfo();
  if (!d) return "";
  const done = myListDone();
  const when = d.left > 1 ? `${d.left} days left` : d.left === 1 ? "Due tomorrow" : d.left === 0 ? "Due today" : "Past due";
  if (done) return `<div class="deadline ok">${icon("check-circle")}<div><b>Wishlist done.</b> Nice. You can keep editing until ${esc(d.label)}.</div></div>`;
  return `<div class="deadline ${d.left <= 3 ? "urgent" : ""}">${icon("clock")}<div><b>Wishlist due ${esc(d.label)}</b> · ${when}.
    Add a few items or interests so your Santa isn't guessing. Reminder emails keep coming until you do.</div>
    ${where === "home" ? `<button class="btn primary tiny" id="goto-list2">Fill it out ${icon("arrow")}</button>` : ""}</div>`;
}
function updateDeadline() {
  const el = $("#deadline-slot");
  if (!el) return;
  el.innerHTML = deadlineBanner(S.tab);
  const b = $("#goto-list2");
  if (b) b.onclick = () => goTab("list");
}
const money = (v) => "$" + (Number.isInteger(v) ? v : v.toFixed(2));
const INTEREST_IDEAS = ["Gaming", "Music", "Sports", "Fitness", "Cooking", "Baking", "Coffee", "Tea", "Books", "Movies", "Anime", "Art",
  "Fashion", "Sneakers", "Skincare", "Tech", "Travel", "Outdoors", "Snowboarding", "Plants", "Board games", "Photography"];
const PROFILE_FIELDS = { colors: 120, treats: 200, stores: 200, shirt: 20, shoe: 20, avoid: 200, notes: 500 };

// ---------- state ----------
const app = $("#app");
const S = { user: null, me: null, isAdmin: false, people: {}, event: {}, recipient: undefined, myList: [], myProfile: {}, theirList: [], theirProfile: {}, spent: null, draftInterests: [], profileDirty: false, tab: "home", recipUnsub: null };
let subs = [];
const sub = (fn) => fn && subs.push(fn);
function cleanup() {
  subs.forEach((f) => { try { f(); } catch {} });
  subs = [];
  S.recipUnsub?.();
  Object.assign(S, { me: null, people: {}, recipient: undefined, myList: [], myProfile: {}, theirList: [], theirProfile: {}, spent: null, recipUnsub: null, tab: "home" });
}

// ---------- boot ----------
initEffects({
  onSleigh: () => toast("Ho ho ho! You found Santa.", "", "sled"),
  onEgg: (k) => toast(k === "snow" ? "Let it snow!" : "HO HO HO!", "", k === "snow" ? "snowflake" : "sled"),
  onGinger: () => toast("Run, run, as fast as you can!", "", "sparkles"),
});
// Snow caps on every card that appears
new MutationObserver(() => {
  for (const c of document.querySelectorAll(".card, .dialog")) {
    if (!c.querySelector(":scope > .snowcap")) c.insertAdjacentHTML("afterbegin", snowcap());
  }
}).observe(document.getElementById("app").parentNode, { childList: true, subtree: true });

// Big titles: every letter is its own bouncy, shimmering, playable piece
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
function fancy(text) {
  let i = 0;
  return text.split(" ").map((w) => `<span class="word">${[...w].map((c) => `<span class="ch" style="--i:${i++}">${esc(c)}</span>`).join("")}</span>`).join(" ");
}
app.addEventListener("pointerover", (e) => {
  const ch = e.target.closest(".ch");
  if (!ch || ch.classList.contains("boing")) return;
  ch.classList.add("boing");
  ch.addEventListener("animationend", (ev) => ev.animationName === "boing" && ch.classList.remove("boing"), { once: false });
  chime(PENTA[+ch.style.getPropertyValue("--i") % PENTA.length], 0, 0.05);
});
if (DEMO) {
  document.body.insertAdjacentHTML("afterbegin",
    `<div class="demo-banner">${icon("flask")} Preview mode with fake data. Group code is <b>jingle</b>. Add your Firebase config to go live.</div>`);
}
const syncSoundBtns = () => {
  $("#sound-btn").innerHTML = icon(sound.music ? "music" : "bell-off");
  $("#sound-btn").classList.toggle("on", sound.music);
  $("#sound-btn").title = sound.music ? "Stop the music box" : "Play the music box";
  $("#mute-btn").innerHTML = icon(sound.on ? "volume" : "volume-x");
  $("#mute-btn").title = sound.on ? "Mute sound effects" : "Turn sound effects on";
};
syncSoundBtns();
$("#mute-btn").addEventListener("click", () => {
  setSfx(!sound.on);
  syncSoundBtns();
  if (sound.on) { sleighShake(5, 0.1); toast("Sound on", "", "volume"); }
});
$("#sound-btn").addEventListener("click", (e) => {
  if (sound.music) stopMusic();
  else { if (!sound.on) setSfx(true); startMusic(); toast("Music box on", "", "music"); }
  e.currentTarget.setAttribute("aria-pressed", sound.music);
  syncSoundBtns();
});
addEventListener("keydown", (e) => e.key === "Escape" && closeModal());
// If a site icon can't load, show a star instead of a broken image
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img?.classList?.contains("fav")) img.outerHTML = `<span class="fav star">${icon("star")}</span>`;
}, true);
setInterval(tickCountdown, 1000);

// If sign-in or loading hangs (slow phone network), show a way out instead of an endless spinner
let authSeen = false;
function renderStuck() {
  if (isPlanetUp()) return;
  app.innerHTML = `<div class="card stuck"><h2>Still loading…</h2><p class="muted">This is taking longer than it should. Check your connection and try again.</p><button class="btn primary" id="stuck-reload">Try again</button></div>`;
  $("#stuck-reload").onclick = () => location.reload();
}
setTimeout(() => { if (!authSeen) renderStuck(); }, 15000);
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

api.onAuth(async (user) => {
  authSeen = true;
  cleanup();
  S.user = user;
  if (!user) return renderLanding();
  if (isPlanetUp()) flyIntoPlanet();
  S.isAdmin = DEMO || ADMIN_EMAILS.map((e) => e.toLowerCase()).includes((user.email || "").toLowerCase());
  renderUserChip();
  app.innerHTML = `<div class="loader">${icon("snowflake")}</div>`;
  sub(api.watchPeople((p) => { S.people = p; onPeople(); }));
  sub(api.watchEvent((e) => { S.event = e || {}; updateEvent(); updateDrawStatus(); updateBudget(); updateTheirList(); updateTheirProfile(); updateMyList(); updateDeadline(); updateCrew(); }));
  try { S.me = await withTimeout(api.getMyName(user.uid), 12000); }
  catch (e) { if (e?.message === "timeout") return renderStuck(); S.me = null; }
  if (S.me) enterDashboard(); else renderPicker();
  setTimeout(spamTip, 1800);
});

// One-time popup so reminder emails don't end up in spam
const SENDER = "alphadeltasecretsanta@gmail.com";
function spamTip() {
  if (!S.user || store.get("ss-spam-tip") === "1") return;
  const q = encodeURIComponent(`from:${SENDER} in:spam`);
  const gmail = `https://mail.google.com/mail/?authuser=${encodeURIComponent(S.user.email || "")}#search/${q}`;
  openModal(`
    <h2>${icon("bell")} Don't miss the elves</h2>
    <p>Reminders and your match come from:</p>
    <p class="spam-addr">${SENDER}</p>
    <p>New addresses often land in spam, so take 10 seconds to fix it:</p>
    <ol class="spam-steps">
      <li>Tap <b>Check my spam</b> and mark any Secret Santa emails <b>Not spam</b>.</li>
      <li>Tap <b>Copy email</b> and add it to your contacts.</li>
    </ol>
    <div class="spam-btns">
      <a class="btn primary" href="${gmail}" target="_blank" rel="noopener">${icon("search")} Check my spam</a>
      <button class="btn ghost" id="spam-copy">${icon("tag")} Copy email</button>
      <button class="btn ghost" data-close>Done</button>
    </div>`, () => store.set("ss-spam-tip", "1"));
  $("#spam-copy").onclick = async () => {
    try { await navigator.clipboard.writeText(SENDER); toast("Email copied", "", "check"); }
    catch { toast(SENDER); }
  };
}

function renderUserChip() {
  const u = S.user;
  const pic = safeUrl(u.photo);
  $("#user-chip").innerHTML = `${pic ? `<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer">` : `<span class="av">${esc((u.name || "?")[0])}</span>`}
    <button class="btn tiny ghost" id="signout">Sign out</button>`;
  $("#signout").onclick = () => api.signOut();
}

// ---------- landing ----------
const GOOGLE_G = `<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

async function renderLanding() {
  $("#user-chip").innerHTML = "";
  app.innerHTML = "";
  const ok = await showPlanet({ onSignIn: doSignIn });
  if (!ok && !S.user) renderLandingFallback();
  else mountGoogleButton($("#intro-open"));
}

// Google's own button opens the account picker right away. Firebase's popup
// has to load a helper page first, which is very slow on iPhone Safari.
let gis = null;
function loadGIS() {
  if (DEMO || !api.GOOGLE_CLIENT_ID) return Promise.resolve(false);
  return gis ||= new Promise((res) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      try {
        google.accounts.id.initialize({
          client_id: api.GOOGLE_CLIENT_ID,
          ux_mode: "popup",
          callback: async (r) => {
            try { await api.signInWithIdToken(r.credential); }
            catch { toast("Sign-in failed. Try again?", "bad"); }
          },
        });
        res(true);
      } catch { res(false); }
    };
    s.onerror = () => res(false);
    document.head.appendChild(s);
  });
}
async function mountGoogleButton(btn) {
  // phones use the redirect sign-in instead (see firebase-api.js)
  if (!btn || document.documentElement.classList.contains("mobile") || btn.nextElementSibling?.classList.contains("gis-btn")) return;
  if (!(await loadGIS()) || S.user) return;
  const box = document.createElement("div");
  box.className = "gis-btn";
  btn.after(box);
  google.accounts.id.renderButton(box, {
    type: "standard", theme: "outline", size: "large", shape: "pill",
    text: "signin_with", logo_alignment: "left", width: 260,
  });
  btn.hidden = true;
}
async function doSignIn() {
  chime();
  try { await api.signIn(); }
  catch (err) { if (!/popup-closed|cancelled-popup/.test(err?.code || "")) toast("Sign-in failed. Try again?", "bad"); }
}

// Plain sign-in screen, only used if a device can't show the 3D planet
function renderLandingFallback() {
  $("#user-chip").innerHTML = "";
  app.innerHTML = `
  <section class="hero">
    <div class="hero-text">
      <span class="badge">${icon("tree")} ${new Date().getFullYear()} edition</span>
      <h1 class="title big">${fancy("Secret Santa")}</h1>
      <button class="btn google spaced" id="signin">${GOOGLE_G}<span>Sign in with Google</span></button>
      <p class="muted small hint-row">${icon("snowflake")} ${daysToXmas()} days until Christmas</p>
    </div>
    <div class="tree" id="tree">${treeSVG()}</div>
  </section>`;
  $("#tree").onclick = (e) => {
    const g = e.target.closest(".gift");
    if (g) {
      g.classList.remove("pop"); void g.getBoundingClientRect(); g.classList.add("pop");
      const r = g.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top, 70);
      sleighShake(6, 0.09); chime(PENTA[+g.dataset.gift % PENTA.length], 0.1, 0.08);
      return;
    }
    const t = e.currentTarget;
    t.classList.remove("shake"); void t.offsetWidth; t.classList.add("shake");
    jingle(); sleighShake(8, 0.07);
    sparkleAt(t.querySelector(".t-star"));
    $$(".t-orn", t).forEach((o, i) => { o.classList.remove("swing"); void o.getBoundingClientRect(); o.classList.add("swing"); });
  };
  mountGoogleButton($("#signin"));
  $("#signin").onclick = async () => {
    chime();
    try { await api.signIn(); }
    catch (err) { if (!/popup-closed|cancelled-popup/.test(err?.code || "")) toast("Sign-in failed. Try again?", "bad"); }
  };
}

// ---------- picker ----------
function ornamentHTML(n, i, opts = {}) {
  const p = S.people[n];
  const pic = safeUrl(p?.photo);
  const status = opts.status ?? (p ? `${icon("lock")} Taken` : "");
  return `<button class="orn ${p ? "taken" : ""} ${opts.cls || ""}" data-name="${esc(n)}" style="--c:${colorFor(n)};--i:${i}" ${opts.disabled ? "disabled" : ""}>
    <span class="hook"></span>
    <span class="ball">${pic ? `<img src="${esc(pic)}" alt="" referrerpolicy="no-referrer">` : ""}<span class="nm">${esc(n)}</span></span>
    ${status ? `<span class="status">${status}</span>` : ""}
  </button>`;
}

let picker = null;
function renderPicker() {
  picker?.destroy();
  picker = mountPicker(app, { names: NAMES, people: S.people, onPick: confirmClaim, chime, sleighBell });
  const t = $("#picker-title");
  if (t) t.innerHTML = fancy("Find your ornament");
}
function updatePicker() {
  if (picker && $(".picker2")) picker.update(S.people);
}

function confirmClaim(name, idx = NAMES.indexOf(name)) {
  chime(1046.5);
  sleighShake(4, 0.06);
  openModal(`<div class="claim-orn" id="claim-orn">${ornamentSVG(name, idx, { big: true })}</div>
    <h2 class="center">Are you <span class="hl">${esc(name)}</span>?</h2>
    <p class="muted center">Enter the group code from the group chat. Only the organizer can undo this.</p>
    <form id="claim-form" class="stack">
      <input id="claim-code" placeholder="Group code" autocomplete="off" required maxlength="40">
      <p class="field-err" id="claim-err" hidden></p>
      <div class="row end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${icon("check")} That's me!</button></div>
    </form>`);
  $("#claim-code").focus();
  $("#claim-code").addEventListener("input", () => { $("#claim-code").classList.remove("invalid"); $("#claim-err").hidden = true; });
  const co = $("#claim-orn");
  const spinT = setInterval(() => (co?.isConnected ? spinName(co) : clearInterval(spinT)), 2600);
  setTimeout(() => co && spinName(co), 500);
  $("#claim-form").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.submitter; btn.disabled = true;
    try {
      await api.claim(S.user, name, $("#claim-code").value.trim());
      const orn = $("#claim-orn");
      if (orn) {
        const r = orn.getBoundingClientRect();
        orn.classList.add("shatter");
        flash();
        glitter(r.left + r.width / 2, r.top + r.height * 0.55, ["#ffd166", "#ff8fab", "#ffffff", "#4cc9f0"]);
        sleighShake(10, 0.1);
        await new Promise((res) => setTimeout(res, 650));
      }
      closeModal();
      picker?.destroy(); picker = null;
      S.me = name;
      confetti(); jingle(); fireworks(2);
      toast(`Welcome to the workshop, ${name}!`, "", "tree");
      enterDashboard();
    } catch (err) {
      btn.disabled = false;
      const m = String(err?.message || "");
      if (m === "already") { S.me = await api.getMyName(S.user.uid); closeModal(); return S.me ? enterDashboard() : null; }
      const msg = m === "taken" ? "Someone just grabbed that name." :
        (err?.code === "permission-denied" || /permission/i.test(m)) ? "That code didn't work. Check the group chat and try again." :
        "Something went wrong. Try again.";
      const dlg = $(".dialog"), inp = $("#claim-code"), er = $("#claim-err");
      if (er) { er.hidden = false; er.textContent = msg; }
      inp?.classList.add("invalid"); inp?.select();
      dlg?.classList.remove("shake"); void dlg?.offsetWidth; dlg?.classList.add("shake");
      toastSound(true);
    }
  };
}

// ---------- dashboard ----------
function enterDashboard() {
  renderShell();
  sub(api.watchAssignment(S.me, (r) => {
    if (r !== S.recipient) {
      S.recipUnsub?.();
      S.recipUnsub = null;
      S.theirList = [];
      S.recipient = r;
      if (r) S.recipUnsub = api.watchWishlist(r, (w) => { S.theirList = w.items; S.theirProfile = w.profile; updateTheirList(); updateTheirProfile(); });
    }
    updateAssignment();
  }));
  sub(api.watchWishlist(S.me, (w) => { S.myList = w.items; S.myProfile = w.profile || {}; updateMyList(); fillProfileForm(); updateDeadline(); }));
  sub(api.watchMe(S.user.uid, (d) => { S.spent = typeof d?.spent === "number" ? d.spent : null; updateBudget(); }));
}

function renderShell() {
  const tabs = [["home", "home", "Home"], ["list", "list", "My List"], ["everyone", "users", "Everyone"]];
  if (S.isAdmin) tabs.push(["admin", "crown", "Admin"]);
  app.innerHTML = `<section class="dash">
    <div class="hello"><h1 class="title">${fancy(`Ho ho ho, ${S.me}!`)}</h1><p class="lead">Welcome back to the workshop.</p></div>
    <nav class="tabs" role="tablist">${tabs.map(([k, ic, l]) => `<button role="tab" class="tab ${S.tab === k ? "active" : ""}" data-tab="${k}">${icon(ic)}<span>${l}</span></button>`).join("")}</nav>
    <div id="view"></div>
  </section>`;
  $$(".tab").forEach((b) => (b.onclick = () => goTab(b.dataset.tab)));
  showTab();
}
function goTab(t) {
  S.tab = t;
  $$(".tab").forEach((x) => x.classList.toggle("active", x.dataset.tab === t));
  showTab();
}

const VIEWS = {
  home: `
    <div id="deadline-slot"></div>
    <div class="grid2">
      <article class="card tilt glow-red"><h2>${icon("target")} Your mission</h2><div id="assignment"></div></article>
      <article class="card tilt glow-green" id="event-card"></article>
    </div>
    <div class="grid2 row2">
      <article class="card glow-gold" id="budget-card"></article>
      <article class="card"><h2>${icon("sled")} Workshop progress</h2><div id="progress"></div></article>
    </div>
    <article class="card" id="their-profile-card" hidden><h2>${icon("heart")} <span>Get to know <span class="their-name"></span></span></h2><div id="their-profile"></div></article>
    <article class="card" id="their-list-card" hidden><h2>${icon("gift")} <span><span class="their-name"></span>'s wishlist</span></h2><ul class="wishlist" id="their-list"></ul></article>`,
  list: `
    <div id="deadline-slot"></div>
    <article class="card">
      <h2>${icon("heart")} About me</h2>
      <p class="muted">Help your Santa out. Everything here is optional.</p>
      <form id="profile-form" class="profile-form" autocomplete="off">
        <div class="field full"><span class="lbl">Interests <span class="muted small">(tap to pick, up to 15)</span></span>
          <div class="chips" id="interest-chips"></div>
          <div class="row add-interest"><input id="interest-input" maxlength="30" placeholder="Add your own interest"><button type="button" class="btn ghost" id="interest-add">${icon("plus")} Add</button></div>
        </div>
        <label class="field"><span class="lbl-row">${icon("palette")} Favorite colors</span><input name="colors" maxlength="120" placeholder="Forest green, black"></label>
        <label class="field"><span class="lbl-row">${icon("candy")} Favorite snacks &amp; treats</span><input name="treats" maxlength="200" placeholder="Sour gummies, matcha"></label>
        <label class="field"><span class="lbl-row">${icon("store")} Favorite stores or brands</span><input name="stores" maxlength="200" placeholder="Uniqlo, Target, Nike"></label>
        <div class="field two">
          <label><span class="lbl-row">${icon("shirt")} Shirt / hoodie</span><input name="shirt" maxlength="20" placeholder="M"></label>
          <label><span class="lbl-row">${icon("ruler")} Shoe size</span><input name="shoe" maxlength="20" placeholder="10"></label>
        </div>
        <label class="field full"><span class="lbl-row">${icon("ban")} Please don't get me…</span><input name="avoid" maxlength="200" placeholder="Allergies, dislikes, stuff I already have"></label>
        <label class="field full"><span class="lbl-row">${icon("sparkles")} Anything else your Santa should know?</span><textarea name="notes" maxlength="500" rows="3" placeholder="Just moved into a dorm, getting into film photography…"></textarea></label>
        <div class="row full"><button class="btn primary">${icon("check")} Save about me</button><span class="muted small" id="profile-status"></span></div>
      </form>
    </article>
    <article class="card">
      <h2>${icon("list")} My wishlist</h2>
      <p class="muted">Specific things you'd love. Add a price so your Santa knows what fits the budget.</p>
      <form id="wish-form" class="wish-form">
        <input id="wish-text" maxlength="200" placeholder="e.g. Cozy socks, size M" autocomplete="off">
        <input id="wish-url" maxlength="500" placeholder="Link (optional)" inputmode="url" autocomplete="off">
        <div class="money-input"><span>$</span><input id="wish-price" type="number" min="0" max="10000" step="0.01" inputmode="decimal" placeholder="Price"></div>
        <button class="btn primary">${icon("plus")} Add</button>
      </form>
      <ul class="wishlist" id="my-list"></ul>
    </article>`,
  everyone: `
    <article class="card"><h2>${icon("sled")} Workshop progress</h2><div id="progress"></div></article>
    <article class="card"><h2>${icon("users")} The crew</h2><p class="muted">Tap anyone who has joined to see their interests and wishlist.</p><div class="crew" id="crew"></div></article>`,
  admin: `
    <article class="card"><h2>${icon("calendar")} Event details</h2>
      <form id="event-form" class="form-grid">
        <label>Date<input type="date" id="ev-date"></label>
        <label>Start time <span class="muted small">(optional)</span><input type="time" id="ev-time"></label>
        <label>Location<input id="ev-loc" maxlength="120" placeholder="TBD"></label>
        <label>Budget per gift ($)<input id="ev-budget" type="number" min="0" max="10000" step="1" inputmode="numeric" placeholder="35"></label>
        <label>Wishlist deadline<input id="ev-deadline" type="date"></label>
        <span></span>
        <label class="full">Notes<textarea id="ev-notes" maxlength="500" rows="3" placeholder="Dress code, potluck, etc."></textarea></label>
        <div class="row full"><button class="btn primary">Save details</button><button type="button" class="btn ghost" id="ev-tbd">Clear time</button></div>
      </form>
    </article>
    <article class="card"><h2>${icon("key")} Group code</h2>
      <p class="muted">People need this to claim a name. Share it in the group chat, not on the site.</p>
      <form id="code-form" class="row"><input id="code-input" minlength="4" maxlength="40" required placeholder="New code" autocomplete="off"><button class="btn primary">Save code</button></form>
      <p id="code-current" class="muted small"></p>
    </article>
    <article class="card"><h2>${icon("dice")} The draw</h2>
      <p id="draw-status"></p>
      <ol class="steps">
        <li>On GitHub, open your repo, then <b>Actions</b>, then <b>Draw names</b>.</li>
        <li>Click <b>Run workflow</b> and type <b>DRAW</b> to confirm.</li>
        <li>Everyone who joined gets an email. Nobody, including you, can see the pairs.</li>
      </ol>
    </article>
    <article class="card"><h2>${icon("undo")} Fix a mistake</h2>
      <p class="muted">Someone picked the wrong name? Release it so the right person can claim it.</p>
      <div class="row"><select id="release-sel"></select><button class="btn danger" id="release-btn">Release name</button></div>
    </article>`,
};

function showTab() {
  const v = $("#view");
  if (!v) return;
  if (S.tab === "admin" && !S.isAdmin) S.tab = "home";
  v.innerHTML = VIEWS[S.tab];
  v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter");
  if (S.tab === "home") { updateAssignment(); updateEvent(); updateProgress(); updateBudget(); updateTheirProfile(); }
  if (S.tab === "list") { bindWishForm(); updateMyList(); S.profileDirty = false; bindProfileForm(); fillProfileForm(); }
  if (S.tab === "everyone") { updateProgress(); updateCrew(); }
  if (S.tab === "admin") bindAdmin();
  updateDeadline();
  $$(".tilt", v).forEach(tilt);
}

function onPeople() {
  updatePicker();
  updateProgress();
  updateCrew();
  updateBoughtBtn();
  fillReleaseSelect();
}

// ---------- assignment / reveal ----------
const revealKey = () => `ss-revealed:${S.me}:${S.recipient}`;
const isRevealed = () => store.get(revealKey()) === "1";

function updateAssignment() {
  const el = $("#assignment");
  if (!el) return;
  if (el.dataset.state === "rolling") return;
  if (S.recipient === undefined) { el.innerHTML = `<div class="loader small">${icon("snowflake")}</div>`; return; }
  if (!S.recipient) {
    el.dataset.state = "wait";
    el.innerHTML = `<div class="waiting">
      <div class="float-gift">${icon("gift")}</div>
      <p><b>The elves haven't drawn names yet.</b></p>
      <p class="muted">You'll get an email the moment they do. Meanwhile, fill out your wishlist!</p>
      <button class="btn ghost" id="goto-list">Edit my wishlist ${icon("arrow")}</button></div>`;
    $("#goto-list").onclick = () => goTab("list");
    updateTheirList(); updateTheirProfile();
    return;
  }
  if (!isRevealed()) {
    el.dataset.state = "wrapped";
    el.innerHTML = `<div class="unwrap">
      <div class="gift-stage">
        <svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-bg" cx="60" cy="60" r="56"/><circle class="ring-fg" cx="60" cy="60" r="56" pathLength="100"/></svg>
        <button class="giftbox" id="giftbox" aria-label="Press and hold to unwrap your assignment">
          <span class="lid"><span class="bow"></span></span><span class="box"></span><span class="rays"></span>
        </button>
      </div>
      <p class="hint">Press and hold the present to unwrap</p></div>`;
    bindUnwrap();
    updateTheirList(); updateTheirProfile();
    return;
  }
  const state = "revealed:" + S.recipient;
  if (el.dataset.state !== state) {
    el.dataset.state = state;
    el.innerHTML = `<div class="revealed">
      <p class="muted">You're the Secret Santa for</p>
      <div class="reveal-name">${[...S.recipient].map((c, i) => `<span style="--i:${i}">${esc(c)}</span>`).join("")}</div>
      <p class="shh">${icon("eye-off")} Keep it secret!</p>
      <div id="bought-wrap"></div></div>`;
  }
  updateBoughtBtn();
  updateTheirList();
  updateTheirProfile();
}

function bindUnwrap() {
  const b = $("#giftbox"), ring = $(".ring-fg"), stage = $(".gift-stage"), hint = $(".unwrap .hint");
  let raf = 0, start = 0, done = false, lastStep = -1;
  const set = (p) => { stage.style.setProperty("--p", p); ring.style.strokeDashoffset = 100 - p * 100; };
  const step = (t) => {
    const p = Math.min(1, (t - start) / 1400);
    set(p);
    const s = Math.floor(p * 10);
    if (s !== lastStep) { lastStep = s; chime(PENTA[s % PENTA.length], 0, 0.04); sleighShake(1 + Math.floor(p * 4), 0.04 + p * 0.07); if (s) sparkleAt(b); }
    if (p >= 1) finish(); else raf = requestAnimationFrame(step);
  };
  const down = (e) => {
    if (done) return;
    e.preventDefault();
    b.setPointerCapture?.(e.pointerId);
    start = performance.now(); lastStep = -1;
    stage.classList.add("holding");
    hint.textContent = "Keep holding…";
    raf = requestAnimationFrame(step);
  };
  const up = () => {
    if (done) return;
    cancelAnimationFrame(raf);
    stage.classList.remove("holding");
    set(0);
    hint.textContent = "Press and hold the present to unwrap";
  };
  b.addEventListener("pointerdown", down);
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((ev) => b.addEventListener(ev, up));
  b.addEventListener("contextmenu", (e) => e.preventDefault());
  b.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && !done) { e.preventDefault(); finish(); } });
  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    stage.classList.remove("holding");
    b.classList.add("open");
    flash(); whoosh(); jingle(); fireworks(3);
    const r = b.getBoundingClientRect();
    confetti(r.left + r.width / 2, r.top + r.height / 3, 160);
    setTimeout(async () => {
      const el = $("#assignment");
      if (el) el.dataset.state = "rolling";
      await runSlot({ names: NAMES, me: S.me, recipient: S.recipient, fx: { slotSfx, fireworks, confetti, flash, giftRain, cannons, sleighShake } });
      store.set(revealKey(), "1");
      const el2 = $("#assignment");
      if (el2) el2.dataset.state = "";
      updateAssignment();
    }, 750);
  }
}

function roulette() {
  const el = $("#assignment");
  if (!el) return;
  el.dataset.state = "rolling";
  el.innerHTML = `<div class="revealed"><p class="muted">You're the Secret Santa for</p>
    <div class="reel"><div class="reel-name" id="reel"></div></div><p class="muted small">Spinning the naughty-or-nice wheel…</p></div>`;
  const reel = $("#reel");
  const pool = NAMES.filter((n) => n !== S.me);
  const total = 30;
  let i = 0, last = "";
  const spin = () => {
    if (!reel.isConnected) return;
    const final = i >= total;
    let n = final ? S.recipient : pool[Math.floor(Math.random() * pool.length)];
    if (!final && n === last) n = pool[(pool.indexOf(n) + 1) % pool.length];
    last = n;
    reel.textContent = n;
    reel.classList.remove("tick"); void reel.offsetWidth; reel.classList.add("tick");
    if (final) tada(); else reelTick(i, total);
    if (final) {
      store.set(revealKey(), "1");
      setTimeout(() => {
        el.dataset.state = "";
        updateAssignment();
        flash(); fireworks(6); sleighShake(8, 0.08);
        confetti(innerWidth / 2, innerHeight / 3, 220);
      }, 650);
      return;
    }
    i++;
    setTimeout(spin, 45 + Math.pow(i / total, 3) * 420);
  };
  spin();
}

function updateBoughtBtn() {
  const w = $("#bought-wrap");
  if (!w) return;
  const bought = !!S.people[S.me]?.bought;
  w.innerHTML = `<button class="btn big ${bought ? "done" : "primary"}" id="bought-btn">${bought ? `${icon("check-circle")} Gift bought!` : `${icon("bag")} I bought the gift`}</button>
    ${bought ? `<p class="muted small">Tap again to undo.</p>` : ""}`;
  $("#bought-btn").onclick = toggleBought;
}

async function toggleBought(e) {
  const btn = e.currentTarget;
  const now = !S.people[S.me]?.bought;
  btn.disabled = true;
  try {
    await api.setBought(S.me, now);
    if (now) {
      const r = btn.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top, 220);
      fireworks(2);
      jingle();
      setTimeout(askSpent, 900);
    }
  } catch {
    btn.disabled = false;
    toast("Couldn't update. Try again.", "bad");
  }
}

// ---------- wishlists ----------
function priceTag(price) {
  if (typeof price !== "number") return "";
  const B = budgetNum(), over = B && price > B;
  return `<span class="price ${over ? "over" : "ok"}" title="${over ? "Over the budget" : "Within budget"}">${icon("tag")}${money(price)}${over ? `<em>over budget</em>` : ""}</span>`;
}
function itemHTML(it, i, editable) {
  const url = safeUrl(it.url);
  const host = url ? new URL(url).hostname.replace(/^www\./, "") : "";
  return `<li class="wish" style="--i:${i}">
    ${url ? `<img class="fav" alt="" src="https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}">` : `<span class="fav star">${icon("star")}</span>`}
    <div class="wish-body">
      <div class="wish-text">${esc(it.text || host)}</div>
      ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(host)} ${icon("external")}</a>` : ""}
    </div>
    ${priceTag(it.price)}
    ${editable ? `<button class="icon-btn del" data-i="${i}" aria-label="Remove">${icon("x")}</button>` : ""}
  </li>`;
}

function updateTheirList() {
  const card = $("#their-list-card");
  if (!card) return;
  const show = !!S.recipient && isRevealed();
  card.hidden = !show;
  if (!show) return;
  $$(".their-name").forEach((e) => (e.textContent = S.recipient));
  $("#their-list").innerHTML = S.theirList.length
    ? S.theirList.map((it, i) => itemHTML(it, i, false)).join("")
    : `<li class="empty">${esc(S.recipient)} hasn't added anything yet. Check back soon, or go full detective.</li>`;
}

function updateTheirProfile() {
  const card = $("#their-profile-card");
  if (!card) return;
  const show = !!S.recipient && isRevealed();
  card.hidden = !show;
  if (!show) return;
  $$(".their-name").forEach((e) => (e.textContent = S.recipient));
  $("#their-profile").innerHTML = profileHTML(S.theirProfile, S.recipient) + ideasHTML(S.theirProfile);
}

function profileHTML(p, name) {
  p = p || {};
  const ints = (p.interests || []).filter(Boolean);
  const rows = [["palette", "Favorite colors", p.colors], ["candy", "Snacks & treats", p.treats], ["store", "Stores & brands", p.stores],
    ["shirt", "Shirt / hoodie", p.shirt], ["ruler", "Shoe size", p.shoe]].filter((r) => r[2]);
  if (!ints.length && !rows.length && !p.avoid && !p.notes) return `<p class="empty">${esc(name)} hasn't filled this out yet.</p>`;
  return `${ints.length ? `<div class="chips static">${ints.map((t) => `<span class="chip on">${esc(t)}</span>`).join("")}</div>` : ""}
    ${rows.length ? `<dl class="facts">${rows.map(([ic, l, v]) => `<div><dt>${icon(ic)} ${l}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    ${p.avoid ? `<div class="avoid">${icon("ban")}<div><b>Please don't get:</b> ${esc(p.avoid)}</div></div>` : ""}
    ${p.notes ? `<p class="notes">${esc(p.notes)}</p>` : ""}`;
}

function ideasHTML(p) {
  const ints = (p?.interests || []).filter(Boolean).slice(0, 8);
  if (!ints.length) return "";
  const B = budgetNum();
  return `<div class="ideas"><h3>${icon("search")} Gift idea search${B ? ` under ${money(B)}` : ""}</h3><div class="idea-list">${ints.map((t) => {
    const q = encodeURIComponent(t + " gift");
    const amz = `https://www.amazon.com/s?k=${q}${B ? `&rh=p_36%3A0-${Math.round(B * 100)}` : ""}`;
    const etsy = `https://www.etsy.com/search?q=${q}${B ? `&max=${B}` : ""}`;
    return `<div class="idea"><span>${esc(t)}</span><a href="${amz}" target="_blank" rel="noopener noreferrer">Amazon ${icon("external")}</a><a href="${etsy}" target="_blank" rel="noopener noreferrer">Etsy ${icon("external")}</a></div>`;
  }).join("")}</div></div>`;
}

// ---------- about me form ----------
function renderChips() {
  const el = $("#interest-chips");
  if (!el) return;
  const all = [...new Set([...S.draftInterests, ...INTEREST_IDEAS])];
  el.innerHTML = all.map((t) => `<button type="button" class="chip ${S.draftInterests.includes(t) ? "on" : ""}" data-t="${esc(t)}">${S.draftInterests.includes(t) ? icon("check") : ""}${esc(t)}</button>`).join("");
  $$(".chip", el).forEach((c) => (c.onclick = () => {
    const t = c.dataset.t;
    if (S.draftInterests.includes(t)) S.draftInterests = S.draftInterests.filter((x) => x !== t);
    else if (S.draftInterests.length >= 15) return toast("15 interests max.", "bad");
    else { S.draftInterests.push(t); chime(PENTA[S.draftInterests.length % PENTA.length], 0, 0.04); }
    markDirty();
    renderChips();
  }));
}
function markDirty() { S.profileDirty = true; const st = $("#profile-status"); if (st) st.textContent = "Unsaved changes"; }
function fillProfileForm() {
  const f = $("#profile-form");
  if (!f || S.profileDirty) return;
  const p = S.myProfile || {};
  for (const k of Object.keys(PROFILE_FIELDS)) if (f.elements[k]) f.elements[k].value = p[k] || "";
  S.draftInterests = [...(p.interests || [])];
  renderChips();
}
function bindProfileForm() {
  const f = $("#profile-form");
  f.addEventListener("input", (e) => { if (e.target.id !== "interest-input") markDirty(); });
  const addCustom = () => {
    const inp = $("#interest-input");
    const t = inp.value.trim().replace(/\s+/g, " ").slice(0, 30);
    if (!t) return;
    if (S.draftInterests.length >= 15) return toast("15 interests max.", "bad");
    if (!S.draftInterests.some((x) => x.toLowerCase() === t.toLowerCase())) S.draftInterests.push(t);
    inp.value = "";
    markDirty();
    renderChips();
  };
  $("#interest-add").onclick = addCustom;
  $("#interest-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } });
  f.onsubmit = async (e) => {
    e.preventDefault();
    const profile = {};
    if (S.draftInterests.length) profile.interests = S.draftInterests.slice(0, 15).map((t) => t.slice(0, 30));
    for (const [k, max] of Object.entries(PROFILE_FIELDS)) {
      const v = (f.elements[k].value || "").trim().slice(0, max);
      if (v) profile[k] = v;
    }
    const btn = e.submitter;
    btn.disabled = true;
    try {
      await api.saveWishlist(S.me, S.myList, profile);
      S.profileDirty = false;
      $("#profile-status").textContent = "Saved";
      chime(1760, 0, 0.07);
      sparkleAt(btn);
      toast("Saved. Your Santa thanks you.", "", "heart");
    } catch { toast("Couldn't save. Try again.", "bad"); }
    btn.disabled = false;
  };
}

// ---------- budget ----------
function updateBudget() {
  const el = $("#budget-card");
  if (!el) return;
  const B = budgetNum(), sp = S.spent;
  let meter = "";
  if (B) {
    const over = sp != null && sp > B;
    const pct = sp == null ? 0 : Math.min(100, (sp / B) * 100);
    const status = sp == null ? "Log what you spend to track it" : over ? `${money(+(sp - B).toFixed(2))} over budget` : sp === B ? "Right on budget. Nailed it." : `${money(+(B - sp).toFixed(2))} left`;
    meter = `<div class="meter ${over ? "over" : ""}"><div class="fill" style="width:${pct}%"></div></div>
      <div class="meter-row"><span>${sp == null ? "Nothing logged yet" : `You spent <b>${money(sp)}</b>`}</span><span class="${over ? "bad-txt" : "good-txt"}">${esc(status)}</span></div>`;
  }
  el.innerHTML = `<h2>${icon("cash")} Budget</h2>
    <div class="budget-big">${B ? `<span class="amt">${money(B)}</span><span class="per">max per gift</span>` : `<span class="amt">TBD</span><span class="per">The organizer hasn't set it yet</span>`}</div>
    ${meter}
    <form id="spent-form" class="spent-form">
      <div class="money-input"><span>$</span><input id="spent-input" type="number" min="0" max="10000" step="0.01" inputmode="decimal" placeholder="What did you spend?" value="${sp ?? ""}"></div>
      <button class="btn ghost">Save</button>
    </form>
    <p class="muted small">Private. Other players can't see what you spent.</p>`;
  $("#spent-form").onsubmit = (e) => { e.preventDefault(); saveSpent($("#spent-input").value); };
}
async function saveSpent(raw) {
  const v = String(raw).trim();
  const n = v === "" ? null : Math.round(parseFloat(v) * 100) / 100;
  if (n != null && (isNaN(n) || n < 0 || n > 10000)) { toast("Enter a real amount.", "bad"); return false; }
  try {
    await api.setSpent(S.user.uid, n);
    const B = budgetNum();
    toast(n == null ? "Cleared" : B && n > B ? "Saved. A little over, but generous!" : "Saved", "", "cash");
    return true;
  } catch { toast("Couldn't save. Try again.", "bad"); return false; }
}
function askSpent() {
  const B = budgetNum();
  openModal(`<h2>Nice work, Santa!</h2>
    <p class="muted">How much did you spend?${B ? ` The budget is ${money(B)}.` : ""} This stays private.</p>
    <form id="ask-spent" class="stack">
      <div class="money-input big"><span>$</span><input id="ask-spent-in" type="number" min="0" max="10000" step="0.01" inputmode="decimal" placeholder="0.00"></div>
      <div class="row end"><button type="button" class="btn ghost" data-close>Skip</button><button class="btn primary">${icon("check")} Save</button></div>
    </form>`);
  $("#ask-spent-in").focus();
  $("#ask-spent").onsubmit = async (e) => { e.preventDefault(); if (await saveSpent($("#ask-spent-in").value)) closeModal(); };
}

function updateMyList() {
  const ul = $("#my-list");
  if (!ul) return;
  ul.innerHTML = S.myList.length
    ? S.myList.map((it, i) => itemHTML(it, i, true)).join("")
    : `<li class="empty">Your list is empty. Your Santa is nervous.</li>`;
  $$(".del", ul).forEach((b) => (b.onclick = async () => {
    const items = S.myList.filter((_, i) => i !== +b.dataset.i);
    try { await api.saveWishlist(S.me, items, S.myProfile); chime(880, 0, 0.05); } catch { toast("Couldn't remove. Try again.", "bad"); }
  }));
}

function bindWishForm() {
  $("#wish-form").onsubmit = async (e) => {
    e.preventDefault();
    const text = $("#wish-text").value.trim().slice(0, 200);
    let raw = $("#wish-url").value.trim();
    if (raw && !/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    const url = raw ? safeUrl(raw) : "";
    if (raw && !url) return toast("That link looks off.", "bad");
    if (!text && !url) return toast("Add a wish or a link first.", "bad");
    if (S.myList.length >= 30) return toast("30 wishes max. Santa has limits!", "bad");
    const pv = $("#wish-price").value.trim();
    const price = pv === "" ? null : Math.round(parseFloat(pv) * 100) / 100;
    if (price != null && (isNaN(price) || price < 0 || price > 10000)) return toast("That price looks off.", "bad");
    const btn = e.submitter;
    btn.disabled = true;
    try {
      const item = { text, url };
      if (price != null) item.price = price;
      await api.saveWishlist(S.me, [...S.myList, item], S.myProfile);
      const B = budgetNum();
      if (price != null && B && price > B) toast(`Heads up: that's over the ${money(B)} budget.`, "bad");
      e.target.reset();
      $("#wish-text").focus();
      chime(1760, 0, 0.07);
      sparkleAt(btn);
    } catch { toast("Couldn't save. Try again.", "bad"); }
    btn.disabled = false;
  };
}

// ---------- event + countdown ----------
function fmtDate(d) {
  return d.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function updateEvent() {
  const el = $("#event-card");
  if (!el) return;
  const e = S.event || {};
  const w = eventWhen();
  const d = w?.d;
  const has = !!w;
  el.innerHTML = `<h2>${icon("calendar")} The big day</h2>
    ${has ? `<div class="countdown" id="countdown"></div><p class="when">${esc(w.dayOnly ? d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) + " · time TBD" : fmtDate(d))}</p>`
          : `<div class="tbd"><span>T</span><span>B</span><span>D</span></div><p class="muted center">Date coming soon. Stay tuned!</p>`}
    <dl class="details">
      <div><dt>${icon("pin")} Where</dt><dd>${esc(e.location || "TBD")}</dd></div>
      <div><dt>${icon("cash")} Budget</dt><dd>${budgetNum() ? `${money(budgetNum())} max` : "TBD"}</dd></div>
      ${deadlineInfo() ? `<div class="wide"><dt>${icon("list")} Wishlists due</dt><dd>${esc(deadlineInfo().label)}</dd></div>` : ""}
    </dl>
    ${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ""}`;
  tickCountdown();
}
function tickCountdown() {
  const el = $("#countdown");
  const w = eventWhen();
  if (!el || !w) return;
  const diff = w.d - Date.now();
  if (diff <= 0) { el.innerHTML = `<div class="its-time">${icon("party")} It's happening!</div>`; return; }
  const parts = [[Math.floor(diff / 864e5), "days"], [Math.floor(diff / 36e5) % 24, "hrs"], [Math.floor(diff / 6e4) % 60, "min"], [Math.floor(diff / 1e3) % 60, "sec"]];
  if (el.children.length !== 4 || el.querySelector(".its-time")) el.innerHTML = parts.map(([, l]) => `<div class="cd"><b></b><span>${l}</span></div>`).join("");
  parts.forEach(([v], i) => {
    const b = el.children[i].firstElementChild, txt = String(v).padStart(2, "0");
    if (b.textContent !== txt) { b.textContent = txt; b.classList.remove("flip"); void b.offsetWidth; b.classList.add("flip"); }
  });
}

// ---------- progress + crew ----------
function updateProgress() {
  const el = $("#progress");
  if (!el) return;
  const vals = Object.values(S.people);
  const joined = vals.length, bought = vals.filter((p) => p.bought).length, N = NAMES.length;
  const pct = Math.round((bought / N) * 100);
  el.innerHTML = `<div class="progress"><div class="bar" style="width:${Math.max(pct, 4)}%"><span class="sled">${icon("sled")}</span></div></div>
    <div class="stats">
      <span><b>${joined}</b>/${N} elves joined</span>
      <span><b>${bought}</b>/${N} gifts bought</span>
    </div>
    <div class="dots" aria-hidden="true">${NAMES.map((n) => { const p = S.people[n]; return `<span class="dot ${p ? (p.bought ? "b" : "j") : ""}" title="${esc(n)}">${p?.bought ? icon("gift") : ""}</span>`; }).join("")}</div>
    <div class="dots-key"><span><i class="dot b"></i> Bought</span><span><i class="dot j"></i> Joined</span><span><i class="dot"></i> Not joined</span></div>`;
}
function updateCrew() {
  const el = $("#crew");
  if (!el) return;
  const drawn = !!S.event?.drawDone;
  el.innerHTML = NAMES.map((n, i) => {
    const p = S.people[n];
    const status = !p ? "Not joined" : !drawn ? `${icon("check")} Joined` : p.bought ? `${icon("gift")} Bought` : `${icon("bag")} Shopping`;
    return `<button class="crew-orn ${p ? "" : "ghosted"} ${p?.bought && drawn ? "bought" : ""}" data-name="${esc(n)}" style="--i:${i}" ${p ? "" : "disabled"}>
      <span class="string"></span>${ornamentSVG(n, i, { taken: !!p, photo: p?.photo, lock: false })}
      <span class="status">${status}</span></button>`;
  }).join("");
  $$(".crew-orn:not([disabled])", el).forEach((b) => {
    b.onclick = () => showWishlistModal(b.dataset.name);
    b.onpointerenter = () => spinName(b);
  });
}
function showWishlistModal(name) {
  chime(1318.5, 0, 0.06);
  let un = null;
  openModal(`<h2>${esc(name)}</h2><h3 class="sub">${icon("heart")} About</h3><div id="modal-profile"></div>
    <h3 class="sub">${icon("gift")} Wishlist</h3><ul class="wishlist" id="modal-list"><li class="empty">Loading…</li></ul>`, () => un?.());
  un = api.watchWishlist(name, (w) => {
    const ul = $("#modal-list"), pr = $("#modal-profile");
    if (pr) pr.innerHTML = profileHTML(w.profile, name);
    if (ul) ul.innerHTML = w.items.length ? w.items.map((it, i) => itemHTML(it, i, false)).join("") : `<li class="empty">Nothing here yet.</li>`;
  });
}

// ---------- admin ----------
const toLocalInput = (iso) => {
  const d = new Date(iso);
  if (!iso || isNaN(d)) return "";
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
function bindAdmin() {
  const e = S.event || {};
  {
    const raw = e.date || DEFAULTS.date || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) { $("#ev-date").value = raw; $("#ev-time").value = ""; }
    else if (raw) { const loc = toLocalInput(raw); $("#ev-date").value = loc.slice(0, 10); $("#ev-time").value = loc.slice(11, 16); }
  }
  $("#ev-loc").value = e.location || "";
  $("#ev-budget").value = budgetNum() ?? "";
  $("#ev-deadline").value = deadlineStr();
  $("#ev-notes").value = e.notes || "";
  $("#event-form").onsubmit = async (ev) => {
    ev.preventDefault();
    const dv = $("#ev-date").value, tv = $("#ev-time").value;
    try {
      await api.saveEvent({
        date: !dv ? null : tv ? new Date(`${dv}T${tv}`).toISOString() : dv,
        location: $("#ev-loc").value.trim(),
        budget: $("#ev-budget").value.trim() === "" ? null : Math.max(0, Math.round(+$("#ev-budget").value)),
        wishlistDeadline: $("#ev-deadline").value || null,
        notes: $("#ev-notes").value.trim(),
      });
      toast("Event details saved", "", "check-circle"); confetti(innerWidth / 2, 200, 60);
    } catch { toast("Save failed. Are you the admin?", "bad"); }
  };
  $("#ev-tbd").onclick = () => { $("#ev-time").value = ""; toast("Time cleared. Hit Save to keep just the day."); };

  const showCode = (c) => ($("#code-current").innerHTML = c ? `<span>Current code: <b>${esc(c)}</b></span>` : `${icon("alert")}<span>No code set yet. Nobody can join until you set one.</span>`);
  api.getJoinCode().then(showCode).catch(() => showCode(""));
  $("#code-form").onsubmit = async (ev) => {
    ev.preventDefault();
    const c = $("#code-input").value.trim();
    try { await api.setJoinCode(c); showCode(c); ev.target.reset(); toast("Group code saved", "", "key"); }
    catch { toast("Couldn't save code.", "bad"); }
  };

  fillReleaseSelect();
  $("#release-btn").onclick = () => {
    const n = $("#release-sel").value;
    if (!n) return;
    openModal(`<h2>Release <span class="hl">${esc(n)}</span>?</h2>
      <p class="muted">Their account gets unlinked so someone else can claim the name. Their wishlist stays.</p>
      <div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="confirm-release">Release</button></div>`);
    $("#confirm-release").onclick = async () => {
      try { await api.releaseName(n); closeModal(); toast(`${n} is available again.`); }
      catch { toast("Couldn't release.", "bad"); }
    };
  };
  updateDrawStatus();
}
function fillReleaseSelect() {
  const sel = $("#release-sel");
  if (!sel) return;
  const taken = NAMES.filter((n) => S.people[n]);
  sel.innerHTML = taken.length ? taken.map((n) => `<option>${esc(n)}</option>`).join("") : `<option value="">Nobody has joined yet</option>`;
}
function updateDrawStatus() {
  const el = $("#draw-status");
  if (!el) return;
  const e = S.event || {};
  const when = e.drawnAt?.toDate ? e.drawnAt.toDate() : null;
  el.innerHTML = e.drawDone
    ? `${icon("check-circle")}<span><b>Names have been drawn</b>${when ? ` on ${esc(when.toLocaleDateString())}` : ""}.</span>`
    : `${icon("clock")}<span><b>Not drawn yet.</b> ${Object.keys(S.people).length}/${NAMES.length} have joined.</span>`;
}

// ---------- modal ----------
let modalClose = null;
function openModal(html, onClose) {
  const m = $("#modal");
  m.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><button class="icon-btn x" data-close aria-label="Close">${icon("x")}</button>${html}</div>`;
  m.classList.remove("hidden");
  modalClose = onClose || null;
  m.onclick = (e) => { if (e.target === m || e.target.closest("[data-close]")) closeModal(); };
}
function closeModal() {
  const m = $("#modal");
  if (m.classList.contains("hidden")) return;
  m.classList.add("hidden");
  m.innerHTML = "";
  modalClose?.();
  modalClose = null;
}
