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


def build_rig():
    """Pièces articulées du villageois (nom -> Part, pivot compris), sans pose."""
    rig = {}
    # Jambes (visibles sous la robe), chaussures plus sombres ; pivot sous la robe
    for name, x0, seed in (("leg_l", 0, 1), ("leg_r", 4, 2)):
        leg = Part(seed=seed, pivot=(x0 + 2, 6, 3))
        leg.box(x0, x0 + 4, 0, 6, 1, 5, lambda x, y, z: (40, 34, 30) if y < 2 else PANTS)
        rig[name] = leg

    # Robe : ourlet sombre, col clair, fente centrale devant
    def robe(x, y, z):
        if y < 8:
            return ROBE_D
        if y >= 22:
            return ROBE_L
        if z == 5 and x in (3, 4) and y < 15:
            return ROBE_D
        return ROBE
    body = Part(seed=3)
    body.box(0, 8, 6, 24, 0, 6, robe)
    rig["body"] = body

    head = Part(seed=4, pivot=(4, 24, 3))
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
    rig["head"] = head

    # Bras croisés : pendent de l'épaule ; la pose (~ -43°) les pivote vers l'avant
    arms = Part(seed=5, pivot=(4, 21, 4))
    for x0 in (-4, 8):
        arms.box(x0, x0 + 4, 15, 23, 2, 6, lambda x, y, z: ROBE_D if y == 15 else ROBE)
    arms.box(0, 8, 15, 19, 2, 6, lambda x, y, z: SKIN_D if y == 15 else SKIN)
    rig["arms_crossed"] = arms

    # Bras séparés (pour se battre) : manche + main, pivot à l'épaule
    for name, x0, seed in (("arm_l", -4, 6), ("arm_r", 8, 7)):
        arm = Part(seed=seed, pivot=(x0 + 2, 22, 3))
        arm.box(x0, x0 + 4, 14, 24, 1, 5, lambda x, y, z: ROBE_D if y == 14 else ROBE)
        arm.box(x0, x0 + 4, 10, 14, 1, 5, lambda x, y, z: SKIN_D if y == 10 else SKIN)
        rig[name] = arm
    return rig


def build():
    """Pose d'inventaire : bras croisés inclinés vers l'avant."""
    rig = build_rig()
    rig["arms_crossed"].angle = -43
    return [rig[k] for k in ("leg_l", "leg_r", "body", "head", "arms_crossed")]


if __name__ == "__main__":
    here = Path(__file__).parent
    parts = build()
    n = export_obj(parts, here / "villager.obj", "Villageois fermier Minecraft")
    front = render(parts, size=560, yaw=-35)
    back = render(parts, size=560, yaw=145)
    write_rgb_png(here / "villager.png", side_by_side(front, back))
    print(f"{n} faces -> villager.obj, rendu -> villager.png")
