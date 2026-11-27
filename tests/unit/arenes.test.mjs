// Les arènes du « Grand Festival » : thèmes, visuels peints, clôture, ambiance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ARENAS, THEMES, COLS, ROWS } from '../../src/config.js';
import { ARENA_PARTS, arenaArt } from '../../src/art.js';
import { isRim, isPost, decorLights, MOTES_MAX } from '../../src/decor.js';
import { genMap } from '../../src/rules.js';
import { seed, rnd } from '../../src/rng.js';

const root = new URL('../../', import.meta.url);
const prompts = JSON.parse(readFileSync(new URL('tools/art/arenes.json', root), 'utf8'));

test('chaque arène a un thème complet et un identifiant unique', () => {
  assert.equal(THEMES.length, ARENAS.length);
  assert.equal(new Set(THEMES.map(t => t.id)).size, THEMES.length);
  for (const t of THEMES) {
    assert.match(t.id, /^[a-z]+$/);
    assert.ok(t.dark >= 0 && t.dark <= .8, `${t.id} : obscurité raisonnable`);
    for (const c of [t.shade, t.glow, ...t.sky, ...t.garland.cols]) assert.match(c, /^#[0-9a-f]{6}$/i, `${t.id} : couleur ${c}`);
    assert.ok(['fanions', 'lampions', 'ampoules'].includes(t.garland.kind));
    assert.ok(['confetti', 'petales', 'braises', 'lanternes', 'neige'].includes(t.fx));
  }
  assert.equal(THEMES.filter(t => t.night).length, 1, 'une seule nuit noire (la Nuit des Lanternes)');
  assert.ok(THEMES[ARENAS.indexOf('Nuit des Lanternes')].night);
});

test('chaque visuel d\'arène a son prompt Codex, et ses fichiers sont tous là ou tous absents', () => {
  const noms = new Set(prompts.images.map(i => i.fichier));
  for (const t of THEMES) {
    assert.ok(noms.has(`concept_${t.id}`), `concept_${t.id}`);
    const present = ARENA_PARTS.map(p => { assert.ok(noms.has(`${p}_${t.id}`), `prompt ${p}_${t.id}`); return existsSync(new URL(`art/${arenaArt(p, t.id)}.webp`, root)); });
    assert.ok(present.every(Boolean) || !present.some(Boolean), `${t.id} : visuels incomplets`);
  }
  for (const im of prompts.images) {
    if (/^(pilier|caisse|borne)_/.test(im.fichier)) assert.ok(im.detourer, `${im.fichier} est détouré`);
    if (im.reference) assert.ok(prompts.images.some(j => `brut-arenes/${j.fichier}.png` === im.reference), `${im.fichier} : référence connue`);
  }
});

test('la clôture fait le tour du plateau, avec une borne aux quatre coins et une case sur deux', () => {
  let rim = 0, posts = 0;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { if (isRim(x, y)) rim++; if (isPost(x, y)) posts++; }
  assert.equal(rim, 2 * COLS + 2 * (ROWS - 2));
  for (const [x, y] of [[0, 0], [COLS - 1, 0], [0, ROWS - 1], [COLS - 1, ROWS - 1]]) assert.ok(isPost(x, y), `coin ${x},${y}`);
  assert.equal(posts, rim / 2);
  assert.ok(!isPost(1, 1) && !isRim(7, 6));
});

test('les clôtures de chaque carte sont pleines (genMap) : le décor ne ment pas sur les murs', () => {
  seed(3);
  for (let k = 0; k < THEMES.length; k++) {
    const g = genMap(k);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isRim(x, y)) assert.equal(g[y][x], 1);
  }
});

test('le décor ne touche jamais au hasard de la partie', () => {
  seed(11); const a = [rnd(), rnd()];
  seed(11); const g = genMap(0);
  for (const t of THEMES) decorLights(t, g, 1.5);
  seed(11); assert.deepEqual([rnd(), rnd()], a);
});

test('lumières de nuit : la Nuit des Lanternes éclaire sa clôture même sans visuels', () => {
  const night = THEMES.find(t => t.night); seed(1);
  const L = decorLights(night, genMap(3), 0);
  assert.ok(L.length > 0);
  for (const l of L) assert.ok(l.r > 0 && l.a > 0 && l.a <= 1);
  assert.ok(MOTES_MAX > 0 && MOTES_MAX <= 40, 'ambiance plafonnée pour les téléphones');
});
