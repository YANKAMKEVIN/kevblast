#!/usr/bin/env python3
"""Kevblast : finit les images brutes de Codex.
Usage : python finir.py PROMPTS_JSON DOSSIER_BRUT DOSSIER_SORTIE [fichier ...]
- recadre (centre, cover) puis redimensionne à la taille exacte demandée ;
- si detourer : fond magenta #FF00FF -> transparent (tolérance + bord adouci + suppression du halo rose) ;
- enregistre <fichier>.webp qualité 85.
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

TOL_DUR, TOL_DOUX = 45.0, 95.0  # distance RGB au magenta : <dur = transparent, >doux = opaque

def cover(img, w, h):
    sw, sh = img.size
    r = max(w / sw, h / sh)
    img = img.resize((round(sw * r), round(sh * r)), Image.LANCZOS)
    l, t = (img.width - w) // 2, (img.height - h) // 2
    return img.crop((l, t, l + w, t + h))

def detourer(img):
    a = np.asarray(img.convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # distance au magenta pur
    d = np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)
    alpha = np.clip((d - TOL_DUR) / (TOL_DOUX - TOL_DUR), 0, 1)
    # adoucissement léger du bord
    am = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    alpha = np.asarray(am).astype(np.float32) / 255
    alpha[d < TOL_DUR * 0.8] = 0
    # dé-contamination : retire la part de magenta mélangée dans les pixels de bord
    mag = np.array([255, 0, 255], np.float32)
    bord = (alpha > 0) & (alpha < 1)
    with np.errstate(divide="ignore", invalid="ignore"):
        rec = (a - (1 - alpha[..., None]) * mag) / np.maximum(alpha[..., None], 1e-3)
    a = np.where(bord[..., None], np.clip(rec, 0, 255), a)
    # anti-halo : sur les bords, limite r et b au-dessus de g (teinte rose résiduelle)
    spill = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
    lim = bord & (spill > 40)
    a[..., 0] = np.where(lim, a[..., 0] - (spill - 40) * 0.5, a[..., 0])
    a[..., 2] = np.where(lim, a[..., 2] - (spill - 40) * 0.5, a[..., 2])
    out = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out)

def main():
    js, brut, sortie, *noms = sys.argv[1:]
    d = json.load(open(js)); Path(sortie).mkdir(parents=True, exist_ok=True)
    for im in d["images"]:
        if noms and im["fichier"] not in noms: continue
        src = Path(brut) / f"{im['fichier']}.png"
        if not src.exists(): print("absent", src); continue
        w, h = map(int, im["taille"].split("x"))
        img = cover(Image.open(src).convert("RGB"), w, h)
        if im.get("detourer"): img = detourer(img)
        dst = Path(sortie) / f"{im['fichier']}.webp"
        img.save(dst, "WEBP", quality=85, method=6)
        print(f"{dst.name} {w}x{h} {dst.stat().st_size // 1024} Ko")

if __name__ == "__main__":
    main()
