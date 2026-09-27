"""Villageois fermier Minecraft en 3D (voxels) -> villager.obj + villager.png.

Proportions du modèle du jeu : jambes 12, robe 18 (dont 6 sur les jambes),
tête 8x10x8, nez 2x4x2, bras croisés inclinés de ~43° vers l'avant,
chapeau de paille de fermier.

Usage : python villager.py
"""
from pathlib import Path

from voxel3d import Part, export_obj, render, side_by_side, write_rgb_png

SKIN = (189, 139, 110)
SKIN_D = (158, 108, 82)
ROBE = (112, 76, 52)
ROBE_D = (84, 55, 37)
ROBE_L = (138, 98, 66)
PANTS = (58, 50, 46)
EYE_W = (245, 245, 245)
EYE_G = (38, 150, 70)
BROW = (66, 40, 28)
STRAW = (222, 188, 96)
STRAW_D = (184, 146, 62)
BAND = (120, 70, 36)


def build():
    body = Part(seed=1)
    # Jambes (visibles sous la robe) avec chaussures plus sombres
    for x0 in (0, 4):
        body.box(x0, x0 + 4, 0, 6, 1, 5, lambda x, y, z: (40, 34, 30) if y < 2 else PANTS)
    # Robe : ourlet sombre, col clair, fente centrale devant
    def robe(x, y, z):
        if y < 8:
            return ROBE_D
        if y >= 22:
            return ROBE_L
        if z == 5 and x in (3, 4) and y < 15:
            return ROBE_D
        return ROBE
    body.box(0, 8, 6, 24, 0, 6, robe)

    head = Part(seed=2)
    head.box(0, 8, 24, 34, -1, 7, SKIN)
    for x, c in [(1, EYE_W), (2, EYE_G), (5, EYE_G), (6, EYE_W)]:
        head.set(x, 29, 6, c)
    for x in range(1, 7):
        head.set(x, 30, 6, head.jitter(BROW, 6))
    for x in range(8):
        head.set(x, 25, 6, head.jitter(SKIN_D, 6))  # ombre sous les joues
    head.box(3, 5, 24, 28, 7, 9, SKIN_D)             # nez
    # Chapeau de paille : calotte + bandeau + large bord
    head.box(-1, 9, 33, 36, -2, 8,
             lambda x, y, z: BAND if y == 33 else STRAW_D if (x + z) % 3 == 0 else STRAW)
    head.box(-4, 12, 32, 33, -5, 11,
             lambda x, y, z: STRAW_D if (x * 7 + z * 3) % 5 == 0 else STRAW)

    # Bras croisés : pendent de l'épaule puis pivotent vers l'avant
    arms = Part(seed=3, angle=-43, pivot=(4, 21, 4))
    for x0 in (-4, 8):
        arms.box(x0, x0 + 4, 15, 23, 2, 6, lambda x, y, z: ROBE_D if y == 15 else ROBE)
    arms.box(0, 8, 15, 19, 2, 6, lambda x, y, z: SKIN_D if y == 15 else SKIN)
    return [body, head, arms]


if __name__ == "__main__":
    here = Path(__file__).parent
    parts = build()
    n = export_obj(parts, here / "villager.obj", "Villageois fermier Minecraft")
    front = render(parts, size=560, yaw=-35)
    back = render(parts, size=560, yaw=145)
    write_rgb_png(here / "villager.png", side_by_side(front, back))
    print(f"{n} faces -> villager.obj, rendu -> villager.png")
