// The big reveal: a Christmas slot machine with a lever, 3D reels and a jackpot finale.
import { icon } from "./icons.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const SYMBOLS = [
  ["gift", "#ff3b5c"], ["tree", "#22c55e"], ["star", "#ffd166"], ["bell", "#ffb020"], ["candy", "#ff5c8a"],
  ["snowflake", "#4cc9f0"], ["sled", "#c77dff"], ["heart", "#ff3b5c"], ["sparkles", "#ffd166"], ["tree", "#22c55e"],
];
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

    // ---- build reels: flat strips that slide straight down, like a real slot machine ----
    const drums = [...ov.querySelectorAll(".drum")];
    // strip lengths: the middle reel (names) runs longest. Item 1 is where each reel lands.
    const COUNT = [22, 42, 30];
    const reels = drums.map((drum, r) => {
      const faces = [];
      for (let i = 0; i < COUNT[r]; i++) {
        const f = document.createElement("div");
        f.className = "face";
        if (r === 1) {
          // no name shows twice in a row
          let n = i === 1 ? recipient : pick();
          while (i !== 1 && pool.length > 2 && (n === faces[i - 1]?.textContent || (i === 0 && n === recipient) || (i === 2 && n === recipient))) n = pick();
          setName(f, n);
        }
        else { const [ic, col] = i === 1 ? SYMBOLS[0] : SYMBOLS[(i + r * 3) % SYMBOLS.length]; f.innerHTML = icon(ic); f.style.color = col; }
        drum.appendChild(f);
        faces.push(f);
      }
      // start near the bottom of the strip; spinning moves toward item 1 so names roll downward
      return { drum, faces, pos: COUNT[r] - 2, stopped: true };
    });
    let itemH = 60, reelH = 150;
    const layout = () => {
      reelW = drums[1].parentElement.clientWidth || 300;
      reelH = drums[1].parentElement.clientHeight || 150;
      itemH = reelH * 0.42;
      reels.forEach((rl, r) => rl.faces.forEach((f, i) => {
        f.style.height = `${itemH}px`;
        f.style.top = `${i * itemH}px`;
        if (r === 1) setName(f, f.textContent);
      }));
      reels.forEach(render);
    };
    function render(rl) {
      const y = reelH / 2 - (rl.pos * itemH + itemH / 2);
      rl.drum.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    }
    layout();
    addEventListener("resize", layout);

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
      const DUR = [2600, 5200, 3600];
      reels.forEach((rl, r) => {
        rl.start = now + r * 120;
        rl.dur = DUR[r];
        rl.from = rl.pos;
        rl.to = 1;
        rl.stopped = false;
        rl.lastIdx = Math.round(rl.pos);
      });
      let drumroll = false;
      const tick = () => {
        const t = performance.now();
        let maxSpeed = 0, allDone = true;
        reels.forEach((rl, r) => {
          if (rl.stopped) return;
          allDone = false;
          const k = Math.max(0, Math.min(1, (t - rl.start) / rl.dur));
          const prev = rl.pos;
          rl.pos = rl.from + (rl.to - rl.from) * easeOut(k);
          const speed = Math.abs(rl.pos - prev);
          maxSpeed = Math.max(maxSpeed, Math.min(1, speed * 2));
          const idx = Math.round(rl.pos);
          if (idx !== rl.lastIdx) {
            rl.lastIdx = idx;
            if (r === 1 || speed < 0.25) fx.slotSfx.tick(Math.min(1, speed * 2), r === 1 ? 1.2 : 0.8);
          }
          render(rl);
          if (r === 1 && !drumroll && k > 0.55) { drumroll = true; fx.slotSfx.drumroll((rl.dur * 0.45) / 1000); }
          if (k >= 1) {
            rl.stopped = true;
            rl.pos = rl.to;
            render(rl);
            rl.drum.parentElement.classList.add("locked");
            fx.slotSfx.stop(r === 1);
          }
        });
        whir?.set?.(maxSpeed);
        if (!allDone) requestAnimationFrame(tick);
        else { whir?.stop?.(); win(); }
      };
      requestAnimationFrame(tick);
    }

    // ---- jackpot ----
    function win() {
      ov.classList.remove("spinning");
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
