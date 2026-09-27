"""Mini moteur voxel pour modèles de mobs Minecraft (Python pur, sans dépendance).

Un modèle = liste de Part. Chaque Part est un ensemble de voxels colorés,
avec une rotation optionnelle autour de l'axe x (pour les bras) et un pivot.
- export_obj : maillage .obj avec couleur par sommet (Blender, MeshLab...).
- render     : rendu 3/4 (orthographique), z-buffer, ombrage par face,
               ombre portée au sol, suréchantillonnage pour lisser les bords.

Axes : x vers la droite, y vers le haut, z vers l'avant (vers le spectateur).
"""
import math
import random
import struct
import zlib
from pathlib import Path

FACES = {  # normale -> coins du carré unité
    (1, 0, 0): [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)],
    (-1, 0, 0): [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)],
    (0, 1, 0): [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)],
    (0, -1, 0): [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)],
    (0, 0, 1): [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)],
    (0, 0, -1): [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)],
}


class Part:
    def __init__(self, seed=0, angle=0.0, pivot=(0, 0, 0)):
        self.vox = {}
        self.angle = angle     # rotation autour de x, en degrés (négatif = bas vers l'avant)
        self.pivot = pivot
        self.rng = random.Random(seed)

    def jitter(self, c, amount=10):
        d = self.rng.randint(-amount, amount)
        return tuple(max(0, min(255, v + d)) for v in c)

    def box(self, x0, x1, y0, y1, z0, z1, color, amount=10):
        """Remplit une boîte ; color = (r, g, b) ou fonction(x, y, z) -> (r, g, b)."""
        for x in range(x0, x1):
            for y in range(y0, y1):
                for z in range(z0, z1):
                    c = color(x, y, z) if callable(color) else color
                    self.vox[(x, y, z)] = self.jitter(c, amount)

    def set(self, x, y, z, color):
        self.vox[(x, y, z)] = color

    def transform(self, p):
        if not self.angle:
            return p
        a = math.radians(self.angle)
        ca, sa = math.cos(a), math.sin(a)
        _, py, pz = self.pivot
        dy, dz = p[1] - py, p[2] - pz
        return (p[0], py + dy * ca - dz * sa, pz + dy * sa + dz * ca)

    def faces(self):
        """(normale, 4 coins, couleur) des faces visibles, pièce déjà tournée."""
        o = self.transform((0, 0, 0))
        for (x, y, z), color in self.vox.items():
            for n, corners in FACES.items():
                if (x + n[0], y + n[1], z + n[2]) in self.vox:
                    continue
                tn = self.transform(n)
                normal = tuple(tn[i] - o[i] for i in range(3))
                pts = [self.transform((x + a, y + b, z + c)) for a, b, c in corners]
                yield normal, pts, color


def all_faces(parts):
    for part in parts:
        yield from part.faces()


def export_obj(parts, path, title="modèle"):
    lines = [f"# {title} - voxels, couleur par sommet (v x y z r g b)"]
    idx = 1
    for _, pts, color in all_faces(parts):
        r, g, b = (c / 255 for c in color)
        for (x, y, z) in pts:
            lines.append(f"v {x:.4f} {y:.4f} {z:.4f} {r:.3f} {g:.3f} {b:.3f}")
        lines.append(f"f {idx} {idx + 1} {idx + 2} {idx + 3}")
        idx += 4
    Path(path).write_text("\n".join(lines) + "\n")
    return idx // 4


def render(parts, size=720, yaw=-35, pitch=16, ss=2, margin=0.14,
           bg_top=(206, 232, 250), bg_bot=(150, 196, 120), light=(-0.45, 0.8, 0.55)):
    W = H = size * ss
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))

    def view(p):
        x, y, z = p
        x, z = x * cy + z * sy, -x * sy + z * cy   # lacet
        y, z = y * cp - z * sp, y * sp + z * cp     # tangage
        return x, y, z

    ln = math.sqrt(sum(v * v for v in light))
    light = tuple(v / ln for v in light)

    faces = list(all_faces(parts))
    # Cadrage automatique : on centre la boîte englobante projetée
    allpts = [view(p) for _, pts, _ in faces for p in pts]
    minx, maxx = min(p[0] for p in allpts), max(p[0] for p in allpts)
    miny, maxy = min(p[1] for p in allpts), max(p[1] for p in allpts)
    scale = (1 - 2 * margin) * W / max(maxx - minx, maxy - miny)
    ox, oy = (minx + maxx) / 2, (miny + maxy) / 2

    def screen(v):
        return (W / 2 + (v[0] - ox) * scale, H / 2 - (v[1] - oy) * scale, v[2])

    color_buf = [[None] * W for _ in range(H)]
    depth_buf = [[-1e9] * W for _ in range(H)]

    def fill(poly, col, zplane=None, alpha=None):
        """Remplit un polygone convexe (coordonnées écran).
        zplane = (a, b, c) : profondeur = a*x + b*y + c, testée au z-buffer.
        alpha : assombrit ce qui est déjà là au lieu de peindre (ombre)."""
        xs = [p[0] for p in poly]
        ys = [p[1] for p in poly]
        edges = list(zip(poly, poly[1:] + poly[:1]))
        area = sum(a[0] * b[1] - b[0] * a[1] for a, b in edges)
        if abs(area) < 1e-9:
            return
        sgn = 1 if area > 0 else -1
        for py in range(max(0, int(min(ys))), min(H, int(max(ys)) + 1)):
            fy = py + 0.5
            crow, drow = color_buf[py], depth_buf[py]
            for px in range(max(0, int(min(xs))), min(W, int(max(xs)) + 1)):
                fx = px + 0.5
                if not all(sgn * ((b[0] - a[0]) * (fy - a[1]) - (b[1] - a[1]) * (fx - a[0])) >= 0
                           for a, b in edges):
                    continue
                if alpha is not None:
                    crow[px] = ("shadow", (crow[px][1] if crow[px] else 0) + alpha)
                    continue
                z = zplane[0] * fx + zplane[1] * fy + zplane[2]
                if z > drow[px]:
                    drow[px] = z
                    crow[px] = col

    # Ombre au sol : disques concentriques projetés sous le modèle
    xs3 = [p[0] for _, pts, _ in faces for p in pts]
    zs3 = [p[2] for _, pts, _ in faces for p in pts]
    gx, gz = (min(xs3) + max(xs3)) / 2, (min(zs3) + max(zs3)) / 2
    rad = max(max(xs3) - min(xs3), max(zs3) - min(zs3)) / 2
    for f in (1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6):
        circle = [screen(view((gx + rad * f * math.cos(t), 0, gz + rad * f * math.sin(t))))
                  for t in (i * 2 * math.pi / 40 for i in range(40))]
        fill([(p[0], p[1]) for p in circle], None, alpha=0.05)

    for n, pts, color in faces:
        vn = view(n)
        if vn[2] <= 1e-6:            # face tournée vers l'arrière
            continue
        shade = 0.55 + 0.45 * max(0.0, sum(a * b for a, b in zip(n, light)))
        col = tuple(int(c * shade) for c in color)
        s = [screen(view(p)) for p in pts]
        # plan de profondeur à partir de 3 sommets
        (x1, y1, z1), (x2, y2, z2), (x3, y3, z3) = s[0], s[1], s[2]
        det = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1)
        if abs(det) < 1e-9:
            continue
        a = ((z2 - z1) * (y3 - y1) - (z3 - z1) * (y2 - y1)) / det
        b = ((x2 - x1) * (z3 - z1) - (x3 - x1) * (z2 - z1)) / det
        c = z1 - a * x1 - b * y1
        fill([(p[0], p[1]) for p in s], col, zplane=(a, b, c))

    out = []
    for y in range(size):
        row = []
        for x in range(size):
            acc = [0, 0, 0]
            for dy in range(ss):
                for dx in range(ss):
                    py, px = y * ss + dy, x * ss + dx
                    t = py / H
                    bg = [bg_top[i] * (1 - t) + bg_bot[i] * t for i in range(3)]
                    c = color_buf[py][px]
                    if c is None:
                        c = bg
                    elif c[0] == "shadow":
                        c = [v * (1 - min(c[1], 0.6)) for v in bg]
                    for i in range(3):
                        acc[i] += c[i]
            row.append(tuple(int(v) // (ss * ss) for v in acc))
        out.append(row)
    return out


def write_rgb_png(path, rows):
    h, w = len(rows), len(rows[0])
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for c in row:
            raw.extend(c)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    Path(path).write_bytes(b"\x89PNG\r\n\x1a\n"
                          + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                          + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
                          + chunk(b"IEND", b""))


def side_by_side(*images):
    return [sum((list(img[y]) for img in images), []) for y in range(len(images[0]))]
