// @ts-check
/** Sauvegarde versionnée (réglages, musique, palmarès) dans localStorage.
 *
 * Règle : toute modification du format incrémente SAVE_VERSION et ajoute une étape
 * à migrate(). Une sauvegarde abîmée ou plus récente que le jeu n'est jamais
 * écrasée en silence : elle est mise de côté sous KEY + '.abimee' et le jeu repart
 * des valeurs par défaut. */

export const KEY = 'kevblast.sauvegarde';
export const SAVE_VERSION = 1;

/** @typedef {import('./state.js').Settings} Settings */
/** @typedef {{matches:number,rounds:number,titles:number[]}} Stats */
/** @typedef {{version:number,settings:Settings,music:boolean,stats:Stats}} SaveData */

/** @returns {SaveData} */
export function defaults() {
  return { version: SAVE_VERSION, settings: { humans: 1, bots: 3, diff: 1, goal: 3, h1: 0, h2: 1 }, music: true, stats: { matches: 0, rounds: 0, titles: [0, 0, 0, 0] } };
}

/** @param {unknown} v @param {number} lo @param {number} hi */
const intIn = (v, lo, hi) => Number.isInteger(v) && /** @type {number} */ (v) >= lo && /** @type {number} */ (v) <= hi;

/** Amène une sauvegarde d'une version antérieure à SAVE_VERSION ; null si inconnue ou trop récente.
 * @param {any} d @returns {any} */
export function migrate(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const v = d.version;
  if (!Number.isInteger(v) || v < 1 || v > SAVE_VERSION) return null;
  const out = structuredClone(d);
  // Étapes futures, à chaîner ici :
  // if (out.version === 1) { out = v1ToV2(out); }
  return out;
}

/** @param {any} d @returns {d is SaveData} */
export function isValid(d) {
  if (!d || d.version !== SAVE_VERSION) return false;
  const s = d.settings;
  if (!s || !intIn(s.humans, 1, 2) || !intIn(s.bots, 0, 3) || !intIn(s.diff, 0, 2) || ![2, 3, 5].includes(s.goal)) return false;
  if (!intIn(s.h1, 0, 3) || !intIn(s.h2, 0, 3)) return false;
  if (s.humans + s.bots < 2 || s.humans + s.bots > 4) return false;
  if (typeof d.music !== 'boolean') return false;
  const st = d.stats;
  if (!st || !intIn(st.matches, 0, 1e9) || !intIn(st.rounds, 0, 1e9)) return false;
  if (!Array.isArray(st.titles) || st.titles.length !== 4 || !st.titles.every((/** @type {unknown} */ n) => intIn(n, 0, 1e9))) return false;
  return true;
}

/** Texte -> sauvegarde valide, ou null.
 * @param {string|null} text */
export function parse(text) {
  if (text == null) return null;
  let raw;
  try { raw = JSON.parse(text); } catch { return null; }
  const d = migrate(raw);
  return isValid(d) ? d : null;
}

/** Lit la sauvegarde ; repart des valeurs par défaut si elle manque ou est abîmée.
 * @param {Storage|null} store @returns {SaveData} */
export function load(store) {
  if (!store) return defaults();
  let text = null;
  try { text = store.getItem(KEY); } catch { return defaults(); }
  if (text == null) return defaults();
  const d = parse(text);
  if (d) return d;
  try { store.setItem(KEY + '.abimee', text); store.removeItem(KEY); } catch { /* stockage plein ou bloqué */ }
  return defaults();
}

/** @param {Storage|null} store @param {SaveData} d @returns {boolean} */
export function save(store, d) {
  if (!store || !isValid(d)) return false;
  try { store.setItem(KEY, JSON.stringify(d)); return true; } catch { return false; }
}

/** Le stockage du navigateur, ou null s'il est bloqué (navigation privée, iframe…). */
export function browserStore() {
  try { const s = window.localStorage; s.getItem(KEY); return s; } catch { return null; }
}
