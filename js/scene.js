// Hand-drawn SVG scenes: the Christmas tree with presents, and Santa's sleigh.

// ======================================================================
// TREE + PRESENTS
// ======================================================================
const C = 200; // tree center x
const LIGHT_COLORS = ["#ff4d6d", "#ffd166", "#4cc9f0", "#7cf29c", "#ff9f1c", "#c77dff"];

function tier(top, bot, hw, n) {
  const L = C - hw, R = C + hw, step = (R - L) / n;
  let sc = "";
  for (let i = 0; i < n; i++) {
    const x1 = R - step * i, x2 = R - step * (i + 1);
    sc += ` Q${((x1 + x2) / 2).toFixed(1)} ${bot + 13} ${x2.toFixed(1)} ${bot}`;
  }
  const side = top + (bot - top) * 0.6;
  const body = `M${C} ${top} Q${C + hw * 0.42} ${side} ${R} ${bot}${sc} Q${C - hw * 0.42} ${side} ${C} ${top}Z`;
  const shine = `M${C} ${top} Q${C + hw * 0.42} ${side} ${R} ${bot} L${C + hw * 0.25} ${bot + 4} Q${C + hw * 0.12} ${side} ${C} ${top}Z`;
  const snow = `M${R} ${bot}${sc}`;
  return { body, shine, snow };
}
const TIERS = [[265, 462, 192, 8], [182, 378, 162, 7], [106, 284, 128, 6], [38, 192, 92, 5]];
const hwAt = (y) => Math.max(0, ((y - 38) / 424) * 190);

function bez(p0, p1, p2, t) {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

function garland() {
  let wire = "", bulbs = "", k = 0;
  [[118, 1], [200, -1], [290, 1], [382, -1]].forEach(([y, dir]) => {
    const hw0 = hwAt(y) * 0.86, hw1 = hwAt(y + 26) * 0.86;
    const p0 = dir > 0 ? [C - hw0, y] : [C + hw0, y];
    const p2 = dir > 0 ? [C + hw1, y + 26] : [C - hw1, y + 26];
    const p1 = [C, y + 46];
    wire += `<path d="M${p0} Q${p1} ${p2}" />`;
    for (let t = 0.08; t < 0.95; t += 0.105) {
      const [x, yy] = bez(p0, p1, p2, t);
      const col = LIGHT_COLORS[k % LIGHT_COLORS.length];
      bulbs += `<circle class="t-light" cx="${x.toFixed(1)}" cy="${(yy + 3).toFixed(1)}" r="4.2" fill="${col}" style="--d:${((k * 0.37) % 2.2).toFixed(2)}s;--c:${col}"/>`;
      k++;
    }
  });
  return `<g class="t-wire" fill="none" stroke="#2a3b23" stroke-width="1.4" opacity=".8">${wire}</g><g class="t-lights">${bulbs}</g>`;
}

const ORN = [
  [184, 132, 10, "#ff3b5c"], [226, 160, 9, "#ffd166"], [160, 214, 11, "#4cc9f0"], [244, 236, 11, "#ff3b5c"],
  [192, 258, 10, "#c0c8d8"], [128, 300, 12, "#ffd166"], [272, 312, 12, "#c77dff"], [204, 336, 11, "#ff3b5c"],
  [104, 398, 13, "#4cc9f0"], [160, 420, 12, "#ff3b5c"], [252, 412, 13, "#ffd166"], [314, 420, 12, "#4cc9f0"],
  [150, 352, 10, "#c0c8d8"], [300, 372, 10, "#ff3b5c"],
];
function ornaments() {
  return ORN.map(([x, y, r, c], i) => `<g class="t-orn" style="--i:${i}">
      <line x1="${x}" y1="${y - r - 7}" x2="${x}" y2="${y - r}" stroke="#e8d28a" stroke-width="1"/>
      <rect x="${x - 3.5}" y="${y - r - 3}" width="7" height="5" rx="1.5" fill="url(#gCap)"/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="url(#gBall)"/>
      <path d="M${x - r * 0.95} ${y} Q${x} ${y + r * 0.35} ${x + r * 0.95} ${y}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.6"/>
      <ellipse cx="${x - r * 0.35}" cy="${y - r * 0.4}" rx="${r * 0.28}" ry="${r * 0.18}" fill="#fff" opacity=".85" transform="rotate(-35 ${x - r * 0.35} ${y - r * 0.4})"/>
    </g>`).join("");
}

function candyCane(x, y, flip = 1) {
  const d = `M${x} ${y + 30} V${y + 6} Q${x} ${y - 4} ${x + 8 * flip} ${y - 4} Q${x + 16 * flip} ${y - 4} ${x + 16 * flip} ${y + 5}`;
  return `<g class="t-cane"><path d="${d}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <path d="${d}" fill="none" stroke="#e3122f" stroke-width="6" stroke-linecap="round" stroke-dasharray="4 5"/></g>`;
}

function star() {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 11.5 : 27;
    pts.push(`${(C + Math.cos(a) * r).toFixed(1)},${(40 + Math.sin(a) * r).toFixed(1)}`);
  }
  let rays = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, r1 = 30, r2 = i % 2 ? 46 : 58;
    rays += `<line x1="${(C + Math.cos(a) * r1).toFixed(1)}" y1="${(40 + Math.sin(a) * r1).toFixed(1)}" x2="${(C + Math.cos(a) * r2).toFixed(1)}" y2="${(40 + Math.sin(a) * r2).toFixed(1)}"/>`;
  }
  return `<g class="t-rays" stroke="#ffe7a3" stroke-width="2" stroke-linecap="round">${rays}</g>
    <g class="t-star"><polygon points="${pts.join(" ")}" fill="url(#gStar)" stroke="#fff3c4" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="${C - 6}" cy="${32}" r="3" fill="#fff" opacity=".8"/></g>`;
}

const GIFTS = [
  // x, bottom, w, h, fill, ribbon, lidFill
  [22, 512, 84, 60, "url(#pStripe)", "#ffd166", "url(#pStripe)"],
  [298, 512, 76, 74, "url(#pDots)", "#ffffff", "url(#pDots)"],
  [112, 512, 56, 42, "#ffd166", "#e3122f", "#ffd166"],
  [238, 512, 58, 46, "url(#pStars)", "#ffd166", "url(#pStars)"],
  [366, 512, 30, 34, "#c77dff", "#ffffff", "#c77dff"],
];
function gift([x, bot, w, h, fill, rib, lid], i) {
  const top = bot - h, cx = x + w / 2;
  return `<g class="gift" data-gift="${i}" style="--d:${i * 0.35}s">
    <ellipse cx="${cx}" cy="${bot + 2}" rx="${w * 0.55}" ry="4" fill="#000" opacity=".25"/>
    <g class="g-body">
      <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="4" fill="${fill}"/>
      <rect x="${x + w * 0.78}" y="${top}" width="${w * 0.22}" height="${h}" rx="3" fill="#000" opacity=".2"/>
      <rect x="${cx - 5}" y="${top}" width="10" height="${h}" fill="${rib}"/>
      <rect x="${cx - 5}" y="${top}" width="3" height="${h}" fill="#fff" opacity=".3"/>
    </g>
    <g class="g-lid">
      <rect x="${x - 4}" y="${top - 12}" width="${w + 8}" height="14" rx="3" fill="${lid}"/>
      <rect x="${x - 4}" y="${top - 12}" width="${w + 8}" height="14" rx="3" fill="url(#gLid)"/>
      <rect x="${cx - 5}" y="${top - 12}" width="10" height="14" fill="${rib}"/>
      <ellipse cx="${cx - 11}" cy="${top - 19}" rx="11" ry="6.5" transform="rotate(-28 ${cx - 11} ${top - 19})" fill="none" stroke="${rib}" stroke-width="4.5"/>
      <ellipse cx="${cx + 11}" cy="${top - 19}" rx="11" ry="6.5" transform="rotate(28 ${cx + 11} ${top - 19})" fill="none" stroke="${rib}" stroke-width="4.5"/>
      <path d="M${cx - 2} ${top - 12} l-8 12 M${cx + 2} ${top - 12} l8 12" stroke="${rib}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${top - 13}" r="5" fill="${rib}"/>
      <circle cx="${cx - 1.5}" cy="${top - 14.5}" r="1.6" fill="#fff" opacity=".6"/>
    </g>
  </g>`;
}

export function treeSVG() {
  const tiers = TIERS.map(([t, b, hw, n], i) => {
    const { body, shine, snow } = tier(t, b, hw, n);
    return `<g class="t-tier" style="--i:${i}">
      <path d="${body}" fill="url(#gTree)"/>
      <path d="${shine}" fill="#9dffb8" opacity=".09"/>
      <path d="${body}" fill="url(#gTreeShade)"/>
      <path d="${snow}" fill="none" stroke="#f4f8ff" stroke-width="6" stroke-linecap="round" opacity=".92"/>
      <path d="${snow}" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linecap="round" transform="translate(0 3)" opacity=".7"/>
    </g>`;
  }).join("");
  return `<svg viewBox="0 0 400 530" class="tree-svg" role="img" aria-label="Christmas tree with presents">
  <defs>
    <linearGradient id="gTree" x1="0" x2="1"><stop offset="0" stop-color="#0b5a32"/><stop offset=".55" stop-color="#16884a"/><stop offset="1" stop-color="#2fb36a"/></linearGradient>
    <linearGradient id="gTreeShade" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#03140b" stop-opacity=".45"/></linearGradient>
    <radialGradient id="gBall" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
    <linearGradient id="gCap" x1="0" x2="1"><stop offset="0" stop-color="#b8962e"/><stop offset=".5" stop-color="#ffe9a8"/><stop offset="1" stop-color="#9c7a1f"/></linearGradient>
    <radialGradient id="gStar" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fffbe6"/><stop offset=".45" stop-color="#ffd166"/><stop offset="1" stop-color="#e09b1a"/></radialGradient>
    <linearGradient id="gTrunk" x1="0" x2="1"><stop offset="0" stop-color="#4a2a12"/><stop offset=".5" stop-color="#8a5126"/><stop offset="1" stop-color="#4a2a12"/></linearGradient>
    <linearGradient id="gLid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient>
    <pattern id="pStripe" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="14" height="14" fill="#e3122f"/><rect width="6" height="14" fill="#ff5c76"/></pattern>
    <pattern id="pDots" width="14" height="14" patternUnits="userSpaceOnUse"><rect width="14" height="14" fill="#13915a"/><circle cx="4" cy="4" r="2.6" fill="#b9f5cf"/><circle cx="11" cy="11" r="2.6" fill="#b9f5cf"/></pattern>
    <pattern id="pStars" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#1d4fd8"/><path d="M9 3l1.6 3.4 3.7.4-2.8 2.5.8 3.7L9 11.2 5.7 13l.8-3.7L3.7 6.8l3.7-.4z" fill="#bde0fe"/></pattern>
    <filter id="fGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="fStar" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <ellipse cx="${C}" cy="512" rx="190" ry="16" fill="#000" opacity=".22"/>
  <rect x="${C - 17}" y="452" width="34" height="40" rx="4" fill="url(#gTrunk)"/>
  <ellipse cx="${C}" cy="490" rx="128" ry="17" fill="#b3122b"/>
  <ellipse cx="${C}" cy="487" rx="128" ry="15" fill="#e3263f"/>
  <ellipse cx="${C}" cy="490" rx="128" ry="17" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="0.1 11" stroke-linecap="round"/>
  <g class="t-sway">
    ${tiers}
    ${garland()}
    <g class="t-orns">${ornaments()}</g>
    ${candyCane(108, 330)}${candyCane(270, 238, -1)}
    <g filter="url(#fStar)">${star()}</g>
  </g>
  <g class="gifts">${GIFTS.map(gift).join("")}</g>
</svg>`;
}

// ======================================================================
// SLEIGH (flies right to left)
// ======================================================================
function reindeer(x, y, lead) {
  const leg = (cls, hx, hy, dark) => `<g class="leg ${cls}"><path d="M${hx} ${hy} L${hx - 3} ${hy + 15} L${hx + 1} ${hy + 27}" fill="none" stroke="${dark ? "#5a3313" : "#7a4a22"}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M${hx - 2} ${hy + 27} h6" stroke="#2a1608" stroke-width="5" stroke-linecap="round"/></g>`;
  return `<g class="deer${lead ? " lead" : ""}" transform="translate(${x} ${y})">
    ${leg("lb2", 76, 54, true)}${leg("lf2", 36, 54, true)}
    <g class="deer-body">
      <path d="M86 40 q10 -8 12 2 q-4 6 -10 4z" fill="#f4ecdf"/>
      <ellipse cx="58" cy="46" rx="34" ry="15" fill="url(#gFur)"/>
      <ellipse cx="60" cy="54" rx="24" ry="6" fill="#d9b48a" opacity=".55"/>
      <path d="M30 42 Q22 26 20 16 L32 14 Q35 30 44 38Z" fill="url(#gFur)"/>
      <path d="M28 40 Q58 34 86 40" fill="none" stroke="#d7263d" stroke-width="5" stroke-linecap="round"/>
      <circle cx="42" cy="38.5" r="3.4" fill="url(#gBell)"/><circle cx="56" cy="37" r="3.4" fill="url(#gBell)"/><circle cx="70" cy="37.5" r="3.4" fill="url(#gBell)"/>
      <path d="M29 30 Q34 28 38 34" fill="none" stroke="#d7263d" stroke-width="4"/>
      <g class="deer-head">
        <path d="M22 8 L24 -6 M23 -1 L30 -6 M24 -5 L20 -11 M27 7 L34 -3 M31 1 L38 -1 M33 -1 L33 -8" stroke="#6b4423" stroke-width="2.6" stroke-linecap="round" fill="none"/>
        <ellipse cx="18" cy="14" rx="12" ry="8.5" fill="url(#gFur)"/>
        <path d="M24 6 q8 -6 10 2 q-5 3 -10 0z" fill="#8a5a2e"/>
        <ellipse cx="7" cy="19" rx="7" ry="5.5" fill="#c99a6a"/>
        <circle cx="16" cy="11" r="1.9" fill="#1a0e05"/><circle cx="15.4" cy="10.4" r=".6" fill="#fff"/>
        <circle class="${lead ? "rudolph" : ""}" cx="2" cy="18" r="${lead ? 4.2 : 3}" fill="${lead ? "#ff2a3d" : "#2a1608"}"/>
      </g>
    </g>
    ${leg("lb1", 80, 54, false)}${leg("lf1", 40, 54, false)}
  </g>`;
}

export function sleighSVG() {
  return `<svg class="sleigh-art" viewBox="0 -14 420 150" aria-hidden="true">
  <defs>
    <linearGradient id="gFur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a86a35"/><stop offset="1" stop-color="#6e4118"/></linearGradient>
    <radialGradient id="gBell" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff6cc"/><stop offset=".5" stop-color="#ffd166"/><stop offset="1" stop-color="#b8862b"/></radialGradient>
    <linearGradient id="gSleigh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4d6d"/><stop offset="1" stop-color="#a00f25"/></linearGradient>
    <linearGradient id="gGold" x1="0" x2="1"><stop offset="0" stop-color="#b8862b"/><stop offset=".5" stop-color="#ffe7a3"/><stop offset="1" stop-color="#b8862b"/></linearGradient>
    <linearGradient id="gCoat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3b4f"/><stop offset="1" stop-color="#b1121f"/></linearGradient>
    <radialGradient id="gNose" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff6b6b" stop-opacity=".9"/><stop offset="1" stop-color="#ff2a3d" stop-opacity="0"/></radialGradient>
  </defs>
  <circle class="nose-glow" cx="2" cy="44" r="16" fill="url(#gNose)"/>
  <path class="reins" d="M58 66 Q100 80 146 70 Q200 84 262 72" fill="none" stroke="#7a3b10" stroke-width="1.8"/>
  ${reindeer(110, 30, false)}
  ${reindeer(0, 26, true)}
  <g class="sleigh-body" transform="translate(252 32)">
    <path d="M-10 84 H128 Q150 84 148 66" fill="none" stroke="url(#gGold)" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M-10 84 Q-20 84 -18 76" fill="none" stroke="url(#gGold)" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M18 64 V84 M98 64 V84" stroke="url(#gGold)" stroke-width="3.5"/>
    <g class="sack">
      <path d="M96 30 Q92 -2 112 -6 Q136 -8 136 22 Q140 40 122 42 Q100 44 96 30Z" fill="#8a5a2e"/>
      <path d="M100 -2 Q112 6 128 -4" fill="none" stroke="#5e3a17" stroke-width="2"/>
      <rect x="102" y="-16" width="14" height="14" rx="2" fill="#4cc9f0" transform="rotate(-12 109 -9)"/>
      <rect x="117" y="-20" width="12" height="16" rx="2" fill="#22c55e" transform="rotate(10 123 -12)"/>
      <path d="M109 -16v14M117 -19l-3 14" stroke="#ffd166" stroke-width="2"/>
    </g>
    <g class="santa">
      <g class="arm-back"><path d="M58 18 Q74 22 82 34" fill="none" stroke="url(#gCoat)" stroke-width="10" stroke-linecap="round"/></g>
      <ellipse cx="68" cy="24" rx="22" ry="20" fill="url(#gCoat)"/>
      <rect x="47" y="26" width="42" height="6" rx="2" fill="#1a1a1a"/>
      <rect x="64" y="25" width="9" height="8" rx="1.5" fill="none" stroke="#ffd166" stroke-width="2"/>
      <path d="M68 6 V44" stroke="#fff" stroke-width="5" opacity=".95"/>
      <circle cx="58" cy="-6" r="11" fill="#ffd3b0"/>
      <circle cx="54" cy="-9" r="1.4" fill="#2a1608"/>
      <circle cx="50.5" cy="-4" r="2.6" fill="#ff9aa2"/>
      <path d="M46 -6 Q44 14 58 14 Q72 14 68 -2 Q62 4 56 0 Q50 4 46 -6Z" fill="#fff"/>
      <path d="M50 -3 Q55 1 60 -3" fill="none" stroke="#e8e8e8" stroke-width="2"/>
      <g class="hat"><path d="M46 -12 Q52 -34 76 -30 Q84 -28 84 -20 L70 -14Z" fill="url(#gCoat)"/>
        <circle cx="85" cy="-20" r="5" fill="#fff"/>
        <rect x="44" y="-16" width="30" height="7" rx="3.5" fill="#fff"/></g>
      <g class="arm-wave"><path d="M52 14 Q40 6 34 -10" fill="none" stroke="url(#gCoat)" stroke-width="9" stroke-linecap="round"/>
        <path d="M51 12 l-6 -5" stroke="#fff" stroke-width="9" stroke-linecap="round"/>
        <circle cx="33" cy="-13" r="6" fill="#1f7a3d"/></g>
    </g>
    <path d="M2 34 Q-14 34 -10 50 Q-4 66 18 66 H120 Q138 66 138 48 V22 Q138 8 124 10 Q110 12 114 28 L108 34Z" fill="url(#gSleigh)"/>
    <path d="M2 34 Q-14 34 -10 50 Q-4 66 18 66 H120 Q138 66 138 48 V22 Q138 8 124 10 Q110 12 114 28 L108 34Z" fill="none" stroke="url(#gGold)" stroke-width="3"/>
    <path d="M14 50 Q60 42 104 50" fill="none" stroke="url(#gGold)" stroke-width="2" opacity=".9"/>
    <circle cx="-4" cy="44" r="5" fill="none" stroke="url(#gGold)" stroke-width="2.5"/>
    <path d="M30 58 l4 -6 l4 6 l-4 6z M60 58 l4 -6 l4 6 l-4 6z M90 58 l4 -6 l4 6 l-4 6z" fill="#ffd166"/>
  </g>
</svg>`;
}
