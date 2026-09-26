"""Variante : pioche en poulet rôti (même forme que la pioche en émeraude).

Les deux pointes de la tête sont des bouts d'os, comme un pilon.
Usage : python chicken_pickaxe.py  ->  chicken_pickaxe.png (+ aperçu x16)
"""
from pathlib import Path

from emerald_pickaxe import PAL, build, write_png

CHICKEN = dict(PAL)
CHICKEN.update({
    "K": (70, 34, 10, 255),     # contour (croûte brûlée)
    "D": (150, 78, 26, 255),    # rôti foncé
    "M": (201, 120, 48, 255),   # rôti
    "L": (234, 170, 86, 255),   # doré
    "W": (255, 221, 148, 255),  # reflet gras
    "B": (244, 238, 222, 255),  # os
    "b": (196, 186, 164, 255),  # os ombré
})

if __name__ == "__main__":
    here = Path(__file__).parent
    g = build()
    # Bouts d'os aux deux pointes
    g[2][4], g[2][5] = "B", "b"
    g[11][13], g[10][13] = "b", "b"
    g[12][13] = "K"
    for row in g:
        print("".join(k or "." for k in row))
    write_png(here / "chicken_pickaxe.png", g, pal=CHICKEN)
    write_png(here / "chicken_pickaxe_preview.png", g, scale=16, pal=CHICKEN)
