"""Construit fight.html : l'animation 3D « Le vol des émeraudes ».

Exporte les modèles voxel (villageois, zombie) et les objets (épée en diamant,
émeraude, extrudés en 1 voxel d'épaisseur comme les objets tenus en main dans
Minecraft) en JSON compact, puis l'injecte dans fight_template.html.
Chaque face visible = [x, y, z, n, c] : coin du voxel, indice de normale,
indice de couleur dans la palette du modèle.

Usage : python build_fight.py  ->  fight.html
"""
import json
from pathlib import Path

import diamond_sword
import emerald
import emerald_pickaxe
import villager
import zombie
from voxel3d import FACES, Part

NORMALS = list(FACES)  # même ordre que dans le JavaScript


def export_parts(parts):
    palette, index, out = [], {}, {}
    for name, part in parts.items():
        faces = []
        for (x, y, z), color in part.vox.items():
            color = tuple(color[:3])
            if color not in index:
                index[color] = len(palette)
                palette.append(list(color))
            for ni, n in enumerate(NORMALS):
                if (x + n[0], y + n[1], z + n[2]) not in part.vox:
                    faces += [x, y, z, ni, index[color]]
        out[name] = {"pivot": list(part.pivot), "faces": faces}
    return {"palette": palette, "parts": out}


def sprite_part(grid, pal):
    """Sprite 16x16 -> voxels (x, 15 - y, 0) : un objet tenu en main."""
    part = Part()
    for y, row in enumerate(grid):
        for x, k in enumerate(row):
            if k:
                part.set(x, 15 - y, 0, pal[k][:3])
    return {"main": part}


def main():
    here = Path(__file__).parent
    data = {
        "villager": export_parts(villager.build_rig()),
        "zombie": export_parts(zombie.build_rig()),
        "sword": export_parts(sprite_part(diamond_sword.build(), diamond_sword.PAL)),
        "emerald": export_parts(sprite_part(emerald.build(), emerald_pickaxe.PAL)),
    }
    payload = json.dumps(data, separators=(",", ":"))
    html = (here / "fight_template.html").read_text().replace("/*DATA*/", payload)
    (here / "fight.html").write_text(html)
    n = sum(len(p["faces"]) // 5 for m in data.values() for p in m["parts"].values())
    print(f"{n} faces, {len(html) // 1024} Ko -> fight.html")


if __name__ == "__main__":
    main()
