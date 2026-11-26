// Remet l'état du jeu à zéro entre deux tests (les modules partagent un seul état).
import { S, hooks } from '../../src/state.js';
import { seed } from '../../src/rng.js';
import { startMatch, startRound } from '../../src/rules.js';
import { COLS, ROWS } from '../../src/config.js';

/** Partie réelle (pas la démo) avec `bots` bots et `humans` humains immobiles. */
export function newMatch({ humans = 0, bots = 4, diff = 1, goal = 2, graine = 1 } = {}) {
  seed(graine);
  hooks.hud = () => {}; hooks.roundEnd = () => startRound(); hooks.champion = () => {};
  S.settings = { humans, bots, diff, goal, h1: 0, h2: 1 };
  startMatch(false);
  S.mode = 'play';
  return S;
}

/** Arène vide (bordure dure seulement), joueurs humains immobiles à des cases choisies. */
export function emptyArena(positions) {
  newMatch({ humans: positions.length, bots: 0 });
  S.grid = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) ? 1 : 0));
  S.bombs = []; S.flames = []; S.pows = []; S.breaks = []; S.falls = [];
  positions.forEach(([x, y], i) => Object.assign(S.players[i], { x: x + .5, y: y + .5, shield: false, inv: 0, alive: true }));
  return S;
}
