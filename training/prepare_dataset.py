"""Convertit un export Torii (.torii-data + .torii-trad) en dataset YOLO (détection de texte).

Les fichiers d'entrée ne sont jamais modifiés : tout est écrit dans --out.

Règles de filtrage :
  - page absente du .torii-trad  -> page ignorée (on ne sait pas quelles bulles sont traduites)
  - bulle dont la traduction est vide -> bulle retirée (logos, dates, crédits, SFX non traduits...)
  - page sans aucune bulle restante -> gardée comme image "négative" (label vide)

Découpage train/val par chapitre (jamais par page) pour éviter les fuites entre les deux.

Usage :
  python prepare_dataset.py --data X.torii-data --trad X.torii-trad --images DOSSIER_IMAGES --out dataset
  (images attendues dans DOSSIER_IMAGES/<nom du chapitre>/<image>, ex. "Vol. 1 Ch. 1/00.png")
"""

import argparse
import json
import re
import shutil
from pathlib import Path

CLASS_NAMES = ["texte"]


def load_json(path):
    with open(path, encoding="utf-8-sig") as f:
        return json.load(f)


def safe_name(s):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", s).strip("_")


def box_to_yolo(b, width, height):
    x1, x2 = sorted((max(0, b["x1"]), min(width, b["x2"])))
    y1, y2 = sorted((max(0, b["y1"]), min(height, b["y2"])))
    if x2 - x1 < 2 or y2 - y1 < 2:
        return None
    cx = (x1 + x2) / 2 / width
    cy = (y1 + y2) / 2 / height
    return f"0 {cx:.6f} {cy:.6f} {(x2 - x1) / width:.6f} {(y2 - y1) / height:.6f}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--trad", required=True)
    ap.add_argument("--images", help="dossier racine des images (sans lui : labels seuls, pour vérifier)")
    ap.add_argument("--out", default="dataset")
    ap.add_argument("--val-every", type=int, default=8, help="1 chapitre sur N part en validation")
    args = ap.parse_args()

    data = load_json(args.data)
    trad = load_json(args.trad)["ch"]
    out = Path(args.out)
    for split in ("train", "val"):
        (out / "images" / split).mkdir(parents=True, exist_ok=True)
        (out / "labels" / split).mkdir(parents=True, exist_ok=True)

    stats = {"pages": 0, "pages_sans_trad": 0, "images_manquantes": 0,
             "bulles": 0, "bulles_vides_retirees": 0, "val_chapitres": []}

    for ci, chapter in enumerate(data["chapters"]):
        split = "val" if ci % args.val_every == args.val_every - 1 else "train"
        if split == "val":
            stats["val_chapitres"].append(chapter["name"])
        chapter_trad = trad.get(chapter["name"], {})

        for page in chapter["pages"]:
            entries = chapter_trad.get(page["image"])
            if entries is None or len(entries) != len(page["text_boxes"]):
                stats["pages_sans_trad"] += 1
                continue

            src = Path(args.images) / chapter["name"] / page["image"] if args.images else None
            if src is not None and not src.is_file():
                stats["images_manquantes"] += 1
                continue

            lines = []
            # .torii-trad est dans le même ordre que text_boxes : [id, original, traduction]
            for box, (_, _, translation) in zip(page["text_boxes"], entries):
                if not translation.strip():
                    stats["bulles_vides_retirees"] += 1
                    continue
                line = box_to_yolo(box, page["width"], page["height"])
                if line:
                    lines.append(line)

            stem = f"{safe_name(chapter['name'])}__{Path(page['image']).stem}"
            (out / "labels" / split / f"{stem}.txt").write_text("\n".join(lines), encoding="utf-8")
            if src is not None:
                shutil.copy2(src, out / "images" / split / f"{stem}{src.suffix}")
            stats["pages"] += 1
            stats["bulles"] += len(lines)

    (out / "data.yaml").write_text(
        f"path: {out.resolve().as_posix()}\ntrain: images/train\nval: images/val\n"
        + "names:\n" + "".join(f"  {i}: {n}\n" for i, n in enumerate(CLASS_NAMES)),
        encoding="utf-8",
    )

    for k, v in stats.items():
        print(f"{k}: {v}")
    if not args.images:
        print("\n(--images non fourni : seuls les labels ont été générés)")


if __name__ == "__main__":
    main()
