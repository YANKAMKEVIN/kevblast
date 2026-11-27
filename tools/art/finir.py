#!/usr/bin/env python3
"""Kevblast : finit les images brutes de Codex.
Usage : python finir.py PROMPTS_JSON DOSSIER_BRUT DOSSIER_SORTIE [fichier ...]
- recadre (centre, cover) puis redimensionne à la taille exacte demandée ;
- si detourer : fond magenta #FF00FF -> transparent (tolérance + bord adouci + suppression du halo rose) ;
- enregistre <fichier>.webp qualité 85 ;
- si decouper (fiche de modèle d'un héros) : sépare les vues posées côte à côte (colonnes
  vides entre elles), recadre chacune au plus juste et enregistre heros_<id>_<vue>.webp,
  hauteur SPRITE_H (le jeu les affiche à ~58 px, ~116 px sur écran Retina).
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

TOL_DUR, TOL_DOUX = 45.0, 95.0
SPRITE_H = 192  # distance RGB au magenta : <dur = transparent, >doux = opaque

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

def vues(img, n):
    """Les n plus larges blocs de colonnes non vides, de gauche à droite."""
    a = np.asarray(img)[..., 3] > 40
    cols = a.sum(0) > 2
    blocs, debut = [], None
    for x, plein in enumerate(list(cols) + [False]):
        if plein and debut is None: debut = x
        if not plein and debut is not None: blocs.append((debut, x)); debut = None
    # fusionne les blocs séparés par un trou étroit (un bras, une étincelle détachée)
    fus = []
    for b in blocs:
        if fus and b[0] - fus[-1][1] < img.width * 0.02: fus[-1] = (fus[-1][0], b[1])
        else: fus.append(b)
    fus = sorted(sorted(fus, key=lambda b: b[1] - b[0], reverse=True)[:n])
    if len(fus) != n: raise SystemExit(f"{n} vues attendues, {len(fus)} trouvées")
    out = []
    for x0, x1 in fus:
        v = img.crop((x0, 0, x1, img.height)); bb = v.getbbox(); v = v.crop(bb)
        out.append(v.resize((max(1, round(v.width * SPRITE_H / v.height)), SPRITE_H), Image.LANCZOS))
    return out

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
        if im.get("decouper"):
            hid = im["fichier"].split("_", 1)[1]
            for nom, v in zip(im["decouper"], vues(img, len(im["decouper"]))):
                dst = Path(sortie) / f"heros_{hid}_{nom}.webp"
                v.save(dst, "WEBP", quality=88, method=6)
                print(f"{dst.name} {v.width}x{v.height} {dst.stat().st_size // 1024} Ko")
            continue
        dst = Path(sortie) / f"{im['fichier']}.webp"
        img.save(dst, "WEBP", quality=85, method=6)
        print(f"{dst.name} {w}x{h} {dst.stat().st_size // 1024} Ko")

if __name__ == "__main__":
    main()
