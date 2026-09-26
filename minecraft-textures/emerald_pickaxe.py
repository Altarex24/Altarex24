"""Génère une texture 16x16 style Minecraft d'une pioche en émeraude.

Aucune dépendance : le PNG est écrit à la main (zlib + struct).
Usage : python emerald_pickaxe.py  ->  emerald_pickaxe.png (+ aperçu x16)
"""
import struct
import zlib
from pathlib import Path

N = 16

# Palette (RGBA)
PAL = {
    "K": (8, 56, 30, 255),      # contour tête (vert très foncé)
    "D": (18, 128, 62, 255),    # émeraude sombre
    "M": (23, 184, 86, 255),    # émeraude moyenne
    "L": (65, 232, 128, 255),   # émeraude claire
    "W": (190, 255, 214, 255),  # reflet
    "o": (40, 30, 11, 255),     # contour manche
    "h": (104, 78, 30, 255),    # manche foncé
    "H": (137, 103, 39, 255),   # manche clair
}


def mirror(x, y):
    """Symétrie par rapport à l'anti-diagonale x + y = 15."""
    return 15 - y, 15 - x


def neighbors4(x, y):
    return ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))


def build():
    grid = [[None] * N for _ in range(N)]

    # --- Manche : escalier diagonal de 2 px, du bas-gauche vers le centre ---
    light = {(x, 14 - x) for x in range(1, 10)}
    dark = {(x, 15 - x) for x in range(2, 11)}
    handle = light | dark
    for (x, y) in handle:
        for nx, ny in neighbors4(x, y):
            if 0 <= nx < N and 0 <= ny < N and (nx, ny) not in handle:
                grid[ny][nx] = "o"
    for (x, y) in light:
        grid[y][x] = "H"
    for (x, y) in dark:
        grid[y][x] = "h"

    # --- Tête : moitié haute, puis symétrie pour la branche droite ---
    half = set()
    half |= {(x, 2) for x in range(4, 11)}
    half |= {(x, 3) for x in range(8, 12)}
    half |= {(x, 4) for x in range(10, 13)}
    head = half | {mirror(x, y) for (x, y) in half}

    for (x, y) in head:
        for nx, ny in neighbors4(x, y):
            if 0 <= nx < N and 0 <= ny < N and (nx, ny) not in head:
                grid[ny][nx] = "K"

    # Ombrage à la main : lumière venant du haut-gauche,
    # la branche du haut est claire, celle de droite s'assombrit vers la pointe.
    shade = [
        "WWLLLLM",   # y=2, x=4..10
        "MLMM",      # y=3, x=8..11
        "DLM",       # y=4, x=10..12
    ]
    for (x0, y), row in zip(((4, 2), (8, 3), (10, 4)), shade):
        for i, c in enumerate(row):
            grid[y][x0 + i] = c
    for y, c in zip(range(5, 12), "LMMMDDD"):  # x=13 (bord extérieur)
        grid[y][13] = c
    for y, c in zip(range(5, 8), "MDD"):       # x=12 (bord intérieur)
        grid[y][12] = c
    grid[5][11] = "D"
    return grid


def write_png(path, grid, scale=1):
    w = h = N * scale
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            k = grid[y // scale][x // scale]
            raw.extend(PAL[k] if k else (0, 0, 0, 0))

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    Path(path).write_bytes(png)


if __name__ == "__main__":
    here = Path(__file__).parent
    g = build()
    for row in g:
        print("".join(k or "." for k in row))
    write_png(here / "emerald_pickaxe.png", g)
    write_png(here / "emerald_pickaxe_preview.png", g, scale=16)
