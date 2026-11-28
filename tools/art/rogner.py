#!/usr/bin/env python3
"""Rogne les objets détourés des arènes au plus juste (le jeu les pose par le bas de leur case).
Usage : python rogner.py art/arenes/pilier_*.webp art/arenes/caisse_*.webp art/arenes/borne_*.webp
Recadre sur la zone non transparente (marge 2 px), puis réenregistre en WebP qualité 90."""
import sys
from PIL import Image

for f in sys.argv[1:]:
    im = Image.open(f).convert("RGBA")
    a = im.getchannel("A").point(lambda v: 255 if v > 24 else 0)
    bb = a.getbbox()
    if not bb: print("vide", f); continue
    l, t, r, b = bb
    bb = (max(0, l - 2), max(0, t - 2), min(im.width, r + 2), min(im.height, b + 2))
    out = im.crop(bb)
    out.save(f, "WEBP", quality=90, method=6)
    print(f"{f} {im.size} -> {out.size}")
