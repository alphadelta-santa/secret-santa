// The big reveal: a Christmas slot machine with a lever, 3D reels and a jackpot finale.
import { icon } from "./icons.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SYMBOLS = [
  ["gift", "#ff3b5c"], ["tree", "#22c55e"], ["star", "#ffd166"], ["bell", "#ffb020"], ["candy", "#ff5c8a"],
  ["snowflake", "#4cc9f0"], ["sled", "#c77dff"], ["heart", "#ff3b5c"], ["sparkles", "#ffd166"], ["tree", "#22c55e"],
];
const N = 10, STEP = 360 / N;
const easeOut = (t) => 1 - Math.pow(1 - t, 4);

export function runSlot({ names, me, recipient, fx }) {
  return new Promise((resolve) => {
    const pool = names.filter((n) => n !== me && n !== recipient);
    const pick = () => pool[Math.floor(Math.random() * pool.length)] || "?";
    let reelW = 300;
    const setName = (f, n) => { f.textContent = n; f.style.fontSize = `${Math.min(reelW * 0.17, (reelW * 0.86) / (n.length * 0.56))}px`; };
    const ov = document.createElement("div");
    ov.className = "slot-ov";
    const bulbs = Array.from({ length: 34 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
    ov.innerHTML = `
      <div class="slot-beams"></div>
      <div class="slot-stage">
        <div class="slot-machine">
          <div class="sm-top">
            <div class="jackpot">JACKPOT</div>
            <div class="sm-sign"><span>Secret Santa</span></div>
          </div>
          <div class="sm-body">
            <div class="bulbs">${bulbs}</div>
            <div class="sm-window">
              ${[0, 1, 2].map((r) => `<div class="sreel ${r === 1 ? "main" : "side"}"><div class="drum"></div></div>`).join("")}
              <div class="payline"></div>
              <div class="glass"></div>
            </div>
            <div class="sm-label">You're shopping for…</div>
          </div>
          <div class="sm-base"><div class="plaque">Pull the lever</div><div class="tray"></div></div>
          <div class="lever" role="button" tabindex="0" aria-label="Pull the lever">
            <div class="lever-slot"></div>
            <div class="lever-rod"><div class="lever-knob"></div></div>
            <div class="lever-hub"></div>
          </div>
        </div>
        <div class="slot-result" hidden>
          <div class="result-rays"></div>
          <p class="result-kicker">You're the Secret Santa for</p>
          <h2 class="result-name">${[...recipient].map((c, i) => `<span style="--i:${i}">${esc(c)}</span>`).join("")}</h2>
          <p class="result-shh">${icon("eye-off")} Keep it secret!</p>
          <button class="btn primary big" id="slot-done">${icon("gift")} See their wishlist</button>
        </div>
      </div>
      <div class="slot-hint">${matchMedia("(pointer: coarse)").matches ? "Tap or pull down the lever" : "Pull the lever, or press Space"}</div>`;
    document.body.appendChild(ov);
    document.body.classList.add("slot-on");
    requestAnimationFrame(() => ov.classList.add("in"));

    // ---- build reels ----
    const drums = [...ov.querySelectorAll(".drum")];
    const faceH = () => drums[1].parentElement.clientHeight * 0.42;
    const reels = drums.map((drum, r) => {
      const faces = [];
      for (let i = 0; i < N; i++) {
        const f = document.createElement("div");
        f.className = "face";
        if (r === 1) setName(f, pick());
        else { const [ic, col] = SYMBOLS[(i + r * 3) % SYMBOLS.length]; f.innerHTML = icon(ic); f.style.color = col; f.dataset.sym = ic; }
        drum.appendChild(f);
        faces.push(f);
      }
      return { drum, faces, angle: 0, target: 0, stopped: true, lastTick: 0, landing: 0 };
    });
    const layout = () => {
      reelW = drums[1].parentElement.clientWidth || 300;
      reels[1]?.faces.forEach((f) => setName(f, f.textContent));
      const h = faceH(), rad = h / 2 / Math.tan(Math.PI / N);
      reels.forEach((rl) => rl.faces.forEach((f, i) => {
        f.style.height = `${h}px`;
        f.style.marginTop = `${-h / 2}px`;
        f.style.transform = `rotateX(${i * STEP}deg) translateZ(${rad}px)`;
      }));
    };
    layout();
    addEventListener("resize", layout);
    const render = (rl, blur) => {
      rl.drum.style.transform = `rotateX(${rl.angle}deg)`;
      rl.drum.style.filter = blur > 0.3 ? `blur(${Math.min(3.5, blur * 3)}px)` : "none";
    };
    reels.forEach((rl) => render(rl, 0));

    // ---- lever ----
    const lever = ov.querySelector(".lever"), rod = ov.querySelector(".lever-rod");
    let pulled = false, dragging = false, startY = 0;
    const setPull = (p) => { rod.style.setProperty("--p", p.toFixed(3)); };
    const release = () => {
      rod.classList.add("spring");
      setPull(0);
      setTimeout(() => rod.classList.remove("spring"), 700);
    };
    const fire = () => {
      if (pulled) return;
      pulled = true;
      ov.classList.add("pulled");
      fx.slotSfx.lever();
      release();
      setTimeout(spin, 280);
    };
    lever.addEventListener("pointerdown", (e) => { if (pulled) return; dragging = true; startY = e.clientY; lever.setPointerCapture(e.pointerId); });
    lever.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = Math.max(0, Math.min(1, (e.clientY - startY) / 120));
      setPull(p);
      if (p > 0.75) { dragging = false; setPull(1); fire(); }
    });
    lever.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      // a click (no real drag) still pulls the lever all the way
      setPull(1); setTimeout(fire, 120);
    });
    const onKey = (e) => {
      if ((e.key === " " || e.key === "Enter") && !pulled) { e.preventDefault(); setPull(1); setTimeout(fire, 150); }
    };
    addEventListener("keydown", onKey);

    // ---- spin ----
    function spin() {
      ov.classList.add("spinning");
      const whir = fx.slotSfx.whir();
      const now = performance.now();
      const plan = [
        { dur: 2300, turns: 5, land: 0 },              // left: gift
        { dur: 5600, turns: 11, land: 3 },             // middle: the name (face 3)
        { dur: 3200, turns: 7, land: 0 },              // right: gift
      ];
      reels.forEach((rl, r) => {
        const p = plan[r];
        rl.start = now + r * 120;
        rl.dur = p.dur;
        rl.from = 0;
        rl.landing = p.land;
        rl.to = -(p.land * STEP) - 360 * p.turns;   // negative = names roll downward
        rl.stopped = false;
        rl.lastIdx = 0;
        if (r !== 1) {
          const [ic, col] = SYMBOLS[0];
          rl.faces[p.land].innerHTML = icon(ic); rl.faces[p.land].style.color = col;
        }
      });
      let drum = false;
      const tick = () => {
        const t = performance.now();
        let maxSpeed = 0, allDone = true;
        reels.forEach((rl, r) => {
          if (rl.stopped) return;
          allDone = false;
          const k = Math.max(0, Math.min(1, (t - rl.start) / rl.dur));
          // middle reel: extra-slow crawl at the end for suspense
          const e = r === 1 ? (k < 0.82 ? easeOut(k / 0.82) * 0.985 : 0.985 + 0.015 * easeOut((k - 0.82) / 0.18)) : easeOut(k);
          const prev = rl.angle;
          rl.angle = rl.from + (rl.to - rl.from) * e;
          const speed = Math.abs(rl.angle - prev) / 30;
          maxSpeed = Math.max(maxSpeed, speed);
          // keep the middle reel "infinite": swap names on faces while they're hidden at the back
          if (r === 1) {
            const remaining = Math.abs(rl.to - rl.angle);
            rl.faces.forEach((f, i) => {
              const rel = (((i * STEP + rl.angle) % 360) + 360) % 360;
              const atBack = rel > 130 && rel < 230;
              if (!atBack) return;
              if (i === rl.landing && remaining < 300) { if (f.textContent !== recipient) setName(f, recipient); }
              else if (f.dataset.back !== "1") setName(f, pick());
              f.dataset.back = "1";
            });
            rl.faces.forEach((f, i) => { const rel = (((i * STEP + rl.angle) % 360) + 360) % 360; if (rel < 100 || rel > 260) f.dataset.back = "0"; });
          }
          const idx = Math.floor(-rl.angle / STEP);
          if (idx !== rl.lastIdx) {
            rl.lastIdx = idx;
            if (r === 1 || speed < 0.5) fx.slotSfx.tick(Math.min(1, speed), r === 1 ? 1 + (1 - Math.min(1, speed)) * 0.5 : 0.8);
            if (r === 1 && speed < 0.25) rl.drum.parentElement.classList.toggle("nudge");
          }
          render(rl, speed);
          if (r === 1 && !drum && k > 0.55) { drum = true; fx.slotSfx.drumroll((rl.dur * 0.45) / 1000); ov.classList.add("suspense"); }
          if (k >= 1) {
            rl.stopped = true;
            rl.angle = rl.to;
            render(rl, 0);
            rl.drum.parentElement.classList.add("locked");
            fx.slotSfx.stop(r === 1);
            if (r !== 1) fx.sleighShake(3, 0.06);
          }
        });
        whir?.set?.(Math.min(1, maxSpeed));
        if (!allDone) requestAnimationFrame(tick);
        else { whir?.stop?.(); win(); }
      };
      requestAnimationFrame(tick);
    }

    // ---- jackpot ----
    function win() {
      ov.classList.remove("spinning", "suspense");
      ov.classList.add("win");
      fx.flash();
      fx.slotSfx.jackpot();
      fx.cannons();
      fx.giftRain(34);
      setTimeout(() => fx.fireworks(4), 300);
      setTimeout(() => {
        ov.classList.add("show-result");
        ov.querySelector(".slot-result").hidden = false;
        fx.confetti(innerWidth / 2, innerHeight / 2.6, 200);
      }, 1500);
      ov.querySelector("#slot-done").addEventListener("click", close);
    }
    function close() {
      ov.classList.add("out");
      removeEventListener("keydown", onKey);
      removeEventListener("resize", layout);
      setTimeout(() => { ov.remove(); document.body.classList.remove("slot-on"); resolve(); }, 600);
    }
  });
}
