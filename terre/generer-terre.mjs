// Génère un SVG réaliste de la Terre (projection orthographique, biomes, nuages procéduraux)
// Dépendances : npm i world-atlas@2 topojson-client d3-geo d3-contour — puis : node generer-terre.mjs
import fs from "node:fs";
import { feature } from "topojson-client";
import { geoOrthographic, geoPath, geoArea } from "d3-geo";
import { contours } from "d3-contour";

const W = 1200, H = 1200, CX = 600, CY = 600, R = 470;
const LON0 = 12, LAT0 = 14, TILT = -8; // Afrique / Europe / Arabie face à nous

// ---------- bruit de Perlin 3D (seedé) ----------
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(seed) {
  const rnd = mulberry32(seed), p = new Uint8Array(512), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10), lerp = (t, a, b) => a + t * (b - a);
  const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  return (x, y, z) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
    return lerp(w, lerp(v, lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)), lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))),
      lerp(v, lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)), lerp(u, grad(p[AB + 1], x, y - 1, z - 1), grad(p[BB + 1], x - 1, y - 1, z - 1))));
  };
}
const n1 = makeNoise(7), n2 = makeNoise(42), n3 = makeNoise(1337), n4 = makeNoise(99);
const fbm = (n, x, y, z, oct = 5, lac = 2.03, gain = 0.5) => { let a = 1, f = 1, s = 0, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f, z * f); t += a; a *= gain; f *= lac; } return s / t; };

// ---------- utilitaires sphère ----------
const rad = Math.PI / 180;
const toVec = (lon, lat) => [Math.cos(lat * rad) * Math.cos(lon * rad), Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function rotateAround(p, k, th) { // Rodrigues
  const c = Math.cos(th), s = Math.sin(th), d = dot(k, p);
  const cr = [k[1] * p[2] - k[2] * p[1], k[2] * p[0] - k[0] * p[2], k[0] * p[1] - k[1] * p[0]];
  return [p[0] * c + cr[0] * s + k[0] * d * (1 - c), p[1] * c + cr[1] * s + k[1] * d * (1 - c), p[2] * c + cr[2] * s + k[2] * d * (1 - c)];
}
const wrap = d => ((d + 540) % 360) - 180;
const blob = (lon, lat, [bl, bb, rx, ry, w]) => w * Math.exp(-((wrap(lon - bl) / rx) ** 2 + ((lat - bb) / ry) ** 2));
const field = (blobs) => (lon, lat) => blobs.reduce((s, b) => s + blob(lon, lat, b), 0);
const gauss = (x, s) => Math.exp(-((x / s) ** 2));

// ---------- grilles -> contours sphériques ----------
function grid(nx, ny, fn) {
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) { const lat = 90 - (j + 0.5) * 180 / ny; for (let i = 0; i < nx; i++) v[i + j * nx] = fn(-180 + (i + 0.5) * 360 / nx, lat); }
  for (const j of [0, ny - 1]) { let m = 0; for (let i = 0; i < nx; i++) m += v[i + j * nx]; m /= nx; for (let i = 0; i < nx; i++) v[i + j * nx] = m; }
  return { nx, ny, v };
}
function iso({ nx, ny, v }, t) {
  const [mp] = contours().size([nx, ny]).smooth(true).thresholds([t])(v);
  const polys = mp.coordinates.map(poly => poly.map(ring => ring.map(([x, y]) => [-180 + x * 360 / nx, 90 - y * 180 / ny])))
    .map(poly => { const g = { type: "Polygon", coordinates: poly }; if (geoArea(g) > 2 * Math.PI) poly.forEach(r => r.reverse()); return g; });
  return { type: "GeometryCollection", geometries: polys };
}

// ---------- projection ----------
const proj = geoOrthographic().scale(R).translate([CX, CY]).rotate([-LON0, -LAT0, TILT]).clipAngle(90).precision(0.2);
const path = geoPath(proj).digits(1);

const topo = JSON.parse(fs.readFileSync("node_modules/world-atlas/land-50m.json"));
const land = feature(topo, topo.objects.land);
const landD = path(land);

// ---------- biomes ----------
const deserts = field([
  [8, 23, 22, 7, 1.0], [26, 22, 12, 7, 1.0], [-8, 21, 10, 7, 0.95], [16, 17, 26, 3.5, 0.45],
  [47, 22, 11, 7, 1.0], [58, 30, 10, 5, 0.7], [71, 27, 5, 4, 0.6], [62, 43, 12, 5, 0.65],
  [85, 40, 10, 4, 0.9], [104, 42, 11, 4, 0.8], [45, 8, 6, 5, 0.6], [34, 29, 4, 4, 0.7],
  [19, -24, 7, 6, 0.7], [14, -22, 3, 8, 0.8], [130, -25, 17, 9, 0.95], [120, -22, 6, 6, 0.6],
  [-70, -23, 3, 9, 0.8], [-68, -45, 4, 7, 0.5], [-112, 32, 8, 6, 0.75], [-104, 27, 6, 5, 0.5],
]);
const redness = field([[130, -24, 14, 8, 1.0], [15, -22, 5, 6, 0.6], [5, 26, 8, 5, 0.5], [-10, 22, 6, 5, 0.5]]);
const wet = field([
  [-62, -4, 15, 8, 1.1], [-52, -10, 8, 6, 0.6], [20, 0, 11, 5, 1.1], [10, 5, 6, 3, 0.7], [110, 0, 18, 8, 1.0],
  [102, 14, 8, 6, 0.6], [76, 12, 3, 5, 0.5], [-85, 12, 6, 5, 0.8], [49, -17, 2, 6, 0.7], [-45, -20, 4, 8, 0.6],
  [145, -6, 6, 4, 0.8], [-8, 7, 5, 3, 0.7],
]);
const boreal = field([[95, 60, 55, 7, 0.9], [-100, 55, 38, 7, 0.9], [25, 60, 18, 5, 0.8], [-75, 50, 10, 5, 0.6]]);
const ice = (lon, lat) => (lat < -60 ? 1.5 : 0) + blob(lon, lat, [-41, 74, 13, 10, 1.4]) + blob(lon, lat, [-40, 66, 7, 5, 0.8])
  + (lat > 76 ? 0.6 + (lat - 76) * 0.08 : 0) + blob(lon, lat, [84, 30, 7, 2, 0.45]);
const tundra = (lon, lat) => gauss(lat - 69, 5) * 0.9 + gauss(lat + 54, 3) * 0.3;

const tex = (lon, lat, s = 3, n = n1) => { const [x, y, z] = toVec(lon, lat); return fbm(n, x * s, y * s, z * s, 5); };
const B = 480, BH = 240;
const D = grid(B, BH, (l, b) => deserts(l, b) * (0.8 + 0.8 * tex(l, b, 4)) + 0.12 * tex(l, b, 11, n2));
const Wt = grid(B, BH, (l, b) => wet(l, b) * (0.8 + 0.8 * tex(l, b, 5, n3)));
const layers = [
  ["#6f6c3e", D, 0.2], ["#857a4a", D, 0.32], ["#a08957", D, 0.44], ["#b8955f", D, 0.56], ["#c8a56d", D, 0.68], ["#d7b67f", D, 0.82],
  ["#a6633c", grid(B, BH, (l, b) => redness(l, b) * (0.7 + 1.0 * tex(l, b, 6, n4))), 0.6],
  ["#2f4b24", grid(B, BH, (l, b) => boreal(l, b) * (0.8 + 0.8 * tex(l, b, 5, n2))), 0.45],
  ["#34502a", Wt, 0.3], ["#24401e", Wt, 0.5], ["#173219", Wt, 0.75],
  ["#6f6a4f", grid(B, BH, (l, b) => tundra(l, b) * (0.8 + 0.8 * tex(l, b, 6))), 0.55],
  ["#e9eef2", grid(B, BH, (l, b) => ice(l, b) * (0.85 + 0.6 * tex(l, b, 6, n2))), 0.62],
].map(([c, g, t]) => [c, path(iso(g, t))]);

// ---------- nuages ----------
const cyclones = [ // lon, lat, rayon (deg), torsion
  [-30, 50, 11, 3.0], [-18, -46, 11, -2.8], [45, -50, 10, -2.4], [-62, 36, 7, 2.0], [70, -38, 8, -2.0], [22, 60, 7, 1.8],
].map(([lo, la, r, s]) => ({ c: toVec(lo, la), r: r * rad, s }));
function cloudDensity(lon, lat) {
  let p = toVec(lon, lat);
  for (const cy of cyclones) { const d = Math.acos(Math.min(1, dot(p, cy.c))); p = rotateAround(p, cy.c, cy.s * Math.exp(-((d / cy.r) ** 2))); }
  const wx = fbm(n2, p[0] * 2, p[1] * 2, p[2] * 2, 3), wy = fbm(n3, p[0] * 2 + 5, p[1] * 2, p[2] * 2, 3);
  const q = [p[0] + 0.25 * wx, p[1] + 0.25 * wy, p[2]];
  // étirement zonal : fréquence plus élevée en latitude
  const big = fbm(n1, q[0] * 2.2, q[1] * 2.2, q[2] * 5.5, 6, 2.1, 0.55);
  const fine = fbm(n4, q[0] * 9, q[1] * 9, q[2] * 20, 4);
  const a = Math.abs(lat);
  const clump = fbm(n2, q[0] * 6, q[1] * 6, q[2] * 6, 3);
  let m = -0.02 + (0.2 + 0.5 * clump) * gauss(lat - 6, 6) - 0.28 * gauss(a - 24, 9) + 0.3 * gauss(a - 52, 12) + 0.1 * gauss(a - 75, 10);
  m -= 0.35 * (blob(lon, lat, [5, 22, 28, 9, 1]) + blob(lon, lat, [45, 22, 12, 8, 0.8]) + blob(lon, lat, [130, -25, 15, 9, 0.6]));
  for (const cy of cyclones) { const d = Math.acos(Math.min(1, dot(toVec(lon, lat), cy.c))); m += 0.12 * Math.exp(-((d / (cy.r * 1.2)) ** 2)); }
  return big + 0.35 * fine + m;
}
const CG = grid(720, 360, cloudDensity);
const cloudLevels = [[-0.04, 0.2, 0], [0.04, 0.2, 0], [0.12, 0.2, 0], [0.2, 0.2, 0], [0.3, 0.2, 0]]
  .map(([t, o, b]) => ({ d: path(iso(CG, t)), o, b }));

// ---------- étoiles ----------
const rs = mulberry32(2024); let stars = "";
for (let i = 0; i < 420; i++) {
  const x = rs() * W, y = rs() * H; if (Math.hypot(x - CX, y - CY) < R * 1.08) continue;
  const big = rs() < 0.06, r = big ? 0.9 + rs() * 0.8 : 0.25 + rs() * 0.6, o = (0.25 + rs() * 0.75).toFixed(2);
  const col = ["#ffffff", "#cfe0ff", "#fff1d6", "#ffe0c4"][Math.floor(rs() * 4)];
  stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${col}" opacity="${o}"${big ? ' filter="url(#starGlow)"' : ""}/>`;
}

// ---------- SVG ----------
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>La Terre</title>
<defs>
  <radialGradient id="space" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="#0b1426"/><stop offset="0.6" stop-color="#050a16"/><stop offset="1" stop-color="#010207"/></radialGradient>
  <radialGradient id="ocean" cx="${CX - R * 0.35}" cy="${CY - R * 0.35}" r="${R * 1.45}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#1b5a93"/><stop offset="0.45" stop-color="#0f3f73"/><stop offset="0.8" stop-color="#082a55"/><stop offset="1" stop-color="#041a3a"/></radialGradient>
  <radialGradient id="halo" cx="${CX}" cy="${CY}" r="${R * 1.09}" gradientUnits="userSpaceOnUse">
    <stop offset="0.88" stop-color="#5fa8ff" stop-opacity="0"/><stop offset="0.915" stop-color="#8cc4ff" stop-opacity="0.95"/>
    <stop offset="0.94" stop-color="#4f93ff" stop-opacity="0.45"/><stop offset="0.975" stop-color="#2a5fd6" stop-opacity="0.12"/><stop offset="1" stop-color="#1a3a9a" stop-opacity="0"/></radialGradient>
  <radialGradient id="rim" cx="${CX}" cy="${CY}" r="${R}" gradientUnits="userSpaceOnUse">
    <stop offset="0.72" stop-color="#9fd0ff" stop-opacity="0"/><stop offset="0.9" stop-color="#9fd0ff" stop-opacity="0.12"/>
    <stop offset="0.97" stop-color="#b8dcff" stop-opacity="0.42"/><stop offset="1" stop-color="#d6ecff" stop-opacity="0.7"/></radialGradient>
  <radialGradient id="shade" cx="${CX - R * 0.42}" cy="${CY - R * 0.4}" r="${R * 1.9}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.38" stop-color="#000" stop-opacity="0.04"/>
    <stop offset="0.55" stop-color="#01030a" stop-opacity="0.35"/><stop offset="0.66" stop-color="#01030a" stop-opacity="0.78"/>
    <stop offset="0.76" stop-color="#000106" stop-opacity="0.95"/><stop offset="1" stop-color="#000" stop-opacity="0.97"/></radialGradient>
  <radialGradient id="glint" cx="${CX - R * 0.36}" cy="${CY - R * 0.33}" r="${R * 0.42}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fffbe8" stop-opacity="0.5"/><stop offset="0.25" stop-color="#e8f2ff" stop-opacity="0.18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="sunSide" x1="0.15" y1="0.1" x2="0.9" y2="0.95">
    <stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.78" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="sunMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect x="${CX - R * 1.1}" y="${CY - R * 1.1}" width="${R * 2.2}" height="${R * 2.2}" fill="url(#sunSide)"/></mask>
  <clipPath id="globe"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
  <path id="landPath" d="${landD}"/>
  <clipPath id="land"><use href="#landPath"/></clipPath>
  <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="biome" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="4.5"/></filter>
  <filter id="shelf" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7"/></filter>
  <filter id="oceanTex" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="4" seed="3"/>
    <feColorMatrix values="0 0 0 0 0.02  0 0 0 0 0.12  0 0 0 0 0.28  0 0 0 -1.6 1.05"/></filter>
  <filter id="landTex" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="5" seed="11" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1.9 0 -0.85"/></filter>
  <filter id="landLight" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="5" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.85  1.4 0 0 0 -0.62"/></filter>
  <filter id="clouds" x="${CX - R}" y="${CY - R}" width="${2 * R}" height="${2 * R}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="dens"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.009 0.017" numOctaves="7" seed="8" result="turb"/>
    <feColorMatrix in="turb" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="t"/>
    <feComposite in="dens" in2="t" operator="arithmetic" k1="1.0" k2="1.4" k3="3.4" k4="-2.15" result="a"/>
    <feComponentTransfer in="a" result="ca"><feFuncA type="gamma" amplitude="1.15" exponent="1.25" offset="0"/></feComponentTransfer>
    <feFlood flood-color="#000a18" result="dark"/>
    <feOffset in="ca" dx="5" dy="6" result="off"/><feGaussianBlur in="off" stdDeviation="3.5" result="offb"/>
    <feComposite in="dark" in2="offb" operator="in" result="shadow0"/>
    <feComponentTransfer in="shadow0" result="shadow"><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
    <feGaussianBlur in="ca" stdDeviation="0.3" result="cas"/>
    <feFlood flood-color="#fbfdff" result="white"/>
    <feComposite in="white" in2="cas" operator="in" result="cw"/>
    <feMerge><feMergeNode in="shadow"/><feMergeNode in="cw"/></feMerge>
  </filter>
  <filter id="starGlow" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="1.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="haloBlur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>

<rect width="${W}" height="${H}" fill="url(#space)"/>
<g>${stars}</g>

<!-- atmosphère externe -->
<g mask="url(#sunMask)"><circle cx="${CX}" cy="${CY}" r="${R * 1.09}" fill="url(#halo)" filter="url(#haloBlur)"/></g>
<circle cx="${CX}" cy="${CY}" r="${R * 1.09}" fill="url(#halo)" opacity="0.22"/>

<g clip-path="url(#globe)">
  <!-- océan -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#ocean)"/>
  <rect x="${CX - R}" y="${CY - R}" width="${R * 2}" height="${R * 2}" filter="url(#oceanTex)" opacity="0.55"/>
  <!-- plateau continental -->
  <use href="#landPath" fill="none" stroke="#2f7fb0" stroke-width="9" stroke-linejoin="round" opacity="0.55" filter="url(#shelf)"/>
  <use href="#landPath" fill="none" stroke="#4aa3c4" stroke-width="3" stroke-linejoin="round" opacity="0.35" filter="url(#soft)"/>

  <!-- continents -->
  <g clip-path="url(#land)">
    <use href="#landPath" fill="#56652f"/>
    <g filter="url(#biome)">
${layers.map(([c, d]) => `      <path d="${d}" fill="${c}"/>`).join("\n")}
    </g>
    <rect x="${CX - R}" y="${CY - R}" width="${R * 2}" height="${R * 2}" filter="url(#landTex)" opacity="0.14"/>
    <rect x="${CX - R}" y="${CY - R}" width="${R * 2}" height="${R * 2}" filter="url(#landLight)" opacity="0.25"/>
  </g>

  <!-- reflet du soleil sur l'océan -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#glint)" style="mix-blend-mode:screen"/>

  <!-- nuages : densité projetée sur la sphère modulée par une texture fine -->
  <g filter="url(#clouds)">
${cloudLevels.map(c => `    <path d="${c.d}" fill="#fff" opacity="${c.o}"/>`).join("\n")}
  </g>
  <!-- diffusion atmosphérique au bord -->
  <g mask="url(#sunMask)"><circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#rim)"/></g>
  <!-- éclairage / terminateur -->
  <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#shade)"/>
</g>
</svg>
`;
fs.writeFileSync("terre.svg", svg);
console.log("taille:", (svg.length / 1024).toFixed(0), "Ko");
