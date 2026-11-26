// Parties complètes simulées (4 bots) : chaque partie doit se finir sur un champion,
// sans exception ni état impossible. Rejoué à l'identique grâce à la graine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S, hooks, cell } from '../../src/state.js';
import { update, startRound } from '../../src/rules.js';
import { newMatch } from './helpers.mjs';

function play(opts) {
  newMatch(opts);
  let champ = null, rounds = 1, steps = 0;
  hooks.roundEnd = () => { rounds++; startRound(); S.mode = 'play'; };
  hooks.champion = c => { champ = c; };
  while (!champ && rounds <= 30) {
    update(1 / 60); steps++;
    for (const p of S.players) {
      if (!p.alive) continue;
      assert.ok(p.active >= 0 && p.active <= p.bombs, 'compteur de pétards');
      const v = cell(Math.floor(p.x), Math.floor(p.y));
      assert.ok(v === 0 || S.falls.some(f => f.x === Math.floor(p.x) && f.y === Math.floor(p.y)), `joueur dans un mur (${p.x},${p.y})`);
    }
    assert.ok(S.bombs.every(b => cell(b.x, b.y) === 0), 'pétard dans un mur');
  }
  return { champ, rounds, steps };
}

for (const diff of [0, 1, 2]) {
  test(`partie complète, bots niveau ${diff}`, () => {
    for (const graine of [1, 2, 3]) {
      const r = play({ diff, goal: 2, graine });
      assert.ok(r.champ, `graine ${graine} : pas de champion en 30 manches`);
      assert.equal(r.champ.wins, 2);
      assert.equal(S.mode, 'over');
    }
  });
}

test('même graine, même partie', () => {
  const a = play({ graine: 42, goal: 2 }), b = play({ graine: 42, goal: 2 });
  assert.equal(a.steps, b.steps); assert.equal(a.champ.hero.name, b.champ.hero.name);
});

test('un humain immobile finit éliminé et la partie continue', () => {
  const r = play({ humans: 1, bots: 3, goal: 2, graine: 5 });
  assert.ok(r.champ); assert.equal(r.champ.human, -1);
});
