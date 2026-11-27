// @ts-check
/** Point d'entrée : branche les modules et fait tourner la boucle de jeu. */
import { S } from './state.js';
import { seed } from './rng.js';
import { update } from './rules.js';
import { initRender, draw, setNow } from './render.js';
import { initInput, pollInputs, ui } from './input.js';
import { loadArt } from './art.js';
import { initUi, showMenu, togglePause, toggleMusic, updateClock, buildHud, timing } from './ui.js';

const params = new URLSearchParams(location.search);
/** ?turbo=N : N pas de simulation par image (robot de la CI). ?graine=N : partie reproductible. */
const turbo = Math.max(1, Math.min(60, Number(params.get('turbo')) || 1));
if (params.has('graine')) seed(Number(params.get('graine')));
if (turbo > 1) timing.between = 300;

initRender(/** @type {HTMLCanvasElement} */ (document.getElementById('cv')));
ui.togglePause = togglePause; ui.toggleMusic = toggleMusic;
initInput();
initUi();

let last = performance.now();
/** @param {number} t */
function frame(t) {
  let dt = Math.min(.05, (t - last) / 1000); last = t; setNow(t / 1000);
  try { pollInputs(); } catch (e) { /* manette débranchée */ }
  for (let i = 0; i < turbo; i++) step(turbo > 1 ? 1 / 60 : dt);
  updateClock();
  try { draw(); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
/** @param {number} dt */
function step(dt) {
  if (S.slow > 0) { S.slow -= dt; dt *= .3; }
  if (S.paused) return;
  update(dt);
  // joueur(s) éliminé(s) : les bots finissent la manche en accéléré
  if (S.mode === 'play' && S.cur && S.cur.humans > 0 && !S.players.some(p => p.human >= 0 && p.alive)) {
    if (!S.ff) { S.ff = 1; S.banner = { text: 'Éliminé ! Accéléré ×3', t: 1.6 }; }
    update(dt); update(dt);
  }
}

showMenu();
// Visuels peints : dès qu'ils sont là, le sol est refait et le menu reprend les portraits.
loadArt().then(n => {
  S.floor = null;
  if (S.mode === 'demo') showMenu(); else if (S.cur) buildHud();
  /** @type {any} */ (window).__kev.art = n;
});
if (document.fonts) document.fonts.ready.then(() => { S.floor = null; if (S.cur && S.mode !== 'demo') buildHud(); });
/** Accès pour les tests de bout en bout. */
Object.assign(window, { __kev: { S } });
requestAnimationFrame(frame);
