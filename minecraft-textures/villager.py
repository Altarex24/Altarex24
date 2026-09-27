"""Villageois Minecraft en 3D (voxels), exporté en .obj et rendu en image.

- Le modèle est un ensemble de voxels colorés (1 voxel = 1 pixel de skin),
  avec les proportions du villageois : jambes 12, robe/corps 12 (+6 de robe
  sur les jambes), tête 8x10x8, nez 2x4x2, bras croisés devant.
- villager.obj : maillage avec couleur par sommet (lisible dans Blender, MeshLab...).
- villager.png : rendu 3/4 face (projection orthographique, ombrage par face,
  algorithme du peintre, suréchantillonnage x2 pour lisser les bords).

Axes : x vers la droite, y vers le haut, z vers l'avant (vers le spectateur).
Usage : python villager.py
"""
import math
import random
import struct
import zlib
from pathlib import Path

SKIN = (189, 139, 110)
SKIN_D = (160, 110, 84)
ROBE = (112, 76, 52)
ROBE_D = (84, 55, 37)
ROBE_L = (138, 98, 66)
PANTS = (58, 50, 46)
EYE_W = (245, 245, 245)
EYE_G = (38, 150, 70)
BROW = (66, 40, 28)

rng = random.Random(7)


def jitter(c, amount=10):
    """Petite variation de couleur par voxel, pour le côté « texture Minecraft »."""
    d = rng.randint(-amount, amount)
    return tuple(max(0, min(255, v + d)) for v in c)


def build():
    vox = {}

    def box(x0, x1, y0, y1, z0, z1, color):
        for x in range(x0, x1):
            for y in range(y0, y1):
                for z in range(z0, z1):
                    vox[(x, y, z)] = jitter(color(x, y, z) if callable(color) else color)

    # Jambes (on ne voit que le bas, sous la robe)
    box(0, 4, 0, 6, 1, 5, PANTS)
    box(4, 8, 0, 6, 1, 5, PANTS)
    # Robe + corps : bande sombre en bas et au col
    box(0, 8, 6, 24, 0, 6,
        lambda x, y, z: ROBE_D if y < 8 else ROBE_L if y >= 22 else ROBE)
    # Tête
    box(0, 8, 24, 34, -1, 7, SKIN)
    # Visage (face avant de la tête, z = 6)
    for x, y, c in [(1, 29, EYE_W), (2, 29, EYE_G), (5, 29, EYE_G), (6, 29, EYE_W)]:
        vox[(x, y, 6)] = c
    for x in range(1, 7):
        vox[(x, 30, 6)] = jitter(BROW, 6)   # le mono-sourcil
    for x in range(8):
        vox[(x, 33, 6)] = jitter(SKIN_D, 6)  # ombre du front
    # Nez
    box(3, 5, 24, 28, 7, 9, SKIN_D)
    # Bras croisés : manches sur les côtés + mains au milieu
    box(-4, 0, 15, 22, 1, 9, ROBE)
    box(8, 12, 15, 22, 1, 9, ROBE)
    box(0, 8, 15, 19, 6, 10, lambda x, y, z: SKIN_D if y == 15 else SKIN)
    box(-4, 12, 15, 16, 1, 9, lambda x, y, z: ROBE_D)  # ourlet sous les manches
    return vox


FACES = {  # normale -> 4 coins du carré unité (dans l'ordre)
    (1, 0, 0): [(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)],
    (-1, 0, 0): [(0, 0, 0), (0, 0, 1), (0, 1, 1), (0, 1, 0)],
    (0, 1, 0): [(0, 1, 0), (0, 1, 1), (1, 1, 1), (1, 1, 0)],
    (0, -1, 0): [(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)],
    (0, 0, 1): [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)],
    (0, 0, -1): [(0, 0, 0), (0, 1, 0), (1, 1, 0), (1, 0, 0)],
}


def visible_faces(vox):
    for (x, y, z), color in vox.items():
        for n, corners in FACES.items():
            if (x + n[0], y + n[1], z + n[2]) not in vox:
                yield n, [(x + a, y + b, z + c) for a, b, c in corners], color


def export_obj(vox, path):
    lines = ["# Villageois Minecraft - voxels, couleur par sommet (v x y z r g b)"]
    idx = 1
    for n, pts, color in visible_faces(vox):
        r, g, b = (c / 255 for c in color)
        for (x, y, z) in pts:
            lines.append(f"v {x} {y} {z} {r:.3f} {g:.3f} {b:.3f}")
        lines.append(f"f {idx} {idx + 1} {idx + 2} {idx + 3}")
        idx += 4
    Path(path).write_text("\n".join(lines) + "\n")
    return idx // 4


def render(vox, size=720, yaw=-35, pitch=22, ss=2):
    W = H = size * ss
    cy, sy = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
    cp, sp = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
    center = (4, 16, 4)

    def rot(p):
        x, y, z = (p[0] - center[0], p[1] - center[1], p[2] - center[2])
        x, z = x * cy + z * sy, -x * sy + z * cy          # lacet (autour de y)
        y, z = y * cp - z * sp, y * sp + z * cp            # tangage (autour de x)
        return x, y, z

    light = (-0.45, 0.8, 0.55)
    ln = math.sqrt(sum(v * v for v in light))
    light = tuple(v / ln for v in light)
    scale = W / 46

    quads = []
    for n, pts, color in visible_faces(vox):
        rn = rot((n[0] + center[0], n[1] + center[1], n[2] + center[2]))
        if rn[2] <= 0:          # face tournée vers l'arrière : invisible
            continue
        shade = 0.55 + 0.45 * max(0.0, sum(a * b for a, b in zip(n, light)))
        rp = [rot(p) for p in pts]
        depth = sum(p[2] for p in rp) / 4
        scr = [(W / 2 + p[0] * scale, H / 2 - p[1] * scale) for p in rp]
        quads.append((depth, scr, tuple(int(c * shade) for c in color)))
    quads.sort(key=lambda q: q[0])  # peintre : du plus loin au plus proche

    bg_top, bg_bot = (206, 232, 250), (150, 196, 120)
    img = [[None] * W for _ in range(H)]
    for _, scr, col in quads:
        xs = [p[0] for p in scr]
        ys = [p[1] for p in scr]
        edges = list(zip(scr, scr[1:] + scr[:1]))
        # orientation du polygone pour le test des demi-plans
        area = sum(a[0] * b[1] - b[0] * a[1] for a, b in edges)
        sgn = 1 if area > 0 else -1
        for py in range(max(0, int(min(ys))), min(H, int(max(ys)) + 1)):
            fy = py + 0.5
            row = img[py]
            for px in range(max(0, int(min(xs))), min(W, int(max(xs)) + 1)):
                fx = px + 0.5
                if all(sgn * ((b[0] - a[0]) * (fy - a[1]) - (b[1] - a[1]) * (fx - a[0])) >= 0
                       for a, b in edges):
                    row[px] = col

    # fond dégradé + réduction (moyenne ss x ss)
    out = []
    for y in range(size):
        t = y / size
        bg = tuple(int(bg_top[i] * (1 - t) + bg_bot[i] * t) for i in range(3))
        row = []
        for x in range(size):
            acc = [0, 0, 0]
            for dy in range(ss):
                for dx in range(ss):
                    c = img[y * ss + dy][x * ss + dx] or bg
                    for i in range(3):
                        acc[i] += c[i]
            row.append(tuple(v // (ss * ss) for v in acc))
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


if __name__ == "__main__":
    here = Path(__file__).parent
    v = build()
    n = export_obj(v, here / "villager.obj")
    print(f"{len(v)} voxels, {n} faces -> villager.obj")
    write_rgb_png(here / "villager.png", render(v))
    print("rendu -> villager.png")
