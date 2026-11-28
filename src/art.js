// @ts-check
/**
 * Visuels peints avec Codex (dossier art/, prompts dans tools/art/prompts.json).
 * Le jeu reste jouable sans eux : tant qu'une image n'est pas chargée, le dessin
 * procédural d'origine prend le relais.
 */

/** Identifiants des héros dans les noms de fichiers, dans l'ordre de HEROES. */
const HERO_IDS = ['kev', 'nova', 'pip', 'mox'];

/** Les trois vues de chaque héros dans l'arène (le profil gauche est le profil droit en miroir). */
export const VIEWS = /** @type {const} */ (['face', 'dos', 'profil']);
/** @typedef {typeof VIEWS[number]} View */

/** Portrait de chaque héros (menu, barre des joueurs), dans l'ordre de HEROES. */
export const HERO_ART = HERO_IDS.map(id => `heros_${id}`);
/** Pose de victoire de chaque héros (écran du champion). */
export const HERO_WIN = HERO_IDS.map(id => `victoire_${id}`);
/** Sprites d'arène : HERO_SPRITES[héros][vue]. */
export const HERO_SPRITES = HERO_IDS.map(id => Object.fromEntries(VIEWS.map(v => [v, `heros_${id}_${v}`])));

/**
 * Vue d'un héros selon sa direction : face, dos ou profil (miroir si vers la gauche).
 * @param {{x:number,y:number}|undefined} d
 * @returns {{view:View,flip:number}}
 */
export function heroView(d){const x=d?.x||0,y=d?.y||0;if(Math.abs(x)>Math.abs(y))return{view:'profil',flip:x<0?-1:1};return{view:y<0?'dos':'face',flip:1}}

export const ART_FILES = [
  'titre', 'sol', 'mur', 'caisse',
  ...HERO_ART, ...HERO_WIN, ...HERO_SPRITES.flatMap(s => VIEWS.map(v => s[v])),
  'bonus_bomb', 'bonus_fire', 'bonus_speed', 'bonus_shield', 'bonus_kick', 'bonus_curse', 'bonus_max',
];

/** Visuels peints de chaque arène (dossier art/arenes/, prompts dans tools/art/arenes.json). */
export const ARENA_PARTS = /** @type {const} */ (['sol', 'pilier', 'caisse', 'borne', 'fond']);
/** @typedef {typeof ARENA_PARTS[number]} ArenaPart */
/**
 * Nom du visuel d'une arène, pour art() : arenaArt('pilier', 'marche') -> 'arenes/pilier_marche'.
 * @param {ArenaPart} part @param {string} id
 */
export const arenaArt = (part, id) => `arenes/${part}_${id}`;
/** Arènes dont les visuels peints sont livrés dans art/arenes/ (les autres gardent le dessin de secours,
 * sans requête inutile). Vérifié par tests/unit/arenes.test.mjs. */
export const PAINTED_ARENAS = /** @type {string[]} */ ([]);

/** @type {Map<string, HTMLImageElement>} */
const loaded = new Map();
/** @type {Map<string, Promise<boolean>>} */
const pending = new Map();

/**
 * Charge un visuel une seule fois (les appels suivants reçoivent la même promesse).
 * @param {string} name
 * @returns {Promise<boolean>} vrai si l'image est prête
 */
function loadOne(name) {
  let p = pending.get(name);
  if (!p) {
    p = new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { loaded.set(name, im); res(true); };
      im.onerror = () => res(false);
      im.src = `art/${name}.webp`;
    });
    pending.set(name, p);
  }
  return p;
}

/**
 * Charge tous les visuels communs. Se résout quand tout est chargé, ou au bout de `maxMs`
 * (une image lente ou absente ne bloque jamais le jeu).
 * @param {number} [maxMs]
 * @returns {Promise<number>} nombre d'images communes prêtes
 */
export function loadArt(maxMs = 4000) {
  return Promise.race([
    Promise.all(ART_FILES.map(loadOne)),
    new Promise(res => setTimeout(res, maxMs)),
  ]).then(() => ART_FILES.filter(n => loaded.has(n)).length);
}

/**
 * Charge les visuels d'une arène (à la demande : seule l'arène jouée est attendue).
 * @param {string} id
 * @returns {Promise<number>} nombre de visuels prêts pour cette arène
 */
export function loadArena(id) {
  if (!PAINTED_ARENAS.includes(id)) return Promise.resolve(0);
  return Promise.all(ARENA_PARTS.map(part => loadOne(arenaArt(part, id)))).then(r => r.filter(Boolean).length);
}

/**
 * L'image si elle est prête, sinon null.
 * @param {string} name
 * @returns {HTMLImageElement|null}
 */
export function art(name) { return loaded.get(name) || null; }
