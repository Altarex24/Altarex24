"""Épée en diamant 16x16 style Minecraft.

La lame est une bande diagonale de 3 px (clair / moyen / sombre) qui monte
vers la pointe en haut à droite ; la garde est perpendiculaire, la poignée
repart vers le bas à gauche. Les contours sont ajoutés automatiquement.

Usage : python diamond_sword.py  ->  diamond_sword.png (+ aperçu x16)
"""
from pathlib import Path

from emerald_pickaxe import N, neighbors4, write_png

PAL = {
    "K": (10, 50, 56, 255),     # contour lame
    "D": (26, 150, 150, 255),   # diamant sombre
    "M": (74, 228, 214, 255),   # diamant
    "L": (164, 250, 234, 255),  # diamant clair
    "W": (238, 255, 252, 255),  # reflet
    "o": (36, 24, 10, 255),     # contour poignée
    "h": (92, 64, 28, 255),     # bois foncé
    "H": (138, 100, 48, 255),   # bois clair
}


def paint(grid, shapes, outline_color):
    """shapes = [(ensemble de cases, couleur ou fonction(x, y) -> couleur)]."""
    union = set().union(*(c for c, _ in shapes))
    for (x, y) in union:
        for nx, ny in neighbors4(x, y):
            if 0 <= nx < N and 0 <= ny < N and (nx, ny) not in union:
                grid[ny][nx] = outline_color
    for c, color in shapes:
        for (x, y) in c:
            grid[y][x] = color(x, y) if callable(color) else color


def build():
    grid = [[None] * N for _ in range(N)]

    # --- Lame : chaque rangée y a 3 cases (clair, moyen, sombre) décalées d'un
    # pixel vers la gauche à chaque rangée ; pointe en (13..14, 1).
    light, mid, dark = set(), set(), set()
    for y in range(1, 10):
        light.add((13 - y, y))
        mid.add((14 - y, y))
        if y >= 2:
            dark.add((15 - y, y))
    paint(grid, [
        (light, lambda x, y: "W" if y in (2, 5) else "L"),
        (mid, "M"),
        (dark, "D"),
    ], "K")

    # --- Garde (perpendiculaire), poignée, pommeau
    guard = {(x, x + 4) for x in range(2, 8)} | {(x + 1, x + 4) for x in range(2, 7)}
    handle = {(4, 10), (3, 11), (2, 12)}
    handle_dark = {(4, 11), (3, 12)}
    pommel = {(1, 13), (2, 13), (1, 14)}
    paint(grid, [
        (guard, lambda x, y: "M" if x - y == -4 else "D"),
        (handle, "H"),
        (handle_dark, "h"),
        (pommel, lambda x, y: "L" if (x, y) == (1, 13) else "D"),
    ], "o")
    return grid


if __name__ == "__main__":
    here = Path(__file__).parent
    g = build()
    for row in g:
        print("".join(k or "." for k in row))
    write_png(here / "diamond_sword.png", g, pal=PAL)
    write_png(here / "diamond_sword_preview.png", g, scale=16, pal=PAL)
