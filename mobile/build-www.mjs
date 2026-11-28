// Prépare les fichiers du jeu embarqués dans l'appli Android (mobile/www, non versionné).
// Lancer : npm run mobile:www   (npm run mobile:sync les copie ensuite dans android/)
//
// Le jeu n'a pas d'étape de construction : on copie les fichiers listés dans
// mobile/mobile.config.json, on adapte la balise viewport (pas de zoom au pincement
// dans l'appli), puis on vérifie que tout ce que la page charge est bien embarqué
// et qu'aucune ressource ne vient d'Internet (l'appli doit marcher hors ligne).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkWww } from './www-check.mjs';

const ROOT = new URL('..', import.meta.url).pathname;

/** @param {string} [out] dossier de sortie (par défaut mobile/www) @returns {string[]} problèmes trouvés */
export function buildWww(out = join(ROOT, 'mobile/www')) {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'mobile/mobile.config.json'), 'utf8'));
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  for (const entry of cfg.web) {
    const src = join(ROOT, entry);
    if (!existsSync(src)) throw new Error(`mobile.config.json : « ${entry} » introuvable`);
    cpSync(src, join(out, entry), { recursive: true });
  }
  // Cœur JavaScript de Capacitor (pont vers les plugins natifs : bouton retour, etc.),
  // chargé avant le jeu ; le jeu reste sans étape de construction.
  cpSync(join(ROOT, 'node_modules/@capacitor/core/dist/capacitor.js'), join(out, 'capacitor.js'));
  const index = join(out, 'index.html');
  const html = readFileSync(index, 'utf8')
    .replace(/<meta name="viewport"[^>]*>/,
      '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">')
    .replace(/<script type="module"/, '<script src="capacitor.js"></script>\n<script type="module"');
  writeFileSync(index, html);
  return checkWww(out);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problems = buildWww();
  if (problems.length) {
    console.error('Fichiers de l\'appli incomplets :\n- ' + problems.join('\n- '));
    process.exit(1);
  }
  console.log('mobile/www prêt.');
}
