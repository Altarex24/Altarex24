// Génère un SVG d'arbre réaliste : chêne isolé dans une prairie, lumière de fin d'après-midi.
// Structure par colonisation de l'espace, épaisseur par la loi de Léonard de Vinci,
// feuillage en touffes éclairées individuellement.
// Aucune dépendance. Usage : SEED=3 node generer-arbre.mjs  (changer SEED donne un autre arbre)
import fs from "node:fs";

const W = 1400, H = 1000;
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry32(+(process.env.SEED || 3));
const rr = (a, b) => a + rnd() * (b - a);
const f1 = v => (Math.round(v * 10) / 10).toString();

const SUN = { x: -0.64, y: -0.77 }; // direction vers le soleil (haut gauche)
const BASE = { x: 700, y: 830 };

// ---------- enveloppe de la couronne : dôme + touffes ----------
const CROWN = { x: 700, y: 390, rx: 380, ry: 250 };
const lobes = [];
for (let i = 0; i < 16; i++) {
  const t = Math.PI * (1.02 + 0.96 * i / 15) + rr(-0.06, 0.06); // de gauche à droite par le haut
  const e = rr(0.72, 0.9);
  lobes.push({ x: CROWN.x + Math.cos(t) * CROWN.rx * e, y: CROWN.y + Math.sin(t) * CROWN.ry * e + 30, r: rr(95, 140) });
}
for (let i = 0; i < 9; i++) { // touffes intérieures
  const t = rr(0, Math.PI * 2), e = rr(0.1, 0.55);
  lobes.push({ x: CROWN.x + Math.cos(t) * CROWN.rx * e, y: CROWN.y + Math.sin(t) * CROWN.ry * e * 0.8, r: rr(100, 150) });
}
for (const s of [-1, 1]) lobes.push({ x: CROWN.x + s * CROWN.rx * rr(0.62, 0.72), y: CROWN.y + 125, r: rr(85, 105) }); // branches basses

const inCrown = (x, y) => y < 640 && lobes.some(l => (x - l.x) ** 2 + (y - l.y) ** 2 < l.r ** 2);
let attractors = [];
while (attractors.length < 7000) {
  const x = rr(CROWN.x - CROWN.rx - 150, CROWN.x + CROWN.rx + 150), y = rr(CROWN.y - CROWN.ry - 150, 640);
  if (inCrown(x, y) && !(y > 560 && Math.abs(x - CROWN.x) < 60)) attractors.push({ x, y });
}

// ---------- colonisation de l'espace ----------
const STEP = 6, KILL = 11, INFL = 55;
const nodes = [];
const add = (x, y, parent) => { nodes.push({ x, y, parent, kids: 0, r: 0 }); if (parent >= 0) nodes[parent].kids++; return nodes.length - 1; };
// tronc
let cur = add(BASE.x, BASE.y, -1), tx = BASE.x;
for (let y = BASE.y - STEP, k = 0; y > 600; y -= STEP, k++) { tx = BASE.x + 9 * Math.sin(k / 9) - k * 0.25 + rr(-0.6, 0.6); cur = add(tx, y, cur); }

const CELL = INFL, grid = new Map();
const key = (x, y) => (Math.floor(x / CELL) + 1000) * 10000 + Math.floor(y / CELL) + 1000;
const index = i => { const k = key(nodes[i].x, nodes[i].y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); };
nodes.forEach((_, i) => index(i));

for (let iter = 0; iter < 800 && attractors.length; iter++) {
  const pull = new Map();
  for (const a of attractors) {
    let best = -1, bd = INFL * INFL;
    const cx = Math.floor(a.x / CELL), cy = Math.floor(a.y / CELL);
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = grid.get((cx + dx + 1000) * 10000 + cy + dy + 1000); if (!list) continue;
      for (const i of list) { const d = (nodes[i].x - a.x) ** 2 + (nodes[i].y - a.y) ** 2; if (d < bd) { bd = d; best = i; } }
    }
    if (best < 0) continue;
    const n = nodes[best], d = Math.sqrt(bd) || 1;
    const v = pull.get(best) || [0, 0]; v[0] += (a.x - n.x) / d; v[1] += (a.y - n.y) / d; pull.set(best, v);
  }
  if (!pull.size) { // le tronc continue de monter tant qu'il n'a pas atteint la couronne
    const n = nodes[cur]; if (n.y < CROWN.y - CROWN.ry) break;
    cur = add(n.x + rr(-1.2, 1.2), n.y - STEP, cur); index(cur); continue;
  }
  const fresh = [];
  for (const [i, [vx, vy]] of pull) {
    const n = nodes[i];
    let dx = vx, dy = vy - 0.12; // légère attirance vers la lumière (le haut)
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const j = add(n.x + dx * STEP + rr(-1, 1), n.y + dy * STEP + rr(-1, 1), i);
    fresh.push(j); index(j);
  }
  attractors = attractors.filter(a => !fresh.some(j => (nodes[j].x - a.x) ** 2 + (nodes[j].y - a.y) ** 2 < KILL * KILL));
}

// épaisseur (loi de Léonard de Vinci) : r^e = somme r_enfants^e
const E = 2.1;
for (let i = nodes.length - 1; i >= 0; i--) {
  const n = nodes[i]; if (n.kids === 0) n.r = 0.55;
  if (n.parent >= 0) { const p = nodes[n.parent]; p.acc = (p.acc || 0) + n.r ** E; }
  if (i > 0 && nodes[i - 1] && false) {}
  if (n.acc) n.r = Math.max(n.r, n.acc ** (1 / E));
}
// (les parents ont toujours un indice plus petit que leurs enfants : on repasse pour propager correctement)
for (const n of nodes) { n.acc = 0; n.r = n.kids === 0 ? 0.55 : 0; }
for (let i = nodes.length - 1; i >= 0; i--) {
  const n = nodes[i]; if (n.kids) n.r = n.acc ** (1 / E);
  if (n.parent >= 0) nodes[n.parent].acc += n.r ** E;
}
// correspondance non linéaire : tronc = 27 px de demi-largeur, rameaux = 0.5 px
const rTip = 0.55, q = Math.log(27 / 0.5) / Math.log(nodes[0].r / rTip);
for (const n of nodes) n.r = 0.5 * (n.r / rTip) ** q;

// ---------- dessin du bois (segments groupés par épaisseur) ----------
const woodGroups = new Map();
for (const n of nodes) {
  if (n.parent < 0) continue;
  const p = nodes[n.parent], w = Math.round(n.r * 2 * 2) / 2 || 0.5;
  const s = woodGroups.get(w) || []; s.push(`M${f1(p.x)} ${f1(p.y)}L${f1(n.x)} ${f1(n.y)}`); woodGroups.set(w, s);
}
const woodColor = w => w > 16 ? "url(#bark)" : w > 6 ? "#4a3829" : w > 2.5 ? "#3d2f23" : "#33291f";
const woodSvg = [...woodGroups].sort((a, b) => b[0] - a[0])
  .map(([w, s]) => `<path d="${s.join("")}" stroke="${woodColor(w)}" stroke-width="${w}"/>`).join("");
const TW = nodes[0].r, FX = nodes.find(n => n.y <= BASE.y - 75).x - BASE.x;
const flare = `M${BASE.x - TW * 3.4} ${BASE.y + 8} C${BASE.x - TW * 1.9} ${BASE.y + 2} ${BASE.x + FX * 0.6 - TW * 1.15} ${BASE.y - 22} ${BASE.x + FX - TW} ${BASE.y - 75} L${BASE.x + FX + TW} ${BASE.y - 75} C${BASE.x + FX * 0.6 + TW * 1.15} ${BASE.y - 24} ${BASE.x + TW * 2.1} ${BASE.y + 3} ${BASE.x + TW * 3.8} ${BASE.y + 10} C${BASE.x + TW * 1.4} ${BASE.y + 16} ${BASE.x - TW * 1.4} ${BASE.y + 16} ${BASE.x - TW * 3.4} ${BASE.y + 8}Z`;
// reflet chaud sur le flanc éclairé des grosses branches
const hl = nodes.filter(n => n.parent >= 0 && n.r > 5).map(n => { const p = nodes[n.parent]; return `M${f1(p.x - p.r * 0.45)} ${f1(p.y - p.r * 0.1)}L${f1(n.x - n.r * 0.45)} ${f1(n.y - n.r * 0.1)}`; }).join("");

// ---------- feuillage ----------
const pal = ["#0a1d0c", "#10290f", "#183716", "#21461b", "#2d5621", "#3d6a27", "#52802e", "#6c9537", "#8fae47", "#b7c962", "#d6dc86"];
const leaves = [];
for (const n of nodes) {
  if (n.r > 2.6) continue;
  const cnt = n.kids === 0 ? 9 : n.r < 1.2 ? 6 : 3, spread = n.kids === 0 ? 15 : 13;
  for (let i = 0; i < cnt; i++) {
    const r = spread * Math.sqrt(rnd()), th = rnd() * Math.PI * 2;
    leaves.push({ x: n.x + Math.cos(th) * r, y: n.y + Math.sin(th) * r, z: rr(-1, 1), v: Math.floor(rnd() * 8) });
  }
}
for (const l of leaves) {
  // touffe la plus « englobante » -> normale locale
  let best = null, bs = 1e9;
  for (const lb of lobes) { const s = Math.hypot(l.x - lb.x, l.y - lb.y) / lb.r; if (s < bs) { bs = s; best = lb; } }
  const nx = (l.x - best.x) / best.r, ny = (l.y - best.y) / best.r;
  const gx = (l.x - CROWN.x) / CROWN.rx, gy = (l.y - CROWN.y) / CROWN.ry;
  let light = 0.75 * (nx * SUN.x + ny * SUN.y) + 0.35 * (gx * SUN.x + gy * SUN.y) + 0.35 * Math.min(1, bs) + 0.25 * l.z + rr(-0.18, 0.18) - 0.12;
  if (l.y > 560) light -= (l.y - 560) / 160; // dessous de la couronne dans l'ombre
  l.c = Math.max(0, Math.min(pal.length - 1, Math.round((light + 0.9) / 2.0 * (pal.length - 1))));
}
leaves.sort((a, b) => a.z - b.z);
const layer = (ls) => { const byC = new Map(); for (const l of ls) { const a = byC.get(l.c) || []; a.push(`<use href="#l${l.v}" x="${f1(l.x)}" y="${f1(l.y)}"/>`); byC.set(l.c, a); } return [...byC].map(([c, a]) => `<g fill="${pal[c]}">${a.join("")}</g>`).join(""); };
const back = leaves.filter(l => l.z < -0.3), front = leaves.filter(l => l.z >= -0.3);
// masses sombres derrière (profondeur de la couronne)
const masses = lobes.filter(l => l.y < CROWN.y + 40).map(l => `<circle cx="${f1(l.x + 12)}" cy="${f1(l.y + 14)}" r="${f1(l.r * 0.6)}"/>`).join("");
const leafDefs = [...Array(8)].map((_, i) => { const a = i * 45 + 10, s = 0.8 + (i % 3) * 0.2; return `<path id="l${i}" d="M-6 0Q-2 -3.8 6 0Q-2 3.8 -6 0Z" transform="rotate(${a}) scale(${s})"/>`; }).join("");

// ---------- herbe ----------
let grass = "";
const g2 = mulberry32(5);
for (let i = 0; i < 1500; i++) {
  const y = 780 + Math.pow(g2(), 0.6) * 230, x = g2() * W;
  const h = (6 + (y - 780) * 0.12) * (0.6 + g2() * 0.8), lean = (g2() - 0.5) * h * 0.6;
  const shade = Math.min(1, (y - 780) / 220);
  const c = ["#a6c152", "#8fae45", "#77993a", "#5f822f", "#4a6b23"][Math.floor(g2() * 3 + shade * 2)];
  grass += `<path d="M${f1(x - 1.2)} ${f1(y)}Q${f1(x + lean * 0.4)} ${f1(y - h * 0.6)} ${f1(x + lean)} ${f1(y - h)}Q${f1(x + lean * 0.3 + 0.8)} ${f1(y - h * 0.5)} ${f1(x + 1.2)} ${f1(y)}Z" fill="${c}"/>`;
}
let flowers = "";
for (let i = 0; i < 90; i++) {
  const y = 800 + Math.pow(g2(), 0.7) * 200, x = g2() * W, r = 1 + (y - 800) * 0.012;
  flowers += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${["#fff8e6", "#ffe066", "#f4f1ff", "#ffd1dc"][Math.floor(g2() * 4)]}" opacity="0.9"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>Le Chêne</title>
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#5a8cc6"/><stop offset="0.45" stop-color="#a8c5df"/><stop offset="0.68" stop-color="#f1dcb6"/><stop offset="0.8" stop-color="#f6c992"/></linearGradient>
  <radialGradient id="sun" cx="170" cy="190" r="560" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fffbe8"/><stop offset="0.05" stop-color="#fff2c4" stop-opacity="0.9"/>
    <stop offset="0.3" stop-color="#ffe0a0" stop-opacity="0.33"/><stop offset="1" stop-color="#ffd08a" stop-opacity="0"/></radialGradient>
  <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3b5ab"/><stop offset="1" stop-color="#bcc6aa"/></linearGradient>
  <linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#809b64"/><stop offset="1" stop-color="#91a969"/></linearGradient>
  <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3b957"/><stop offset="0.35" stop-color="#809d3f"/><stop offset="1" stop-color="#486823"/></linearGradient>
  <linearGradient id="bark" x1="${BASE.x - 30}" y1="0" x2="${BASE.x + 30}" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#806650"/><stop offset="0.3" stop-color="#5c4735"/><stop offset="0.7" stop-color="#30251c"/><stop offset="1" stop-color="#1b140f"/></linearGradient>
  <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#1b2c0f" stop-opacity="0.6"/><stop offset="0.7" stop-color="#1b2c0f" stop-opacity="0.32"/><stop offset="1" stop-color="#1b2c0f" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="0.5" cy="0.45" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a1208" stop-opacity="0.45"/></radialGradient>
  <filter id="barkTex" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.3 0.02" numOctaves="3" seed="4"/>
    <feColorMatrix values="0 0 0 0 0.07  0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 2.8 -1.25"/></filter>
  <filter id="blur2" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="blur10" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="blur18" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="clouds" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.012" numOctaves="5" seed="12"/>
    <feColorMatrix values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.95  2.2 0 0 0 -1.05"/></filter>
  <filter id="groundTex" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="4" seed="9"/>
    <feColorMatrix values="0 0 0 0 0.15  0 0 0 0 0.22  0 0 0 0 0.05  0 0 0 1.6 -0.7"/></filter>
  ${leafDefs}
  <mask id="woodMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
    <g stroke="#fff" fill="none" stroke-linecap="round">${[...woodGroups].filter(([w]) => w > 4).map(([w, s]) => `<path d="${s.join("")}" stroke-width="${w}"/>`).join("")}</g><path d="${flare}" fill="#fff"/></mask>
</defs>

<!-- ciel -->
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="620" filter="url(#clouds)" opacity="0.55"/>
<rect width="${W}" height="${H}" fill="url(#sun)"/>

<!-- collines et arbres lointains -->
<path d="M0 640 C180 590 330 600 470 620 S760 575 940 600 S1250 585 1400 610 V820 H0Z" fill="url(#hillFar)" opacity="0.85"/>
<path d="M0 700 C200 660 380 690 560 680 S900 650 1100 675 S1330 670 1400 660 V840 H0Z" fill="url(#hillMid)"/>
<g filter="url(#blur2)" opacity="0.7">
  ${[[110, 690, 1], [150, 686, 1.3], [192, 692, 0.9], [1100, 672, 1.2], [1140, 676, 0.9], [1320, 664, 1.1], [940, 668, 0.7]].map(([x, y, s]) => `<rect x="${x - 1.5}" y="${y - 8 * s}" width="3" height="${10 * s}" fill="#4a4a3a"/><ellipse cx="${x}" cy="${y - 20 * s}" rx="${14 * s}" ry="${17 * s}" fill="#56714a"/><ellipse cx="${x - 4 * s}" cy="${y - 25 * s}" rx="${8 * s}" ry="${9 * s}" fill="#6f8a5c"/>`).join("")}
</g>

<!-- prairie -->
<path d="M0 760 C300 740 600 755 800 750 S1200 740 1400 755 V1000 H0Z" fill="url(#field)"/>
<rect y="740" width="${W}" height="260" filter="url(#groundTex)" opacity="0.6"/>
<ellipse cx="${BASE.x + 190}" cy="${BASE.y + 20}" rx="360" ry="48" fill="url(#shadow)"/>

<!-- profondeur de la couronne -->
<g fill="#0a1a0a" opacity="0.85" filter="url(#blur10)">${masses}</g>
${layer(back)}

<!-- bois -->
<path d="${flare}" fill="url(#bark)"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">${woodSvg}</g>
<g mask="url(#woodMask)">
  <rect width="${W}" height="${H}" filter="url(#barkTex)" opacity="0.9"/>
  <path d="${hl}" stroke="#d9b58a" stroke-opacity="0.28" stroke-width="5" stroke-linecap="round" fill="none" filter="url(#blur2)"/>
</g>

<!-- feuillage avant -->
${layer(front)}
<ellipse cx="${CROWN.x - CROWN.rx * 0.4}" cy="${CROWN.y - CROWN.ry * 0.45}" rx="${CROWN.rx * 0.7}" ry="${CROWN.ry * 0.55}" fill="#ffe7a8" opacity="0.12" filter="url(#blur18)" style="mix-blend-mode:screen"/>

<!-- premier plan -->
<g>${grass}</g>
<g>${flowers}</g>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>
`;
fs.writeFileSync("arbre.svg", svg);
console.log("noeuds", nodes.length, "feuilles", leaves.length, "attracteurs restants", attractors.length, "taille", (svg.length / 1024) | 0, "Ko");
