import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KEY, SAVE_VERSION, defaults, parse, migrate, isValid, load, save } from '../../src/save.js';

/** localStorage en mémoire. */
function memStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m };
}

test('les valeurs par défaut sont valides', () => assert.ok(isValid(defaults())));

test('aller-retour : ce qui est sauvé est relu à l\'identique', () => {
  const st = memStore(); const d = defaults();
  d.settings = { humans: 2, bots: 2, diff: 2, goal: 5, h1: 3, h2: 0 }; d.music = false; d.stats.matches = 4; d.stats.titles = [1, 0, 2, 1];
  assert.ok(save(st, d));
  assert.deepEqual(load(st), d);
});

test('sauvegarde absente : valeurs par défaut', () => assert.deepEqual(load(memStore()), defaults()));

test('stockage bloqué (navigation privée) : le jeu tourne quand même', () => {
  const blocked = { getItem() { throw new Error('bloqué'); }, setItem() { throw new Error('bloqué'); }, removeItem() {} };
  assert.deepEqual(load(blocked), defaults());
  assert.equal(save(blocked, defaults()), false);
  assert.deepEqual(load(null), defaults());
});

test('fichier abîmé : mis de côté, jamais écrasé en silence', () => {
  for (const bad of ['{pas du json', '[]', '"texte"', '{"version":1}', JSON.stringify({ ...defaults(), settings: { ...defaults().settings, bots: 9 } })]) {
    const st = memStore({ [KEY]: bad });
    assert.deepEqual(load(st), defaults(), bad);
    assert.equal(st.getItem(KEY + '.abimee'), bad);
    assert.equal(st.getItem(KEY), null);
  }
});

test('sauvegarde d\'une version plus récente du jeu : refusée', () => {
  const d = { ...defaults(), version: SAVE_VERSION + 1 };
  assert.equal(migrate(d), null);
  assert.equal(parse(JSON.stringify(d)), null);
});

test('réglages impossibles refusés', () => {
  const bad = [
    { humans: 0, bots: 3 }, { humans: 1, bots: 0 }, { humans: 2, bots: 3 }, { goal: 4 }, { diff: 3 }, { h1: 4 }, { bots: 1.5 },
  ];
  for (const b of bad) {
    const d = defaults(); Object.assign(d.settings, b);
    assert.equal(isValid(d), false, JSON.stringify(b));
  }
  const d = defaults(); d.stats.titles = [1, 2, 3]; assert.equal(isValid(d), false);
  const e = defaults(); e.stats.matches = -1; assert.equal(isValid(e), false);
});

test('save() refuse d\'écrire un état invalide', () => {
  const st = memStore(); const d = defaults(); d.settings.goal = 7;
  assert.equal(save(st, d), false); assert.equal(st.getItem(KEY), null);
});
