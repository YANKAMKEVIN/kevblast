import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S, key } from '../../src/state.js';
import { FUSE } from '../../src/config.js';
import { computeDanger, think } from '../../src/ai.js';
import { placeBomb, update } from '../../src/rules.js';
import { emptyArena } from './helpers.mjs';

test('carte du danger : les cases dans la portée brûlent au temps de la mèche', () => {
  emptyArena([[5, 5], [11, 11]]);
  S.players[0].range = 2;
  placeBomb(S.players[0], 0);
  const D = computeDanger();
  assert.equal(D[key(5, 5)], FUSE); assert.equal(D[key(7, 5)], FUSE);
  assert.equal(D[key(8, 5)], Infinity); assert.equal(D[key(6, 6)], Infinity);
});

test('carte du danger : une chaîne de pétards brûle au temps du premier', () => {
  emptyArena([[5, 5], [11, 11]]);
  const p = S.players[0]; p.bombs = 2;
  placeBomb(p, 0); S.bombs[0].t = .5;
  p.x = 7.5; placeBomb(p, 0);
  const D = computeDanger();
  assert.equal(D[key(9, 5)], .5, 'le second pétard part avec le premier');
});

test('un bot en danger cherche une case sûre', () => {
  emptyArena([[5, 5], [11, 11]]);
  const bot = S.players[0]; bot.human = -1;
  placeBomb(S.players[0], 0);
  think(bot);
  assert.ok(bot.ai.flee); assert.ok(bot.ai.path.length > 0);
  const D = computeDanger(); const end = bot.ai.path[bot.ai.path.length - 1];
  assert.equal(D[key(end.x, end.y)], Infinity);
});

test('un bot échappe à son propre pétard', () => {
  for (let g = 1; g <= 20; g++) {
    emptyArena([[5, 5], [11, 11]]);
    const bot = S.players[0]; bot.human = -1; bot.ai.t = 99;
    placeBomb(bot, 0); think(bot);
    for (let t = 0; t < FUSE + 1; t += 1 / 60) update(1 / 60);
    assert.ok(bot.alive, `graine ${g}`);
  }
});
