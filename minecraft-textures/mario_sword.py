"""Épée « Mario » 16x16 : même forme que l'épée en diamant, aux couleurs de Mario.

Lame rouge casquette, garde bleu salopette avec boutons jaunes,
poignée marron chaussures, pommeau champignon rouge à pois blanc.

Usage : python mario_sword.py  ->  mario_sword.png (+ aperçu x16)
"""
from pathlib import Path

from diamond_sword import PAL, build
from emerald_pickaxe import write_png

MARIO = dict(PAL)
MARIO.update({
    "K": (70, 8, 8, 255),       # contour lame
    "D": (160, 16, 20, 255),    # rouge sombre
    "M": (226, 36, 36, 255),    # rouge casquette
    "L": (255, 104, 96, 255),   # rouge clair
    "W": (255, 255, 255, 255),  # blanc (reflet / pois du champignon)
    "B": (48, 92, 222, 255),    # bleu salopette
    "b": (24, 50, 140, 255),    # bleu sombre
    "Y": (255, 214, 40, 255),   # bouton jaune
    "h": (96, 52, 18, 255),     # marron chaussures
    "H": (140, 80, 30, 255),
})

if __name__ == "__main__":
    here = Path(__file__).parent
    g = build(guard_colors=("B", "b"))
    g[7][3] = "Y"    # boutons de salopette sur la garde
    g[9][6] = "Y"
    g[13][1] = "W"   # pois blanc du champignon
    for row in g:
        print("".join(k or "." for k in row))
    write_png(here / "mario_sword.png", g, pal=MARIO)
    write_png(here / "mario_sword_preview.png", g, scale=16, pal=MARIO)
