// The "Who are you?" screen: glass ornaments hanging from pine garlands, with swing physics.
import { icon } from "./icons.js";

const ORN_COLORS = ["#e3263f", "#1f9d55", "#2f6fe0", "#d9a21b", "#8e44ad", "#e86a92", "#0fa3a3", "#d35400", "#3d5afe", "#c0392b"];
const NOTES = [1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093, 2349.32, 2637.02];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" ? x.href : ""; } catch { return ""; } };

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const SHAPES = {
  round: "M60 42 A47 47 0 1 1 59.9 42Z",
  tear: "M60 40 C96 52 108 98 82 126 C74 135 66 140 60 150 C54 140 46 135 38 126 C12 98 24 52 60 40Z",
  onion: "M60 40 C98 56 108 96 80 120 C70 128 63 136 60 152 C57 136 50 128 40 120 C12 96 22 56 60 40Z",
  egg: "M60 40 C94 40 106 80 104 100 C102 126 84 140 60 140 C36 140 18 126 16 100 C14 80 26 40 60 40Z",
};
const SHAPE_KEYS = ["round", "tear", "egg", "onion"];

export function ornamentSVG(name, i, { taken = false, photo = "", big = false, lock = taken } = {}) {
  const id = `o${i}${Math.random().toString(36).slice(2, 7)}`;
  const color = ORN_COLORS[i % ORN_COLORS.length];
  const shape = SHAPES[SHAPE_KEYS[i % SHAPE_KEYS.length]];
  const pat = i % 4;
  const fs = Math.min(24, 175 / (name.length + 1.4));
  const bandY = 86;
  const shapeW = { round: 90, egg: 86, tear: 72, onion: 74 }[SHAPE_KEYS[i % SHAPE_KEYS.length]];
  const fitLen = Math.min(shapeW * 0.8, name.length * fs * 0.6);
  const pic = taken ? safeUrl(photo) : "";
  let pattern = "";
  if (pat === 0) pattern = `<g opacity=".35" fill="#fff">${[70, 84, 108, 122].map((y, k) => `<rect x="0" y="${y}" width="120" height="${k % 2 ? 3 : 6}"/>`).join("")}</g>`;
  if (pat === 1) pattern = `<g fill="#fff">${Array.from({ length: 34 }, (_, k) => `<circle cx="${(k * 37) % 110 + 6}" cy="${44 + ((k * 53) % 100)}" r="${(k % 3) * 0.7 + 0.8}" opacity="${0.35 + (k % 4) * 0.15}"/>`).join("")}</g>`;
  if (pat === 2) pattern = `<rect x="0" y="62" width="120" height="14" fill="url(#gold${id})" opacity=".9"/><path d="M0 69 l6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5" fill="none" stroke="#fff6d0" stroke-width="1.6"/><rect x="0" y="112" width="120" height="6" fill="url(#gold${id})" opacity=".8"/>`;
  if (pat === 3) pattern = `<g fill="none" stroke="#fff" stroke-width="2.5" opacity=".35"><path d="M10 60 C40 80 80 50 110 72"/><path d="M8 92 C40 112 80 82 112 104"/><path d="M14 124 C40 140 80 116 106 134"/></g>`;
  return `<svg class="orn-svg" viewBox="0 0 120 160" aria-hidden="true">
    <defs>
      <radialGradient id="b${id}" cx=".38" cy=".38" r=".75"><stop offset="0" stop-color="${shade(color, 0.55)}"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="${shade(color, -0.6)}"/></radialGradient>
      <linearGradient id="gold${id}" x1="0" x2="1"><stop offset="0" stop-color="#9c7a1f"/><stop offset=".45" stop-color="#ffe9a8"/><stop offset=".7" stop-color="#e7c25a"/><stop offset="1" stop-color="#9c7a1f"/></linearGradient>
      <radialGradient id="h${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <clipPath id="c${id}"><path d="${shape}"/></clipPath>
      <path id="arc${id}" d="M6 ${bandY} Q60 ${bandY + 26} 114 ${bandY}"/>
      <linearGradient id="fade${id}" x1="0" x2="1"><stop offset=".08" stop-color="#fff" stop-opacity="0"/><stop offset=".22" stop-color="#fff"/><stop offset=".78" stop-color="#fff"/><stop offset=".92" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="m${id}"><rect x="0" y="0" width="120" height="160" fill="url(#fade${id})"/></mask>
    </defs>
    <path class="orn-shadow" d="${shape}" transform="translate(4 6)" fill="#000" opacity=".25"/>
    <g class="orn-glass">
      <path d="${shape}" fill="url(#b${id})"/>
      <g clip-path="url(#c${id})">
        ${pattern}
        ${pic ? `<image href="${esc(pic)}" x="10" y="42" width="100" height="100" preserveAspectRatio="xMidYMid slice" opacity=".75"/><rect x="0" y="0" width="120" height="160" fill="#dfe9ff" opacity=".35"/>` : ""}
        <ellipse cx="96" cy="118" rx="26" ry="34" fill="#fff" opacity=".08"/>
      </g>
      <ellipse class="orn-hi" cx="40" cy="70" rx="11" ry="19" transform="rotate(32 40 70)" fill="url(#h${id})"/>
      <circle cx="${48}" cy="${57}" r="3" fill="#fff" opacity=".9"/>
      <path d="${shape}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"/>
    </g>
    <circle cx="60" cy="22" r="6" fill="none" stroke="url(#gold${id})" stroke-width="2.4"/>
    <rect x="47" y="27" width="26" height="15" rx="3" fill="url(#gold${id})"/>
    <path d="M51 29 v11 M56 29 v11 M61 29 v11 M66 29 v11 M71 29 v11" stroke="#8a6a1a" stroke-width="1" opacity=".55"/>
    <g class="orn-band" clip-path="url(#c${id})" mask="url(#m${id})">
      <path d="M0 ${bandY - fs * 0.95} Q60 ${bandY + 26 - fs * 0.95} 120 ${bandY - fs * 0.95}" fill="none" stroke="#ffe9a8" stroke-width="1.6" opacity=".75"/>
      <path d="M0 ${bandY + fs * 0.42} Q60 ${bandY + 26 + fs * 0.42} 120 ${bandY + fs * 0.42}" fill="none" stroke="#ffe9a8" stroke-width="1.6" opacity=".75"/>
      <text class="orn-name" font-size="${fs}" text-anchor="middle" dominant-baseline="auto">
        <textPath href="#arc${id}" startOffset="50%" textLength="${fitLen.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(name)}
          <animate class="spin-a" attributeName="startOffset" from="50%" to="165%" dur="1.4s" begin="indefinite" fill="freeze" calcMode="spline" keySplines=".45 0 .25 1" keyTimes="0;1"/>
          <animate class="spin-reset" attributeName="startOffset" to="50%" dur="0.01s" begin="indefinite" fill="freeze"/>
        </textPath>
      </text>
      <text class="orn-name" font-size="${fs}" text-anchor="middle">
        <textPath href="#arc${id}" startOffset="-65%" textLength="${fitLen.toFixed(1)}" lengthAdjust="spacingAndGlyphs">${esc(name)}
          <animate class="spin-b" attributeName="startOffset" from="-65%" to="50%" dur="1.4s" begin="indefinite" fill="freeze" calcMode="spline" keySplines=".45 0 .25 1" keyTimes="0;1"/>
          <animate class="spin-reset2" attributeName="startOffset" to="-65%" dur="0.01s" begin="indefinite" fill="freeze"/>
        </textPath>
      </text>
    </g>
    ${lock ? `<g class="orn-lock" transform="translate(84 128)"><circle r="11" fill="#0b1430" stroke="#fff" stroke-opacity=".5"/><path d="M-4.5 -1 h9 v7 h-9z M-3 -1 v-3 a3 3 0 0 1 6 0 v3" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></g>` : ""}
    <g class="glints" fill="#fff">
      <path d="M30 52 l2 -7 2 7 7 2 -7 2 -2 7 -2 -7 -7 -2z"/><path d="M92 96 l1.5 -5 1.5 5 5 1.5 -5 1.5 -1.5 5 -1.5 -5 -5 -1.5z"/><path d="M74 132 l1.2 -4 1.2 4 4 1.2 -4 1.2 -1.2 4 -1.2 -4 -4 -1.2z"/>
    </g>
  </svg>`;
}

// Spin the name all the way around the ornament (it slides off one side and back in from the other)
export function spinName(root) {
  if (root._spinning || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = root.querySelector(".spin-a"), b = root.querySelector(".spin-b");
  if (!a?.beginElement) return;
  root._spinning = true;
  a.beginElement(); b.beginElement();
  setTimeout(() => {
    // B now sits in front; snap A back to the front and B back out of view in the same frame
    root.querySelector(".spin-reset")?.beginElement();
    root.querySelector(".spin-reset2")?.beginElement();
    setTimeout(() => (root._spinning = false), 250);
  }, 1450);
}

// ---------- garland between hang points ----------
const NS = "http://www.w3.org/2000/svg";
function garlandSVG(width, xs) {
  const Y = 18;
  const pts = [-30, ...xs, width + 30];
  let d = `M${pts[0]} ${Y}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    d += ` Q${(a + b) / 2} ${Y + Math.min(34, (b - a) * 0.22)} ${b} ${Y}`;
  }
  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", d);
  const len = p.getTotalLength();
  let needles = "";
  const greens = ["#0f5a2e", "#16743c", "#1f8a4a", "#2aa35a"];
  for (let s = 0; s < len; s += 3.2) {
    const q = p.getPointAtLength(s);
    for (let n = 0; n < 2; n++) {
      const ang = Math.random() * Math.PI * 2, l = 6 + Math.random() * 6;
      needles += `<line x1="${q.x.toFixed(1)}" y1="${q.y.toFixed(1)}" x2="${(q.x + Math.cos(ang) * l).toFixed(1)}" y2="${(q.y + Math.sin(ang) * l).toFixed(1)}" stroke="${greens[(Math.random() * 4) | 0]}"/>`;
    }
  }
  let lights = "";
  const cols = ["#ff4d6d", "#ffd166", "#4cc9f0", "#7cf29c", "#c77dff", "#ff9f1c"];
  let li = 0;
  for (let s = 14; s < len; s += 34) {
    const q = p.getPointAtLength(s);
    const c = cols[li % cols.length];
    lights += `<circle cx="${q.x.toFixed(1)}" cy="${(q.y + 4).toFixed(1)}" r="3.6" fill="${c}" class="g-light" style="--d:${((li * 0.31) % 2).toFixed(2)}s;--c:${c}"/>`;
    li++;
  }
  const bows = xs.map((x) => `<g transform="translate(${x.toFixed(1)} ${Y - 2})" class="g-bow">
      <path d="M0 0 C-14 -12 -22 2 -12 6 C-6 8 -2 4 0 0Z M0 0 C14 -12 22 2 12 6 C6 8 2 4 0 0Z" fill="#d7263d" stroke="#8f0f22" stroke-width="1"/>
      <path d="M-2 2 l-6 14 4 -2 2 4z M2 2 l6 14 -4 -2 -2 4z" fill="#c1121f"/>
      <circle r="3.6" fill="#ff4d6d"/></g>`).join("");
  return `<svg class="garland" width="${width}" height="70" viewBox="0 0 ${width} 70" aria-hidden="true">
    <path d="${d}" fill="none" stroke="#0b3d20" stroke-width="10" stroke-linecap="round"/>
    <g stroke-width="2" stroke-linecap="round">${needles}</g>
    <g class="g-lights">${lights}</g>${bows}</svg>`;
}

// ---------- the screen ----------
export function mountPicker(root, { names, people, onPick, chime, sleighBell }) {
  let state = { people };
  const compact = () => innerWidth < 600;
  const strings = names.map((_, i) => 26 + ((i * 37) % 5) * 14);
  root.innerHTML = `<section class="picker2">
      <div class="picker-head">
        <span class="badge">${icon("sparkles")} Almost there</span>
        <h1 class="title" id="picker-title"></h1>
        <p class="lead">Find your ornament and claim it. Once it's yours, it's locked to your Google account.</p>
        <div class="claim-count" id="claim-count"></div>
      </div>
      <div class="orn-rows" id="orn-rows"></div>
    </section>`;
  const rowsEl = root.querySelector("#orn-rows");
  const phys = new Map(); // name -> {a, v, el}

  function build() {
    const W = rowsEl.clientWidth || innerWidth - 40;
    const per = compact() ? Math.max(3, Math.min(4, Math.floor(W / 86))) : Math.max(4, Math.min(6, Math.floor(W / 150)));
    lastW = innerWidth;
    rowsEl.innerHTML = "";
    phys.clear();
    for (let r = 0; r < names.length; r += per) {
      const row = document.createElement("div");
      row.className = "orn-row";
      row.innerHTML = names.slice(r, r + per).map((n, k) => {
        const i = r + k, p = state.people[n];
        return `<button class="orn2 ${p ? "taken" : ""}" data-name="${esc(n)}" data-i="${i}" style="--len:${Math.round(strings[i] * (compact() ? 0.6 : 1))}px;--i:${i}" ${p ? 'aria-disabled="true"' : ""} aria-label="${esc(n)}${p ? " (taken)" : ""}">
          <span class="swing"><span class="string"></span>${ornamentSVG(n, i, { taken: !!p, photo: p?.photo })}
          ${p ? `<span class="tag">${icon("lock")} Taken</span>` : ""}</span></button>`;
      }).join("");
      rowsEl.appendChild(row);
    }
    requestAnimationFrame(() => {
      for (const row of rowsEl.children) {
        const rr = row.getBoundingClientRect();
        const xs = [...row.querySelectorAll(".orn2")].map((o) => { const b = o.getBoundingClientRect(); return b.left - rr.left + b.width / 2; });
        row.insertAdjacentHTML("afterbegin", garlandSVG(rr.width, xs));
      }
      rowsEl.querySelectorAll(".orn2").forEach((o) => phys.set(o, { a: (Math.random() - 0.5) * 0.4, v: 0, sw: o.querySelector(".swing") }));
    });
    rowsEl.querySelectorAll(".orn2").forEach((o) => {
      o.addEventListener("pointerenter", () => {
        const st = phys.get(o);
        if (st) st.v += (Math.random() < 0.5 ? -1 : 1) * 0.035;
        chime(NOTES[+o.dataset.i % NOTES.length], 0, o.classList.contains("taken") ? 0.02 : 0.05);
        spinName(o);
      });
      o.addEventListener("click", () => {
        if (o.classList.contains("taken")) {
          const st = phys.get(o); if (st) st.v += 0.08;
          o.classList.remove("nope"); void o.offsetWidth; o.classList.add("nope");
          return;
        }
        onPick(o.dataset.name, +o.dataset.i, o);
      });
    });
    const claimed = names.filter((n) => state.people[n]).length;
    root.querySelector("#claim-count").innerHTML = `<b>${claimed}</b> of ${names.length} ornaments claimed <span class="cc-bar"><span style="width:${(claimed / names.length) * 100}%"></span></span>`;
  }

  // swing physics: pointer movement creates "wind"
  let lastX = null, lastT = 0, alive = true;
  const onMove = (e) => {
    const now = performance.now();
    if (lastX != null) {
      const vx = (e.clientX - lastX) / Math.max(8, now - lastT);
      for (const [o, st] of phys) {
        const b = o.getBoundingClientRect();
        const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
        const d = Math.hypot(dx, dy);
        if (d < 140) st.v += vx * 0.012 * (1 - d / 140);
      }
    }
    lastX = e.clientX; lastT = now;
  };
  addEventListener("pointermove", onMove, { passive: true });
  let breeze = 0;
  const tick = () => {
    if (!alive || !root.isConnected) { alive = false; removeEventListener("pointermove", onMove); return; }
    breeze += 0.01;
    for (const [, st] of phys) {
      st.v += -st.a * 0.012 - st.v * 0.035 + Math.sin(breeze + st.a * 3) * 0.00025;
      st.a += st.v;
      const lim = compact() ? 0.35 : 0.7;
      st.a = Math.max(-lim, Math.min(lim, st.a));
      st.sw.style.transform = `rotate(${st.a}rad)`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  let rt, lastW = innerWidth;
  // phones fire "resize" when the address bar hides/shows: only rebuild if the width really changed
  const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { if (root.isConnected && Math.abs(innerWidth - lastW) > 20) build(); }, 180); };
  addEventListener("resize", onResize);
  build();

  return {
    update(people) { state.people = people; if (root.isConnected) build(); },
    destroy() { alive = false; removeEventListener("pointermove", onMove); removeEventListener("resize", onResize); },
  };
}
