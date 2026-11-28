// @ts-check
/**
 * Éclairage des arènes : une nappe d'obscurité teintée (à mi-résolution, pour les téléphones)
 * percée par les sources de lumière, puis un halo coloré additif autour de chacune.
 * Les dégradés radiaux sont précalculés une fois en petites images : chaque lumière ne coûte
 * qu'un drawImage par passe.
 */
import { COLS, ROWS, T } from './config.js';

/**
 * Une source de lumière, en cases. `a` : intensité (0 à 1). `col` : couleur du halo (rien = pas de halo).
 * @typedef {{x:number,y:number,r:number,a:number,col?:string,g?:number}} Light
 */

/** Résolution de la nappe d'obscurité par rapport au plateau (la lumière est floue : moitié suffit). */
export const LIGHT_SCALE = .5;
const SPR = 64;

/** @type {HTMLCanvasElement} */ let shadeC;
/** @type {CanvasRenderingContext2D} */ let sctx;
/** @type {HTMLCanvasElement} */ let hole;
/** @type {Map<string, HTMLCanvasElement>} */
const halos = new Map();

/** Dégradé radial blanc -> transparent, en image. @param {string} col */
function radial(col) {
  const c = document.createElement('canvas'); c.width = c.height = SPR;
  const x = /** @type {CanvasRenderingContext2D} */ (c.getContext('2d'));
  const g = x.createRadialGradient(SPR / 2, SPR / 2, 0, SPR / 2, SPR / 2, SPR / 2);
  g.addColorStop(0, col); g.addColorStop(.45, col.length === 7 ? col + 'aa' : col); g.addColorStop(1, col.length === 7 ? col + '00' : 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, SPR, SPR);
  return c;
}

/** Halo coloré (mis en cache par couleur). @param {string} col */
export function haloSprite(col) {
  let h = halos.get(col);
  if (!h) { h = radial(col); halos.set(col, h); }
  return h;
}

/** @param {number} dpr */
export function initLight(dpr) {
  shadeC = document.createElement('canvas');
  shadeC.width = Math.ceil(COLS * T * dpr * LIGHT_SCALE); shadeC.height = Math.ceil(ROWS * T * dpr * LIGHT_SCALE);
  sctx = /** @type {CanvasRenderingContext2D} */ (shadeC.getContext('2d'));
  hole = radial('#000000');
}

/**
 * Pose l'obscurité ambiante puis les halos sur la scène.
 * @param {CanvasRenderingContext2D} ctx contexte du plateau (coordonnées en pixels de jeu)
 * @param {{dark:number,shade:string}} amb obscurité (0 à 1) et sa teinte
 * @param {Light[]} lights
 * @param {number} glow force des halos colorés (0 à 1)
 */
export function drawLighting(ctx, amb, lights, glow) {
  if (amb.dark > 0 && sctx) {
    const k = shadeC.width / (COLS * T);
    sctx.setTransform(k, 0, 0, k, 0, 0);
    sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1;
    sctx.clearRect(0, 0, COLS * T, ROWS * T);
    sctx.fillStyle = amb.shade; sctx.globalAlpha = amb.dark; sctx.fillRect(0, 0, COLS * T, ROWS * T);
    sctx.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      sctx.globalAlpha = Math.min(1, l.a); const r = l.r * T;
      sctx.drawImage(hole, l.x * T - r, l.y * T - r, r * 2, r * 2);
    }
    sctx.globalCompositeOperation = 'source-over'; sctx.globalAlpha = 1;
    ctx.drawImage(shadeC, 0, 0, COLS * T, ROWS * T);
  }
  if (glow <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    if (!l.col) continue;
    ctx.globalAlpha = Math.min(1, l.a * glow * (l.g ?? 1)); const r = l.r * T * .8;
    ctx.drawImage(haloSprite(l.col), l.x * T - r, l.y * T - r, r * 2, r * 2);
  }
  ctx.restore();
}
