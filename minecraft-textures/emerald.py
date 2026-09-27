"""Émeraude (objet) 16x16 style Minecraft : gemme verticale à facettes.

Silhouette : hexagone allongé défini par sa demi-largeur à chaque rangée.
Facettes : bande gauche claire, bande centrale moyenne, bande droite sombre ;
le haut de la gemme est plus lumineux, le bas plus sombre (lumière haut-gauche).

Usage : python emerald.py  ->  emerald.png (+ aperçu x16)
"""
from pathlib import Path

from emerald_pickaxe import N, PAL, neighbors4, write_png

# Demi-largeur de la gemme pour les rangées 1..14 (centre entre x=7 et x=8)
HALF = [1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 4, 3, 2, 1]
TOP, BOTTOM = 1, 1 + len(HALF) - 1


def build():
    shape = set()
    for i, h in enumerate(HALF):
        y = TOP + i
        shape |= {(x, y) for x in range(8 - h, 8 + h)}

    grid = [[None] * N for _ in range(N)]
    for (x, y) in shape:
        if any(n not in shape for n in neighbors4(x, y)):
            grid[y][x] = "K"
            continue
        dx = x - 7.5
        if dx < -1.5:
            c = "L"          # facette gauche (éclairée)
        elif dx > 1.5:
            c = "D"          # facette droite (ombre)
        else:
            c = "M"          # table centrale
        if y <= 4:                         # biseau du haut : plus clair
            c = {"L": "W", "M": "L", "D": "M"}[c]
        if y >= 11:                        # biseau du bas : plus sombre
            c = {"L": "M", "M": "D", "D": "D"}[c]
        grid[y][x] = c

    # Reflets
    for (x, y) in [(5, 5), (5, 6), (8, 8)]:
        grid[y][x] = "W"
    return grid


if __name__ == "__main__":
    here = Path(__file__).parent
    g = build()
    for row in g:
        print("".join(k or "." for k in row))
    write_png(here / "emerald.png", g)
    write_png(here / "emerald_preview.png", g, scale=16)
