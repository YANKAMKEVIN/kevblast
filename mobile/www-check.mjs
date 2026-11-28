// Vérifie qu'un dossier web est autonome : toute ressource référencée (HTML, CSS,
// imports JavaScript) existe dans le dossier et rien n'est chargé depuis Internet.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/** Références d'une page HTML (src, href). @param {string} html @returns {string[]} */
export function htmlRefs(html) {
  return [...html.matchAll(/\b(?:src|href)\s*=\s*"([^"]+)"/g)].map(m => m[1]);
}
/** url(...) et @import d'une feuille de style. @param {string} css @returns {string[]} */
export function cssRefs(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...noComments.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)].map(m => m[1] || m[2]);
}
/** Imports statiques et dynamiques à chemin fixe d'un module JavaScript. @param {string} js @returns {string[]} */
export function jsRefs(js) {
  return [...js.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"](\.{1,2}\/[^'"]+)['"]/g)].map(m => m[1]);
}
const external = (/** @type {string} */ r) => /^(?:https?:)?\/\//i.test(r);
const ignorable = (/** @type {string} */ r) => /^(?:data:|blob:|#|mailto:|javascript:)/i.test(r);

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
}

/** @param {string} root dossier à vérifier @returns {string[]} problèmes (vide = autonome) */
export function checkWww(root) {
  const problems = [];
  if (!existsSync(join(root, 'index.html'))) return ['index.html manquant'];
  for (const file of walk(root)) {
    const ext = file.slice(file.lastIndexOf('.'));
    const text = ['.html', '.css', '.js', '.mjs'].includes(ext) ? readFileSync(file, 'utf8') : null;
    if (text == null) continue;
    const refs = ext === '.html' ? htmlRefs(text) : ext === '.css' ? cssRefs(text) : jsRefs(text);
    for (const r of refs) {
      const where = relative(root, file);
      if (external(r)) { problems.push(`${where} charge une ressource en ligne : ${r}`); continue; }
      if (ignorable(r)) continue;
      const target = join(r.startsWith('/') ? root : dirname(file), r.split(/[?#]/)[0]);
      if (!existsSync(target)) problems.push(`${where} référence ${r}, absent de l'appli`);
    }
  }
  return problems;
}
