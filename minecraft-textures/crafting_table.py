"""Table de craft en icône isométrique 16x16 (comme dans l'inventaire Minecraft).

Méthode pixel art (pas de projection flottante, qui crée des damiers) :
- silhouette du cube fixée ligne par ligne (dessus en losange 2:1) ;
- faces latérales = textures 8x8 cisaillées : chaque colonne descend d'un
  pixel toutes les deux colonnes, donc les motifs restent nets ;
- grille 3x3 du dessus = bandes à coordonnée isométrique constante.
Lumière venant du dessus : face gauche un peu sombre, face droite plus sombre.

Usage : python crafting_table.py  ->  crafting_table.png (+ aperçu x16)
"""
from pathlib import Path

from emerald_pickaxe import N, write_png

WOOD = {
    "T": (199, 162, 104),  # dessus clair
    "t": (178, 142, 88),   # dessus variation
    "g": (132, 94, 50),    # lignes de la grille
    "R": (96, 66, 34),     # rebord du plateau (vu de côté)
    "P": (170, 132, 80),   # planche
    "p": (128, 96, 56),    # joint de planche
    "G": (222, 222, 228),  # métal clair
    "m": (118, 118, 126),  # métal sombre
    "b": (80, 54, 26),     # manche d'outil
}
SHADE = {"top": 1.0, "left": 0.84, "right": 0.66}

# Largeur du dessus par ligne (centrée), rangées 0..7
TOP_WIDTH = [2, 6, 10, 14, 16, 12, 8, 4]
# Dernière rangée de chaque colonne (bas du cube, losange inversé)
BOTTOM = [11, 12, 12, 13, 13, 14, 14, 15, 15, 14, 14, 13, 13, 12, 12, 11]

# Faces latérales : s = colonne dans la face (0..7), t = rangée depuis l'arête haute
LEFT = [          # scie + marteau
    "RRRRRRRR",
    "PPPPPPPP",
    "PmGPPmmm",
    "PmGPPPbP",
    "pmGpppbp",
    "PmGPPPbP",
    "PPbPPPPP",
    "pppppppp",
]
RIGHT = [         # hache
    "RRRRRRRR",
    "PPPPPPPP",
    "PPPGGmPP",
    "PPPbGmPP",
    "pppbpppp",
    "PPPbPPPP",
    "PPPbPPPP",
    "pppppppp",
]


def top_mask():
    cells = set()
    for y, w in enumerate(TOP_WIDTH):
        x0 = (N - w) // 2
        cells |= {(x, y) for x in range(x0, x0 + w)}
    return cells


def render():
    img = [[None] * N for _ in range(N)]
    top = top_mask()

    # Faces latérales (tout ce qui est sous le dessus et au-dessus du bas)
    for x in range(N):
        start = max(y for (cx, y) in top if cx == x) + 1
        for y in range(start, BOTTOM[x] + 1):
            t = y - start
            if x < 8:
                k, face = LEFT[min(t, 7)][x], "left"
            else:
                k, face = RIGHT[min(t, 7)][x - 8], "right"
            img[y][x] = (k, face)

    # Dessus : bois + grille 3x3.
    # (a, b) = position le long des deux arêtes du losange, de 0 à 8 environ ;
    # une ligne de grille = une bande de largeur 1 à a ou b constant.
    for (x, y) in top:
        a = y + (x + 0.5 - 8) / 2
        b = y - (x + 0.5 - 8) / 2
        on_grid = any(lo <= v < lo + 1 for v in (a, b) for lo in (2, 5))
        k = "g" if on_grid else ("t" if (x + 2 * y) % 5 == 0 else "T")
        img[y][x] = (k, "top")

    out = []
    for row in img:
        line = []
        for c in row:
            if c is None:
                line.append(None)
            else:
                k, face = c
                r, g, b = WOOD[k]
                f = SHADE[face]
                line.append((round(r * f), round(g * f), round(b * f), 255))
        out.append(line)
    return out


if __name__ == "__main__":
    here = Path(__file__).parent
    img = render()
    pal = {c: c for row in img for c in row if c}  # la couleur sert de clé de palette
    write_png(here / "crafting_table.png", img, pal=pal)
    write_png(here / "crafting_table_preview.png", img, scale=16, pal=pal)
