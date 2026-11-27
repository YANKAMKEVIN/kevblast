// @ts-check
/** État de la partie, partagé par tous les modules, et requêtes sur la grille. */
import { COLS, ROWS, ROUND } from './config.js';

/**
 * @typedef {{x:number,y:number,t:number,owner:Player,lvl:number,range:number,pierce:number,age:number,vx:number,vy:number,off:number}} Bomb
 * @typedef {{x:number,y:number,o:string,t:number,lvl:number}} Flame
 * @typedef {{x:number,y:number,type:string,t:number}} Pow
 * @typedef {{type:string,t:number}} Curse
 * @typedef {{path:{x:number,y:number}[],t:number,stuck:number,lx:number,ly:number,chargeT:number,flee?:boolean,esc?:{x:number,y:number}[]}} Brain
 * @typedef {{id:number,hero:import('./config.js').Hero,human:number,x:number,y:number,alive:boolean,speed:number,bombs:number,range:number,
 *   shield:boolean,inv:number,charge:number,chargeLvl:number,dir:{x:number,y:number},walk:number,active:number,wins:number,deadT:number,
 *   dirs:string[],ai:Brain,kick?:boolean,curse?:Curse|null,curseCd?:number,prevB?:boolean,moving?:boolean,padDir?:number[]|null}} Player
 * @typedef {{humans:number,bots:number,diff:number,goal:number,h1:number,h2:number}} Settings
 */

export const S = {
  /** menu | demo | countdown | play | roundEnd | over */
  mode: 'menu', paused: false,
  /** @type {number[][]} 0 sol, 1 bloc dur, 2 caisse */
  grid: [],
  /** @type {Bomb[]} */ bombs: [],
  /** @type {Flame[]} */ flames: [],
  /** @type {Pow[]} */ pows: [],
  /** @type {any[]} */ parts: [],
  /** @type {{x:number,y:number,t:number}[]} */ breaks: [],
  /** @type {{x:number,y:number,t:number,done?:boolean}[]} */ falls: [],
  /** @type {Player[]} */ players: [],
  time: ROUND, cd: 0, lastBeep: 4, endT: 0, shake: 0, ff: 0, fwT: 0,
  /** @type {Settings} */
  settings: { humans: 1, bots: 3, diff: 1, goal: 3, h1: 0, h2: 1 },
  /** @type {Settings|null} réglages de la partie en cours */
  cur: null,
  /** @type {{x:number,y:number,text:string,col:string,t:number}[]} */ texts: [],
  slow: 0,
  /** @type {{x:number,y:number}|null} */ focus: null,
  arena: 0,
  /** @type {{x:number,y:number}[]} */ sdQueue: [], sdT: 0, sdBuilt: false,
  round: 0,
  /** @type {HTMLCanvasElement|null} */ floor: null,
  /** @type {{text:string,t:number}|null} */ banner: null,
};

/** Joystick et bouton tactiles du joueur 1. */
export const touch = /** @type {{dir:number[]|null,b:boolean}} */ ({ dir: null, b: false });

/**
 * Ce que la logique annonce à l'interface (sans dépendre du DOM : les tests
 * laissent ces fonctions vides ou les remplacent).
 */
export const hooks = {
  hud() {},
  /** @param {Player|undefined} w */ roundEnd(w) {},
  /** @param {Player} c */ champion(c) {},
};

/** @param {number} x @param {number} y */
export const key = (x, y) => y * COLS + x;
/** @param {number} x @param {number} y */
export function cell(x, y) { return (x < 0 || y < 0 || x >= COLS || y >= ROWS) ? 1 : S.grid[y][x]; }
/** @param {number} x @param {number} y */
export function bombAt(x, y) { return S.bombs.find(b => b.x === x && b.y === y); }
/** @param {number} x @param {number} y */
export function powAt(x, y) { return S.pows.find(p => p.x === x && p.y === y); }
/** @param {number} x @param {number} y */
export function flameAt(x, y) { return S.flames.find(f => f.x === x && f.y === y && f.t > 0); }
/** @param {number} x @param {number} y */
export function blocked(x, y) { return cell(x, y) !== 0 || !!bombAt(x, y); }
