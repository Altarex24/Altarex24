"""Bâton planté dans une cuisse de poulet rôtie (16x16, style Minecraft).

Usage : python chicken_stick.py  ->  chicken_stick.png (+ aperçu x16)
"""
from pathlib import Path

from chicken_pickaxe import CHICKEN
from emerald_pickaxe import N, neighbors4, write_png

PAL = dict(CHICKEN)
PAL["O"] = (92, 84, 70, 255)  # contour de l'os


def outline(grid, cells, color, skip=()):
    for (x, y) in cells:
        for nx, ny in neighbors4(x, y):
            if 0 <= nx < N and 0 <= ny < N and (nx, ny) not in cells and (nx, ny) not in skip:
                grid[ny][nx] = color


def build():
    grid = [[None] * N for _ in range(N)]

    # --- Bâton : diagonale de 2 px qui rentre dans la viande ---
    light = {(x, 14 - x) for x in range(1, 8)}
    dark = {(x, 15 - x) for x in range(2, 9)}
    stick = light | dark
    outline(grid, stick, "o")
    for (x, y) in light:
        grid[y][x] = "H"
    for (x, y) in dark:
        grid[y][x] = "h"

    # --- Viande : ellipse inclinée le long de la diagonale ---
    cx, cy, a, b = 8.0, 7.5, 4.3, 3.1
    meat = set()
    for y in range(N):
        for x in range(N):
            u = ((x - cx) - (y - cy)) / 2 ** 0.5  # axe long (bas-gauche -> haut-droite)
            v = ((x - cx) + (y - cy)) / 2 ** 0.5  # axe court
            if (u / a) ** 2 + (v / b) ** 2 <= 1:
                meat.add((x, y))
    outline(grid, meat, "K")
    for (x, y) in meat:
        # lumière du haut-gauche : plus on va vers le bas-droite, plus c'est foncé
        t = (x - cx) + (y - cy)
        edge = any(n not in meat for n in neighbors4(x, y))
        if t <= -3:
            c = "W"
        elif t <= -1:
            c = "L"
        elif t <= 1.5:
            c = "M"
        else:
            c = "D"
        if edge and c in "WL" and t > -4:
            c = "M" if c == "L" else "L"
        grid[y][x] = c
    grid[5][7] = "W"  # reflet

    # --- Os : dépasse en haut à droite, avec les deux bosses au bout ---
    bone = {(11, 4), (12, 3), (12, 4), (13, 3),       # tige
            (13, 1), (14, 2), (13, 2), (14, 3), (12, 2)}  # bosses
    outline(grid, bone, "O", skip=meat)
    for (x, y) in bone:
        grid[y][x] = "b" if x + y >= 16 else "B"

    return grid


if __name__ == "__main__":
    here = Path(__file__).parent
    g = build()
    for row in g:
        print("".join(k or "." for k in row))
    write_png(here / "chicken_stick.png", g, pal=PAL)
    write_png(here / "chicken_stick_preview.png", g, scale=16, pal=PAL)
