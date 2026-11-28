// Parcours complet de l'appli Android sur un vrai Android (émulateur de la CI ou
// téléphone branché en USB) : installation, démarrage, visuels et polices
// embarqués, pont natif, partie lancée au doigt, bouton retour, mise en
// arrière-plan, rotation en paysage, cadence d'images, sortie de l'appli.
//
// Lancer : npm run mobile:test -- [chemin/vers/app.apk]
// (APK de debug par défaut : il autorise l'inspection de la WebView par adb)
import { _android as android } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ART_FILES } from '../src/art.js';

const ROOT = new URL('..', import.meta.url).pathname;
const { appId: PKG } = JSON.parse(readFileSync(`${ROOT}capacitor.config.json`, 'utf8'));
const { version: VERSION } = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8'));
const APK = process.argv[2] || `${ROOT}android/app/build/outputs/apk/debug/app-debug.apk`;
const OUT = process.env.SMOKE_SHOTS || 'test-results';
const MIN_FPS = Number(process.env.ANDROID_MIN_FPS || 10); // émulateur logiciel de la CI : lent ; le S24 tient 60
mkdirSync(OUT, { recursive: true });

const sleep = (/** @type {number} */ ms) => new Promise(r => setTimeout(r, ms));
const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${msg}`); if (!ok) fails.push(msg); return ok; };

const [device] = await android.devices();
if (!device) { console.error('Aucun appareil Android (adb devices est vide).'); process.exit(1); }
console.log(`Appareil : ${device.model()} (${device.serial()})`);
const sh = async (/** @type {string} */ cmd) => String(await device.shell(cmd));
const shot = async (/** @type {string} */ name) => writeFileSync(`${OUT}/android-${name}.png`, await device.shell('screencap -p'));
/** Attend une condition dans la page. @param {any} page @param {string} what @param {Function} fn @param {number} [ms] */
const until = async (page, what, fn, ms = 15000) => {
  try { await page.waitForFunction(fn, null, { timeout: ms }); return true; } catch { return check(false, `${what} (délai dépassé)`); }
};
/** Touche réelle sur l'écran, au centre d'un élément de la page (amené à l'écran d'abord :
 * le menu défile en portrait). Renvoie l'élément réellement sous le doigt, pour le diagnostic.
 * @param {any} page @param {string} sel */
async function tapOn(page, sel, holdMs = 0) {
  await page.evaluate((/** @type {string} */ s) => document.querySelector(s).scrollIntoView({ block: 'center', inline: 'center' }), sel);
  await sleep(400);
  const p = await page.evaluate((/** @type {string} */ s) => { const el = document.querySelector(s), r = el.getBoundingClientRect(), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return { x: cx * devicePixelRatio, y: cy * devicePixelRatio, ok: !!hit && (hit === el || el.contains(hit)), hit: hit ? hit.tagName + '#' + hit.id + '.' + hit.className : 'rien', dpr: devicePixelRatio, w: innerWidth, h: innerHeight }; }, sel);
  const screen = (await sh('wm size')).match(/(\d+)x(\d+)\s*$/m);
  console.log(`      toucher ${sel} à ${p.x | 0},${p.y | 0} px (fenêtre ${p.w}x${p.h} à ×${p.dpr}, écran ${screen ? screen[1] + 'x' + screen[2] : '?'}, sous le doigt : ${p.hit})`);
  await sh(holdMs ? `input swipe ${p.x | 0} ${p.y | 0} ${p.x | 0} ${p.y | 0} ${holdMs}` : `input tap ${p.x | 0} ${p.y | 0}`);
  return p.ok;
}

try {
  await device.installApk(readFileSync(APK));
  await sh(`pm clear ${PKG}`);
  await sh('settings put system accelerometer_rotation 0; settings put system user_rotation 0');
  await sh('logcat -c');
  const t0 = Date.now();
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  const webview = await device.webView({ pkg: PKG }, { timeout: 30000 });
  const page = await webview.page();
  await until(page, 'le jeu démarre', () => window.__kev && document.getElementById('play'), 30000);
  check(true, `appli ouverte et menu affiché en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

  await until(page, 'visuels chargés', () => window.__kev.art !== undefined);
  check(await page.evaluate(() => window.__kev.art) === ART_FILES.length, `les ${ART_FILES.length} visuels peints sont embarqués et chargés`);
  await page.evaluate(() => document.fonts.ready);
  check(await page.evaluate(() => document.fonts.check('20px "Lilita One"') && [...document.fonts].some(f => f.family.includes('Lilita') && f.status === 'loaded')), 'polices embarquées chargées (hors ligne)');
  check(await page.evaluate(() => window.Capacitor?.isNativePlatform() && document.documentElement.classList.contains('natif')), 'pont natif Capacitor actif');
  check((await sh('logcat -d -s Capacitor/Console:*')).includes(`KEVBLAST natif prêt v${VERSION}`), `plugin App branché (journal : « natif prêt v${VERSION} »)`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'portrait : aucun débordement horizontal');
  await shot('1-menu');

  // Partie lancée au doigt
  await tapOn(page, '#play');
  await until(page, 'la partie démarre au toucher de « Jouer »', () => ['play', 'countdown'].includes(window.__kev.S.mode) && document.getElementById('ov').hidden);
  check(await page.evaluate(() => document.body.classList.contains('touchy') && getComputedStyle(document.getElementById('touch')).display !== 'none'), 'joystick et bouton BOUM affichés');
  if (!await until(page, 'fin du compte à rebours', () => window.__kev.S.mode === 'play', 10000)) throw new Error('la partie n\'a pas démarré');
  const me = () => page.evaluate(() => { const p = window.__kev.S.players.find(q => q.human === 0); return { x: p.x, y: p.y }; });
  const before = await me();
  for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
    const c = await page.evaluate(() => { const r = document.getElementById('pad').getBoundingClientRect(); return { x: (r.x + r.width / 2) * devicePixelRatio, y: (r.y + r.height / 2) * devicePixelRatio, d: 45 * devicePixelRatio }; });
    await sh(`input swipe ${c.x | 0} ${c.y | 0} ${(c.x + dx * c.d) | 0} ${(c.y + dy * c.d) | 0} 900`);
    const now = await me();
    if (Math.hypot(now.x - before.x, now.y - before.y) > .3) break;
  }
  const after = await me();
  check(Math.hypot(after.x - before.x, after.y - before.y) > .3, 'le joystick déplace le héros');
  const bombs0 = await page.evaluate(() => window.__kev.S.bombs.length);
  await tapOn(page, '#tb', 120);
  check(await page.waitForFunction(n => window.__kev.S.bombs.length > n || window.__kev.S.mode !== 'play', bombs0, { timeout: 3000 }).then(() => true, () => false), 'le bouton BOUM pose un pétard');
  await shot('2-partie');

  // Mesure de la cadence pendant 3 s de partie
  const fps = await page.evaluate(() => new Promise(res => { let n = 0; const t = performance.now(); const f = () => { n++; if (performance.now() - t < 3000) requestAnimationFrame(f); else res(n / 3); }; requestAnimationFrame(f); }));
  check(fps >= MIN_FPS, `cadence en partie : ${fps.toFixed(0)} images/s (minimum ${MIN_FPS})`);

  // Bouton retour du téléphone
  await sh('input keyevent KEYCODE_BACK');
  await until(page, 'retour en partie : pause', () => window.__kev.S.paused && !!document.getElementById('resume'), 5000) && check(true, 'retour en partie : pause (l\'appli ne se ferme pas)');
  await shot('3-pause');
  await sh('input keyevent KEYCODE_BACK');
  await until(page, 'retour en pause : reprise', () => !window.__kev.S.paused, 5000) && check(true, 'retour en pause : la partie reprend');

  // Arrière-plan (bouton accueil) puis retour dans l'appli
  await sh('input keyevent KEYCODE_HOME');
  await sleep(1500);
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  await sleep(1000);
  check(await page.evaluate(() => window.__kev.S.paused && window.__kev.S.mode !== 'menu'), 'après un passage en arrière-plan : partie conservée, en pause');

  // Paysage (Galaxy S24 tenu à l'horizontale)
  await sh('settings put system user_rotation 1');
  await page.waitForFunction(() => innerWidth > innerHeight, null, { timeout: 8000 }).catch(() => {});
  await sleep(800);
  const land = await page.evaluate(() => {
    const vis = (/** @type {string} */ id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1; };
    return { landscape: innerWidth > innerHeight, overflow: document.documentElement.scrollWidth > innerWidth + 1, resume: vis('resume') };
  });
  check(land.landscape && !land.overflow && land.resume, 'paysage : mise en page adaptée, bouton « Reprendre » à l\'écran');
  await page.click('#resume');
  await sleep(600);
  check(await page.evaluate(() => { const vis = (/** @type {string} */ id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; }; return vis('pad') && vis('tb') && vis('cv'); }), 'paysage : arène, joystick et BOUM visibles en entier');
  await shot('4-paysage');
  await sh('settings put system user_rotation 0');
  await sleep(800);

  // Quitter la partie puis sortir de l'appli par le bouton retour
  await sh('input keyevent KEYCODE_BACK');
  await until(page, 'pause avant de quitter', () => !!document.getElementById('quit'), 5000);
  await page.click('#quit');
  await until(page, 'retour au menu', () => !!document.getElementById('play'), 5000);
  await sh('input keyevent KEYCODE_BACK');
  await sleep(1500);
  const top = await sh('dumpsys activity activities | grep -E "topResumedActivity|ResumedActivity" | head -3');
  check(!top.includes(PKG), 'retour depuis le menu : l\'appli se ferme');

  const log = await sh('logcat -d');
  const crash = log.split('\n').filter(l => /FATAL EXCEPTION|AndroidRuntime.*dev\.kevin/.test(l));
  check(crash.length === 0, `aucun plantage natif${crash.length ? ' : ' + crash.slice(0, 2).join(' | ') : ''}`);
  const jsErr = log.split('\n').filter(l => /Capacitor\/Console/.test(l) && /\sE\s|Uncaught|TypeError|ReferenceError/.test(l));
  check(jsErr.length === 0, `aucune erreur JavaScript${jsErr.length ? ' : ' + jsErr.slice(0, 3).join(' | ') : ''}`);
  writeFileSync(`${OUT}/android-logcat.txt`, log);
} catch (e) {
  check(false, `parcours interrompu : ${e instanceof Error ? e.message : e}`);
  await shot('erreur').catch(() => {});
} finally {
  await device.close();
}
console.log(fails.length ? `\n${fails.length} échec(s) sur Android.` : '\nParcours Android réussi.');
process.exit(fails.length ? 1 : 0);
