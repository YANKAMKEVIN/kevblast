// @ts-check
/** Hasard du jeu, reproductible : seed(n) rejoue exactement la même partie (tests, robot de la CI). */

let s = (Math.random() * 2 ** 32) >>> 0;

/** @param {number} n */
export function seed(n) { s = n >>> 0; }

/** Nombre dans [0, 1[ (mulberry32). */
export function rnd() {
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** @param {number} v @param {number} a @param {number} b */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
