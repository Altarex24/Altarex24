"""Entraîne un détecteur de texte YOLO26 sur le dataset produit par prepare_dataset.py.

  pip install ultralytics
  python train.py --data dataset/data.yaml
"""

import argparse

from ultralytics import YOLO


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="dataset/data.yaml")
    ap.add_argument("--model", default="yolo26n.pt", help="yolo26n.pt (rapide) ou yolo26s.pt (plus précis)")
    ap.add_argument("--imgsz", type=int, default=1024)
    ap.add_argument("--epochs", type=int, default=100)
    ap.add_argument("--batch", type=int, default=8)
    args = ap.parse_args()

    model = YOLO(args.model)
    model.train(
        data=args.data,
        imgsz=args.imgsz,
        epochs=args.epochs,
        batch=args.batch,
        patience=20,
        fliplr=0.0,  # un texte en miroir n'existe pas dans un vrai manga
        name="texte_manga",
    )
    model.export(format="onnx")  # pour l'utiliser ensuite depuis l'appli Electron (onnxruntime)


if __name__ == "__main__":
    main()
