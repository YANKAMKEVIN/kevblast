// Appli Android : cohérence de la configuration, fichiers embarqués, icônes, bouton retour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { backAction } from '../../src/natif.js';
import { buildWww } from '../../mobile/build-www.mjs';
import { checkWww, cssRefs, htmlRefs, jsRefs } from '../../mobile/www-check.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const read = (/** @type {string} */ p) => readFileSync(join(ROOT, p), 'utf8');
const cap = JSON.parse(read('capacitor.config.json'));
const gradle = read('android/app/build.gradle');

test('bouton retour : pause en partie, reprise en pause, menu après la victoire, sortie depuis le menu', () => {
  assert.equal(backAction('play', false), 'pause');
  assert.equal(backAction('countdown', false), 'pause');
  assert.equal(backAction('play', true), 'resume');
  assert.equal(backAction('over', false), 'menu');
  assert.equal(backAction('menu', false), 'exit');
  assert.equal(backAction('demo', false), 'exit');
  assert.equal(backAction('roundEnd', false), 'none', 'entre deux manches, le retour ne fait rien (pas de sortie accidentelle)');
});

test('un seul identifiant d\'appli partout (Capacitor, Gradle, code Java, nom affiché)', () => {
  assert.match(cap.appId, /^dev\.kevin\.[a-z0-9]+$/);
  assert.ok(gradle.includes(`namespace = "${cap.appId}"`), 'namespace Gradle');
  assert.ok(gradle.includes(`applicationId "${cap.appId}"`), 'applicationId Gradle');
  const java = read(`android/app/src/main/java/${cap.appId.replaceAll('.', '/')}/MainActivity.java`);
  assert.ok(java.startsWith(`package ${cap.appId};`), 'paquet de MainActivity');
  const strings = read('android/app/src/main/res/values/strings.xml');
  assert.ok(strings.includes(`<string name="app_name">${cap.appName}</string>`), 'nom affiché sous l\'icône');
  assert.equal(cap.webDir, 'mobile/www');
});

test('la version de l\'appli vient de package.json (versionName et versionCode croissant)', () => {
  assert.ok(gradle.includes("rootProject.file('../package.json')"));
  assert.ok(gradle.includes('versionName pkg.version'));
  assert.ok(gradle.includes('semver[0] * 10000 + semver[1] * 100 + semver[2]'));
  assert.ok(gradle.includes('env.KEV_KEYSTORE'), 'clé de signature fournie par la CI');
  assert.ok(!existsSync(join(ROOT, 'android/app/kevin.keystore')) && read('.gitignore').includes('android/*.keystore'), 'aucune clé versionnée');
});

test('les fichiers embarqués sont complets et ne chargent rien depuis Internet', () => {
  const out = mkdtempSync(join(tmpdir(), 'kevwww-'));
  try {
    assert.deepEqual(buildWww(out), []);
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    assert.ok(existsSync(join(out, 'capacitor.js')), 'pont Capacitor embarqué');
    assert.ok(html.indexOf('capacitor.js') < html.indexOf('src/main.js'), 'pont chargé avant le jeu');
    assert.match(html, /user-scalable=no/, 'pas de zoom au pincement dans l\'appli');
    for (const f of ['src/natif.js', 'fonts/fonts.css', 'art/titre.webp', 'style.css']) assert.ok(existsSync(join(out, f)), f);
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('le jeu web lui-même ne dépend plus de Google Fonts', () => {
  for (const r of [...htmlRefs(read('index.html')), ...cssRefs(read('style.css'))]) assert.doesNotMatch(r, /^(https?:)?\/\//, r);
});

test('le contrôle repère une ressource manquante ou en ligne', () => {
  const dir = mkdtempSync(join(tmpdir(), 'kevchk-'));
  try {
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'index.html'), '<link href="a.css" rel="stylesheet"><script src="https://cdn.example/x.js"></script><img src="data:image/png;base64,AA">');
    writeFileSync(join(dir, 'a.css'), '/* url(commentaire.png) */ @font-face{src:url(\'f.woff2\')} b{background:url(#id)}');
    writeFileSync(join(dir, 'src/m.js'), "import { a } from './absent.js'; const x = import('../a.css');");
    const p = checkWww(dir);
    assert.equal(p.length, 3, p.join('\n'));
    assert.ok(p.some(m => m.includes('https://cdn.example/x.js')));
    assert.ok(p.some(m => m.includes('f.woff2')));
    assert.ok(p.some(m => m.includes('./absent.js')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.deepEqual(jsRefs("import x from './a.js';\nexport * from \"../b.js\""), ['./a.js', '../b.js']);
});

test('icônes et écran de démarrage présents pour toutes les densités', () => {
  for (const d of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    for (const f of ['ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground', 'ic_launcher_background'])
      assert.ok(existsSync(join(ROOT, `android/app/src/main/res/mipmap-${d}/${f}.webp`)), `${d}/${f}`);
    assert.ok(existsSync(join(ROOT, `android/app/src/main/res/drawable-${d}/splash_icon.webp`)), `${d}/splash_icon`);
  }
  for (const f of ['ic_launcher', 'ic_launcher_round']) {
    const xml = read(`android/app/src/main/res/mipmap-anydpi-v26/${f}.xml`);
    assert.match(xml, /@mipmap\/ic_launcher_background/); assert.match(xml, /@mipmap\/ic_launcher_foreground/);
  }
  const styles = read('android/app/src/main/res/values/styles.xml');
  assert.match(styles, /windowSplashScreenAnimatedIcon">@drawable\/splash_icon/);
});

test('les fichiers XML Android sont bien formés (ce que refuse aapt avant même la construction)', () => {
  const walk = (/** @type {string} */ d) => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.xml') ? [join(d, e.name)] : []);
  const files = walk(join(ROOT, 'android/app/src/main'));
  assert.ok(files.length > 5);
  for (const f of files) {
    const xml = readFileSync(f, 'utf8');
    for (const [, c] of xml.matchAll(/<!--([\s\S]*?)-->/g)) assert.ok(!c.includes('--'), `${f} : « -- » interdit dans un commentaire XML`);
    const open = (xml.match(/<[A-Za-z][^>]*[^/]>/g) || []).filter(t => !t.startsWith('<?')).length;
    const close = (xml.match(/<\/[^>]+>/g) || []).length;
    assert.equal(open, close, `${f} : balises ouvertes et fermées en nombre différent`);
  }
});
