import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S, hooks } from '../../src/state.js';
import { COLS, ROWS, SPAWN, FUSE, CAPS, POW_TABLE } from '../../src/config.js';
import { genMap, blastCells, placeBomb, canPlace, explode, update, kill, spiral, chargeLevel, drawPow, move, giveCurse, endRound } from '../../src/rules.js';
import { seed } from '../../src/rng.js';
import { newMatch, emptyArena } from './helpers.mjs';

test('les arènes ont une bordure dure et des départs dégagés', () => {
  seed(7);
  for (let kind = 0; kind < 5; kind++) {
    const g = genMap(kind);
    assert.equal(g.length, ROWS); assert.equal(g[0].length, COLS);
    for (let x = 0; x < COLS; x++) { assert.equal(g[0][x], 1); assert.equal(g[ROWS - 1][x], 1); }
    for (const [sx, sy] of SPAWN) {
      assert.equal(g[sy][sx], 0, `départ ${sx},${sy} libre (arène ${kind})`);
      const dx = sx < 7 ? 1 : -1, dy = sy < 6 ? 1 : -1;
      assert.equal(g[sy][sx + dx], 0); assert.equal(g[sy + dy][sx], 0);
    }
  }
});

test('la flamme s\'arrête au bloc dur et à la première caisse', () => {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  g[5][8] = 2; g[5][4] = 1;
  const cells = blastCells(6, 5, 5, 0, g);
  const right = cells.filter(c => c.y === 5 && c.x > 6).map(c => c.x);
  const left = cells.filter(c => c.y === 5 && c.x < 6).map(c => c.x);
  assert.deepEqual(right, [7, 8], 'la caisse est touchée, pas ce qui est derrière');
  assert.deepEqual(left, [5], 'le bloc dur arrête la flamme');
  assert.ok(cells.find(c => c.x === 8).soft);
});

test('Surcharge à fond : la flamme traverse 2 caisses', () => {
  const g = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  g[5][7] = 2; g[5][8] = 2; g[5][9] = 2; g[5][10] = 2;
  const right = blastCells(6, 5, 6, 2, g).filter(c => c.y === 5 && c.x > 6).map(c => c.x);
  assert.deepEqual(right, [7, 8, 9]);
});

test('niveaux de Surcharge selon le temps de charge', () => {
  assert.equal(chargeLevel(0), 0); assert.equal(chargeLevel(.49), 0);
  assert.equal(chargeLevel(.5), 1); assert.equal(chargeLevel(1.09), 1);
  assert.equal(chargeLevel(1.1), 2);
});

test('pétard posé : portée +2 si chargé, limite du nombre de pétards', () => {
  emptyArena([[3, 3], [9, 9]]);
  const p = S.players[0]; p.bombs = 1; p.range = 2;
  assert.ok(placeBomb(p, 1));
  assert.equal(S.bombs[0].range, 4); assert.equal(S.bombs[0].pierce, 0);
  assert.equal(canPlace(p), false, 'un seul pétard à la fois');
  p.x += 1;
  assert.equal(placeBomb(p, 0), false);
});

test('explosion : casse la caisse, déclenche les pétards voisins, libère le compteur', () => {
  emptyArena([[3, 3], [9, 9]]);
  const p = S.players[0]; p.bombs = 2;
  S.grid[3][6] = 2;
  placeBomb(p, 0); p.x += 1; placeBomb(p, 0);
  assert.equal(p.active, 2);
  explode(S.bombs[0]);
  assert.equal(S.grid[3][6], 0, 'caisse cassée');
  assert.ok(S.bombs[0].t <= .08, 'le pétard voisin part en chaîne');
  assert.equal(p.active, 1);
});

test('le bouclier sauve une fois puis rend invincible un instant', () => {
  emptyArena([[3, 3], [9, 9]]);
  const p = S.players[0]; p.shield = true;
  kill(p);
  assert.ok(p.alive); assert.equal(p.shield, false); assert.ok(p.inv > 0);
  kill(p); assert.ok(p.alive, 'invincible juste après');
  p.inv = 0; kill(p); assert.equal(p.alive, false);
});

test('marcher dans une flamme élimine', () => {
  emptyArena([[3, 3], [9, 9]]);
  const p = S.players[0];
  placeBomb(p, 0);
  p.x = 5.5; // à 2 cases, dans la portée
  for (let t = 0; t < FUSE + .1; t += 1 / 60) update(1 / 60);
  assert.equal(p.alive, false);
});

test('les bonus ramassés respectent les plafonds', () => {
  emptyArena([[3, 3], [9, 9]]);
  const p = S.players[0];
  for (let i = 0; i < 20; i++) {
    S.pows.push({ x: 3, y: 3, type: 'bomb', t: 1 }); update(1 / 60);
    S.pows.push({ x: 3, y: 3, type: 'speed', t: 1 }); update(1 / 60);
    S.pows.push({ x: 3, y: 3, type: 'fire', t: 1 }); update(1 / 60);
  }
  assert.equal(p.bombs, CAPS.bombs); assert.equal(p.range, CAPS.range); assert.ok(p.speed <= CAPS.speed);
});

test('tirage des bonus : chaque type sort, seuils croissants', () => {
  const seen = new Set();
  for (let r = 0; r < 1; r += .01) seen.add(drawPow(r));
  assert.deepEqual([...seen].sort(), ['bomb', 'curse', 'fire', 'kick', 'max', 'shield', 'speed']);
  for (let i = 1; i < POW_TABLE.length; i++) assert.ok(POW_TABLE[i][0] > POW_TABLE[i - 1][0]);
});

test('malédiction refilée au contact', () => {
  emptyArena([[3, 3], [4, 3]]);
  const [a, b] = S.players;
  giveCurse(a, 'slow');
  b.x = a.x + .5;
  update(1 / 60);
  assert.equal(a.curse, null); assert.equal(b.curse?.type, 'slow');
});

test('on ne traverse pas un bloc, on glisse dans les couloirs', () => {
  emptyArena([[1, 1], [9, 9]]);
  S.grid[1][2] = 1;
  const p = S.players[0];
  for (let i = 0; i < 60; i++) move(p, 1, 0, 1 / 60);
  assert.ok(p.x <= 1.5 + 1e-9, 'bloqué par le bloc');
});

test('la Finale referme l\'arène en spirale, sans repasser sur un bloc', () => {
  newMatch();
  const sp = spiral();
  assert.ok(sp.length > 40);
  assert.ok(sp.every(c => S.grid[c.y][c.x] !== 1));
  assert.deepEqual(sp[0], sp.find(c => c.y === 1 && S.grid[1][c.x] !== 1));
});

test('fin de manche : étoile au gagnant, champion à l\'objectif', () => {
  let champ = null;
  newMatch({ goal: 2 });
  hooks.champion = c => { champ = c; };
  const w = S.players[1]; w.wins = 1;
  endRound(w);
  assert.equal(w.wins, 2); assert.equal(champ, w); assert.equal(S.mode, 'over');
});

test('la Finale finit par couvrir toute l\'arène (aucune case épargnée au centre)', () => {
  newMatch();
  const sp = spiral(), seen = new Set(sp.map(c => c.y * COLS + c.x));
  assert.equal(seen.size, sp.length, 'aucune case en double');
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++)
    if (S.grid[y][x] !== 1) assert.ok(seen.has(y * COLS + x), `case ${x},${y} jamais refermée`);
});
