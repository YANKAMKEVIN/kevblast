// @ts-check
/** Constantes et données du jeu : aucune logique ici. */

export const VERSION = '1.4.0';

export const COLS = 15, ROWS = 13, T = 48, FUSE = 2.5, FLAME = 0.55, ROUND = 120;

/**
 * Les héros « Pétards Vivants » : des pièces d'artifice en carton peint, bras et jambes
 * en caoutchouc. `kind` et `tag` les présentent au menu ; `win` et `ko` sont leurs
 * répliques (victoire de manche, K.O.), choisies sans toucher au hasard de la partie.
 * @typedef {{name:string,col:string,dk:string,lt:string,pw:string,pd:string,kind:string,tag:string,win:string[],ko:string[]}} Hero
 */
/** @type {Hero[]} */
export const HEROES = [
  { name: 'Kev', col: '#ff5a3c', dk: '#b8301a', lt: '#ffa58f', pw: 'Flamme vive', pd: 'commence avec 3 cases de portée',
    kind: 'la bombe boxeuse', tag: 'Fanfaron au grand cœur, il fonce toujours en premier.',
    win: ['Qui veut un autographe ?', 'Trop facile !', 'Encore un round ?'], ko: ['Même pas mal…', 'Revanche !', 'Ouille, ma mèche !'] },
  { name: 'Nova', col: '#14b8a6', dk: '#0a7469', lt: '#8ff0e3', pw: 'Turbo', pd: 'commence plus rapide',
    kind: 'la fusée pilote', tag: 'Toujours pressée, elle a déjà fini avant que tu commences.',
    win: ['Décollage réussi !', 'Trop lents !', 'Record battu !'], ko: ['Crash au décollage…', 'J\'avais pas fini !', 'Panne de moteur !'] },
  { name: 'Pip', col: '#ffc02e', dk: '#c4840a', lt: '#ffe596', pw: 'Double mèche', pd: 'commence avec 2 pétards',
    kind: 'les pétards jumeaux', tag: 'Deux têtes, une ceinture, zéro accord. Sauf pour gagner.',
    win: ['C\'est grâce à moi ! — Non, à moi !', 'On est les meilleurs !', 'Double victoire !'], ko: ['C\'est ta faute !', 'Non, la tienne !', 'Aïe aïe !'] },
  { name: 'Mox', col: '#8b6cff', dk: '#5638c9', lt: '#cdbfff', pw: 'Bulle', pd: 'un bouclier offert à chaque manche',
    kind: 'la boule fumigène', tag: 'Zen absolue. Elle flotte au-dessus de la mêlée, dans sa bulle.',
    win: ['Respire… et gagne.', 'Tout est calme.', 'Paix et pétards.'], ko: ['Pfffiou…', 'Je reviens en fumée.', 'Inspire…'] },
];

/** Cases de départ des 4 joueurs. */
export const SPAWN = [[1, 1], [13, 11], [13, 1], [1, 11]];

export const ARENAS = ['Place du Marché', 'Jardin des Lanternes', 'Quai des Fusées', 'Nuit des Lanternes', 'Lac Gelé'];

const TEAL = { hard: ['#3fb3a3', '#2a8c80', '#1b5e58'], border: ['#2a7a72', '#1a5853', '#0d3b3a'] };
/**
 * Décor d'une arène du « Grand Festival » : chaque arène est un lieu de la fête à une heure de la nuit.
 * - `id` : suffixe des visuels peints art/arenes/{sol,pilier,caisse,borne,fond}_<id>.webp ;
 * - `floor`, `hard`, `border` : couleurs du dessin de secours (tant que les visuels ne sont pas chargés) ;
 * - `dark` (0 à 1) et `shade` : obscurité ambiante et sa teinte, percée par les lumières ;
 * - `glow` : couleur des lanternes ; `lamps` : les piliers portent une lanterne allumée ;
 * - `garland` : guirlandes entre les bornes de la clôture (forme et couleurs) ;
 * - `fx` : ambiance animée (purement décorative, ne touche pas au hasard de la partie) ;
 * - `night` : nuit noire, la visibilité devient un enjeu de jeu.
 * @typedef {'confetti'|'petales'|'braises'|'lanternes'|'neige'} Fx
 * @typedef {{id:string,floor:string[],hard:string[],border:string[],night?:boolean,
 *  dark:number,shade:string,glow:string,lamps:boolean,garland:{kind:'fanions'|'lampions'|'ampoules',cols:string[]},fx:Fx,sky:string[]}} Theme
 */
/** @type {Theme[]} */
export const THEMES = [
  { id: 'marche', floor: ['#f3d7a0', '#ecca8a', '#d9ae6a'], ...TEAL, dark: .2, shade: '#3a1238', glow: '#ffb347', lamps: true,
    garland: { kind: 'fanions', cols: ['#ff5a3c', '#fff1d6', '#ffc02e', '#14b8a6'] }, fx: 'confetti', sky: ['#ff9a5a', '#6a2a6e'] },
  { id: 'jardin', floor: ['#cfe3b0', '#c2d99c', '#9fbf78'], ...TEAL, dark: .4, shade: '#0b1640', glow: '#ffd27a', lamps: true,
    garland: { kind: 'lampions', cols: ['#ffd27a', '#ffb0a0', '#fff1d6'] }, fx: 'petales', sky: ['#3a5aa8', '#0b1640'] },
  { id: 'quai', floor: ['#f0c9b4', '#e7b79e', '#cf9577'], ...TEAL, dark: .52, shade: '#03122a', glow: '#ffc46a', lamps: false,
    garland: { kind: 'ampoules', cols: ['#ffe27a', '#9ff6ff', '#ff8a5a'] }, fx: 'braises', sky: ['#123a6a', '#03122a'] },
  { id: 'lanternes', floor: ['#3a4f78', '#32466c', '#22305066'], hard: ['#5b7fc4', '#3f5f9c', '#26406e'], border: ['#33497a', '#24365c', '#141f38'], night: true,
    dark: .74, shade: '#060a1e', glow: '#ff7a3a', lamps: true, garland: { kind: 'lampions', cols: ['#ff3b2f', '#ffb020', '#ff3b2f'] }, fx: 'lanternes', sky: ['#2a1450', '#060a1e'] },
  { id: 'lac', floor: ['#e8f6ff', '#d6edfb', '#a8cfe6'], hard: ['#b4e8fa', '#82c8e6', '#4f97b8'], border: ['#76b6d6', '#4f92b3', '#2f6886'],
    dark: .42, shade: '#0a1446', glow: '#ffd98a', lamps: true, garland: { kind: 'ampoules', cols: ['#ffd98a', '#9ff6ff', '#c9b8ff'] }, fx: 'neige', sky: ['#1a6a7a', '#0a1446'] },
];

/** @type {Record<string,string>} */
export const CURSES = { reverse: 'Touches inversées !', slow: 'Escargot !', dropper: 'Pétards en folie !', tiny: 'Mèche courte !' };
/** @type {Record<string,string>} */
export const POWTXT = { bomb: '+1 pétard', fire: '+1 portée', speed: 'Plus vite !', shield: 'Bouclier !', kick: 'Coup de pied !', max: 'Flamme max !' };

/** Tirage d'un bonus quand une caisse saute : seuils cumulés (voir rules.drawPow). */
export const POW_CHANCE = 0.34;
export const POW_TABLE = [[0.25, 'bomb'], [0.5, 'fire'], [0.66, 'speed'], [0.74, 'shield'], [0.84, 'kick'], [0.95, 'curse'], [1, 'max']];

/** Plafonds des améliorations. */
export const CAPS = { bombs: 8, range: 9, speed: 6, speedStep: 0.45, baseSpeed: 3.4, turboSpeed: 3.95 };

/** Surcharge : secondes de charge pour chaque niveau. */
export const CHARGE = { half: 0.5, full: 1.1 };

/** Bots : agressivité, temps de réaction, goût pour la Surcharge, chasse. */
export const DIFF = [
  { aggr: 0.3, delay: 0.28, charge: 0, hunt: 0.2 },
  { aggr: 0.65, delay: 0.1, charge: 0.25, hunt: 0.6 },
  { aggr: 0.95, delay: 0, charge: 0.55, hunt: 1 },
];

/** @type {Record<string,string>} */
export const ICON = { bomb: '#3a3fb8', fire: '#ff5a3c', speed: '#14b8a6', shield: '#8b6cff', kick: '#1f9d55', curse: '#2b1640', max: '#ff8a1f' };
