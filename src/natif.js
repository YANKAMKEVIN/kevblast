// @ts-check
/** Appli Android (Capacitor) : bouton retour, mise en arrière-plan, écran allumé.
 *
 * Dans le navigateur, seul le passage en arrière-plan (onglet caché) est géré :
 * le jeu se met en pause et coupe le son. Dans l'appli, le bouton retour du
 * téléphone suit backAction() au lieu de fermer le jeu en pleine manche. */
import { S } from './state.js';
import { VERSION } from './config.js';
import { suspendAudio, audio } from './audio.js';

/** @typedef {'pause'|'resume'|'menu'|'exit'|'none'} BackAction */

/** Que fait le bouton retour du téléphone dans cet état du jeu ?
 * @param {string} mode @param {boolean} paused @returns {BackAction} */
export function backAction(mode, paused) {
  if (mode === 'play' || mode === 'countdown') return paused ? 'resume' : 'pause';
  if (mode === 'over') return 'menu';
  if (mode === 'menu' || mode === 'demo') return 'exit';
  return 'none';
}

/** Le pont natif de Capacitor, s'il existe (absent dans le navigateur). */
function capacitor() {
  const C = /** @type {any} */ (window).Capacitor;
  return C && typeof C.isNativePlatform === 'function' && C.isNativePlatform() ? C : null;
}

/** Vrai dans l'appli Android. */
export const isNative = () => !!capacitor();

/** @param {{togglePause:()=>void, showMenu:()=>void}} ui */
export function initNatif(ui) {
  const toBackground = () => {
    if ((S.mode === 'play' || S.mode === 'countdown') && !S.paused) ui.togglePause();
    suspendAudio();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) toBackground(); else audio(true); });

  const C = capacitor();
  if (!C) return;
  document.documentElement.classList.add('natif');
  // Toujours passer par registerPlugin : il renvoie le mandataire qui parle au plugin natif
  // (un éventuel Capacitor.Plugins.App hérité n'enregistre pas les écouteurs).
  const App = typeof C.registerPlugin === 'function' ? C.registerPlugin('App') : C.Plugins && C.Plugins.App;
  if (App && typeof App.addListener === 'function') {
    App.addListener('backButton', () => {
      const a = backAction(S.mode, S.paused);
      console.info(`KEVBLAST retour : ${a}`);
      if (a === 'pause' || a === 'resume') ui.togglePause();
      else if (a === 'menu') ui.showMenu();
      else if (a === 'exit') App.exitApp();
    });
    App.addListener('appStateChange', (/** @type {{isActive:boolean}} */ st) => { if (!st.isActive) toBackground(); });
  }
  console.info(`KEVBLAST natif prêt v${VERSION}`);
}
