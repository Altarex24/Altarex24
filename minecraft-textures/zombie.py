"""Zombie Minecraft en 3D (voxels) -> zombie.obj + zombie.png.

Modèle type joueur : tête 8x8x8, corps 8x12x4, bras 4x12x4 tendus vers
l'avant (légèrement désynchronisés), jambes 4x12x4.
Peau verte, t-shirt cyan à manches courtes, pantalon bleu, chaussures grises.

Usage : python zombie.py
"""
from pathlib import Path

from voxel3d import Part, export_obj, render, side_by_side, write_rgb_png

SKIN = (82, 138, 64)
SKIN_D = (60, 108, 46)
HAIR = (44, 78, 34)
EYE = (18, 22, 16)
SHIRT = (0, 172, 170)
SHIRT_D = (0, 136, 136)
PANTS = (64, 62, 160)
PANTS_D = (48, 46, 124)
SHOES = (92, 92, 92)


def build():
    legs = Part(seed=11)
    for x0 in (0, 4):
        legs.box(x0, x0 + 4, 0, 12, 0, 4,
                 lambda x, y, z: SHOES if y < 2 else PANTS_D if x in (3, 4) else PANTS)

    body = Part(seed=12)
    body.box(0, 8, 12, 24, 0, 4,
             lambda x, y, z: PANTS if y < 13 else SHIRT_D if y == 13 or y == 23 else SHIRT)
    body.set(3, 20, 3, body.jitter(SHIRT_D))  # déchirures du t-shirt
    body.set(5, 17, 3, body.jitter(SHIRT_D))
    body.set(2, 15, 3, body.jitter(SKIN_D))

    head = Part(seed=13)

    def face(x, y, z):
        if y >= 31 or (y == 30 and z < 6):
            return HAIR                        # « cheveux » / crâne plus sombre
        return SKIN
    head.box(0, 8, 24, 32, -2, 6, face)
    for x in (1, 2, 5, 6):                     # yeux enfoncés
        head.set(x, 28, 5, EYE)
    head.set(2, 27, 5, head.jitter(SKIN_D))
    head.set(5, 27, 5, head.jitter(SKIN_D))
    for x in (3, 4):                           # nez
        head.set(x, 27, 5, head.jitter(SKIN_D))
    for x in range(2, 6):                      # bouche
        head.set(x, 25, 5, head.jitter(HAIR))

    parts = [legs, body, head]
    # Bras tendus : pendent de l'épaule (pivot y=22) puis tournent vers l'avant
    for x0, angle, seed in ((-4, -88, 14), (8, -78, 15)):
        arm = Part(seed=seed, angle=angle, pivot=(0, 22, 2))
        arm.box(x0, x0 + 4, 12, 24, 0, 4,
                lambda x, y, z: SHIRT if y >= 20 else SKIN_D if y < 13 else SKIN)
        parts.append(arm)
    return parts


if __name__ == "__main__":
    here = Path(__file__).parent
    parts = build()
    n = export_obj(parts, here / "zombie.obj", "Zombie Minecraft")
    front = render(parts, size=560, yaw=-35)
    side = render(parts, size=560, yaw=-100)
    write_rgb_png(here / "zombie.png", side_by_side(front, side))
    print(f"{n} faces -> zombie.obj, rendu -> zombie.png")
