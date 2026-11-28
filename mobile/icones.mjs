// Icônes et écran de démarrage Android, fabriqués à partir des visuels peints du jeu.
// Lancer : npm run mobile:icones   (les PNG produits sont versionnés dans android/)
//
// - icône adaptative (Android 8+) : fond = un morceau d'affiche, premier plan = le héros
// - icône classique et ronde (anciens lanceurs)
// - icône de l'écran de démarrage (Android 12+)
// - icone-512.png (fiche de l'appli, README)
import sharp from 'sharp';
import { mkdirSync, readFileSync, rmSync, rmdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const cfg = JSON.parse(readFileSync(join(ROOT, 'mobile/mobile.config.json'), 'utf8')).icon;
const RES = join(ROOT, 'android/app/src/main/res');
// WebP (Android 7+, transparence comprise) : 4 à 6 fois plus léger que le PNG.
const WEBP = { quality: 90, alphaQuality: 100, effort: 6 };
/** Chemin de sortie ; supprime l'ancien PNG du même nom (gabarit Capacitor). @param {string} dir @param {string} name */
function out(dir, name) { const png = join(dir, name + '.png'); if (existsSync(png)) rmSync(png); return join(dir, name + '.webp'); }
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

/** Fond : morceau d'affiche assombri au bord, halo doré au centre. @param {number} s */
async function background(s) {
  const c = cfg.backgroundCrop;
  const img = await sharp(join(ROOT, cfg.background)).extract(c).resize(s, s).modulate({ saturation: 1.1 }).blur(Math.max(.3, s / 260)).toBuffer();
  const veil = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">
    <defs><radialGradient id="g" cx="50%" cy="54%" r="62%">
      <stop offset="0" stop-color="${cfg.glow}" stop-opacity=".55"/><stop offset=".42" stop-color="${cfg.glow}" stop-opacity=".12"/>
      <stop offset="1" stop-color="${cfg.color}" stop-opacity=".72"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  return sharp(img).composite([{ input: veil }]).png().toBuffer();
}

/** Héros centré dans un carré transparent ; `part` = part du côté qu'il occupe. @param {number} s @param {number} part */
async function hero(s, part) {
  const inner = Math.round(s * part);
  const fg = await sharp(join(ROOT, cfg.foreground)).trim().resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  const shadow = await sharp(fg).ensureAlpha().linear([0, 0, 0, 1], [0, 0, 0, 0]).blur(Math.max(1, s / 90)).toBuffer();
  const off = Math.round((s - inner) / 2);
  return sharp({ create: { width: s, height: s, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: shadow, left: off, top: off + Math.round(s / 60), blend: 'over' }, { input: fg, left: off, top: off }]).png().toBuffer();
}

/** Masque arrondi (carré à coins ronds ou cercle). @param {number} s @param {boolean} round */
const mask = (s, round) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">${round
  ? `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}"/>` : `<rect width="${s}" height="${s}" rx="${s * .18}"/>`}</svg>`);

/** Icône complète (fond + héros) découpée. @param {number} s @param {boolean} round */
async function legacy(s, round) {
  const big = s * 4; // dessin en grand puis réduction : bords nets
  const full = await sharp(await background(big)).composite([{ input: await hero(big, .8) }]).png().toBuffer();
  const cut = await sharp(full).composite([{ input: mask(big, round), blend: 'dest-in' }]).png().toBuffer();
  return sharp(cut).resize(s, s).png({ compressionLevel: 9 }).toBuffer();
}

for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${d}`); mkdirSync(dir, { recursive: true });
  const fs = Math.round(108 * k); // 108 dp, zone sûre = cercle de 66 dp au centre
  await sharp(await hero(fs * 2, .58)).resize(fs, fs).webp(WEBP).toFile(out(dir, 'ic_launcher_foreground'));
  await sharp(await background(fs * 2)).resize(fs, fs).webp(WEBP).toFile(out(dir, 'ic_launcher_background'));
  const ls = Math.round(48 * k);
  await sharp(await legacy(ls, false)).webp(WEBP).toFile(out(dir, 'ic_launcher'));
  await sharp(await legacy(ls, true)).webp(WEBP).toFile(out(dir, 'ic_launcher_round'));
  // Écran de démarrage Android 12+ : icône de 288 dp, visible dans le cercle central de 192 dp
  const sd = join(RES, `drawable-${d}`); mkdirSync(sd, { recursive: true });
  const ss = Math.round(288 * k);
  await sharp(await hero(ss * 2, .56)).resize(ss, ss).webp(WEBP).toFile(out(sd, 'splash_icon'));
}
// Anciens écrans de démarrage de Capacitor : remplacés par l'icône ci-dessus.
for (const d of ['drawable', ...Object.keys(DENSITIES).flatMap(x => [`drawable-port-${x}`, `drawable-land-${x}`])]) {
  const f = join(RES, d, 'splash.png'); if (existsSync(f)) rmSync(f);
  if (d !== 'drawable' && existsSync(join(RES, d)) && !readdirSync(join(RES, d)).length) rmdirSync(join(RES, d));
}
await sharp(await legacy(512, false)).png({ palette: true, quality: 95, effort: 10 }).toFile(join(ROOT, 'mobile/icone-512.png'));
console.log('Icônes Android générées.');
