// Partie complète jouée de bout en bout dans un vrai navigateur (Chromium) :
// menu -> réglages -> partie (1 joueur + 3 bots, en accéléré) -> champion ->
// palmarès sauvegardé -> rechargement -> réglages et palmarès retrouvés ->
// sauvegarde abîmée mise de côté sans planter.
// Lancer : npm run partie
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer, connect } from 'node:net';
import { mkdirSync } from 'node:fs';
import { ART_FILES } from '../src/art.js';

const PORT = await new Promise(res => { const s = createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const URL = `http://127.0.0.1:${PORT}/index.html?turbo=20&graine=3`;
const OUT = process.env.SMOKE_SHOTS || 'test-results';
mkdirSync(OUT, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 100; i++) {
  const ok = await new Promise(res => { const c = connect(PORT, '127.0.0.1', () => { c.end(); res(true); }); c.on('error', () => res(false)); });
  if (ok) break; await sleep(100);
}

const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${msg}`); if (!ok) fails.push(msg); };
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(URL);
  await page.waitForSelector('#play');
  check(await page.locator('.ver').innerText() !== '', 'numéro de version affiché sous le menu');
  await page.waitForFunction(() => window.__kev.art !== undefined, null, { timeout: 15000 });
  check(await page.evaluate(() => window.__kev.art) === ART_FILES.length, `les ${ART_FILES.length} visuels peints sont chargés`);
  check((await page.locator('#ov').evaluate(el => getComputedStyle(el).backgroundImage)).includes('titre.webp'), 'affiche peinte derrière le menu');
  await page.evaluate(() => document.fonts.ready);
  check(await page.evaluate(() => document.fonts.check('20px "Lilita One"') && document.fonts.check('800 16px Nunito') && [...document.fonts].some(f => f.family.includes('Lilita') && f.status === 'loaded')), 'polices embarquées chargées (aucun appel à Google Fonts)');
  await page.screenshot({ path: `${OUT}/partie-0-menu.png` });
  await page.click('.seg[data-k=goal] button[data-v="2"]');
  await page.click('.heroes[data-k=h1] button[data-v="2"]');
  await page.click('#play');
  check(await page.locator('#ov').isHidden(), 'la partie démarre');
  await page.screenshot({ path: `${OUT}/partie-1-debut.png` });

  const t0 = Date.now();
  await page.waitForSelector('#again', { timeout: 240000 });
  check(true, `la partie va jusqu'au champion (${Math.round((Date.now() - t0) / 1000)} s en accéléré)`);
  await page.screenshot({ path: `${OUT}/partie-2-champion.png` });

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kevblast.sauvegarde') || 'null'));
  check(save?.version === 1, 'sauvegarde écrite, version 1');
  check(save?.stats.matches === 1, 'palmarès : 1 partie jouée');
  check(save?.stats.titles.reduce((a, b) => a + b, 0) === 1, 'palmarès : 1 titre attribué');
  check(save?.settings.goal === 2 && save?.settings.h1 === 2, 'réglages sauvegardés (2 manches, héros Pip)');

  await page.click('#again');
  check(await page.locator('#ov').isHidden(), 'Revanche relance une partie');
  // Téléphone verrouillé, appel, autre appli : le jeu passe en arrière-plan.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check(await page.evaluate(() => window.__kev.S.paused) && await page.locator('#resume').isVisible(), 'jeu caché (arrière-plan) : pause automatique');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  check(await page.evaluate(() => window.__kev.S.paused), 'retour au premier plan : la pause attend le joueur');
  await page.click('#quit');
  await page.reload();
  await page.waitForSelector('#play');
  check(await page.locator('.seg[data-k=goal] button[data-v="2"]').getAttribute('aria-pressed') === 'true', 'après rechargement : réglage des manches retrouvé');
  check(await page.locator('.heroes[data-k=h1] button[data-v="2"]').getAttribute('aria-pressed') === 'true', 'après rechargement : héros retrouvé');
  check((await page.locator('.palm').innerText()).includes('1 partie'), 'après rechargement : palmarès affiché');

  await page.evaluate(() => localStorage.setItem('kevblast.sauvegarde', '{abîmée'));
  await page.reload();
  await page.waitForSelector('#play');
  const kept = await page.evaluate(() => localStorage.getItem('kevblast.sauvegarde.abimee'));
  check(kept === '{abîmée', 'sauvegarde abîmée mise de côté, le jeu démarre');
  await page.screenshot({ path: `${OUT}/partie-3-menu.png` });

  check(errors.length === 0, `aucune erreur console${errors.length ? ' : ' + errors.slice(0, 3).join(' | ') : ''}`);
} finally {
  await browser.close(); server.kill();
}
console.log(fails.length ? `\n${fails.length} échec(s).` : '\nPartie complète réussie.');
process.exit(fails.length ? 1 : 0);
