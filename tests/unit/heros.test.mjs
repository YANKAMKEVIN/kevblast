// Les héros « Pétards Vivants » : données, répliques, vues et visuels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { HEROES } from '../../src/config.js';
import { ART_FILES, HERO_ART, HERO_WIN, HERO_SPRITES, VIEWS, heroView } from '../../src/art.js';
import { S } from '../../src/state.js';
import { line, kill } from '../../src/rules.js';
import { emptyArena } from './helpers.mjs';

test('chaque héros a une identité complète : espèce, caractère, pouvoir, répliques', () => {
  assert.equal(HEROES.length, 4);
  assert.equal(new Set(HEROES.map(h => h.name)).size, 4, 'noms distincts');
  assert.equal(new Set(HEROES.map(h => h.col)).size, 4, 'couleurs distinctes');
  for (const h of HEROES) {
    for (const k of ['kind', 'tag', 'pw', 'pd']) assert.ok(h[k].length > 3, `${h.name}.${k}`);
    assert.ok(h.win.length >= 2 && h.ko.length >= 2, `${h.name} a plusieurs répliques`);
    for (const l of [...h.win, ...h.ko]) assert.ok(l.length > 0 && l.length <= 36, `réplique lisible au-dessus de l'arène : « ${l} »`);
  }
});

test('line() choisit une réplique sans sortir du tableau, même avec un compteur négatif', () => {
  const l = ['a', 'b', 'c'];
  assert.deepEqual([0, 1, 2, 3, 7, -1].map(n => line(l, n)), ['a', 'b', 'c', 'a', 'b', 'c']);
});

test('vue du héros selon sa direction (profil gauche = profil droit en miroir)', () => {
  assert.deepEqual(heroView({ x: 0, y: 1 }), { view: 'face', flip: 1 });
  assert.deepEqual(heroView({ x: 0, y: -1 }), { view: 'dos', flip: 1 });
  assert.deepEqual(heroView({ x: 1, y: 0 }), { view: 'profil', flip: 1 });
  assert.deepEqual(heroView({ x: -1, y: 0 }), { view: 'profil', flip: -1 });
  assert.deepEqual(heroView(undefined), { view: 'face', flip: 1 });
});

test('chaque héros a portrait, pose de victoire et 3 vues, et tous les fichiers existent', () => {
  assert.equal(HERO_ART.length, HEROES.length);
  assert.equal(HERO_WIN.length, HEROES.length);
  assert.equal(HERO_SPRITES.length, HEROES.length);
  for (const s of HERO_SPRITES) assert.deepEqual(Object.keys(s), [...VIEWS]);
  assert.equal(new Set(ART_FILES).size, ART_FILES.length, 'pas de doublon');
  for (const f of ART_FILES) assert.ok(existsSync(new URL(`../../art/${f}.webp`, import.meta.url)), `art/${f}.webp`);
});

test('K.O. : le héros lance sa réplique ; sauvé par le bouclier : il se tait', () => {
  emptyArena([[3, 3], [9, 9]]);
  const [p, q] = S.players;
  p.shield = true; S.texts = [];
  kill(p);
  assert.ok(p.alive); assert.equal(S.texts.length, 0);
  kill(q);
  assert.ok(q.hero.ko.includes(S.texts[0].text), 'réplique de K.O. du héros');
});
