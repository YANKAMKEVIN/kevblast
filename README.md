# KEVBLAST

Le festival des pétards : un jeu d'arène à bombes original, jouable directement dans le navigateur.

Fais sauter les caisses, ramasse les bonus, piège tes adversaires et sois le dernier debout.

## Jouer

En ligne : https://yankamkevin.github.io/kevblast/ (publié automatiquement à chaque fusion dans `main`).

Hors ligne : `npm start`, puis http://localhost:8000. Le jeu est découpé en modules JavaScript, que les navigateurs refusent d'ouvrir directement en `file://`.

- Jusqu'à 2 joueurs sur le même clavier, plus 0 à 3 bots (Tranquille, Malin, Infernal)
- Joueur 1 : ZQSD (ou WASD) pour bouger, Espace pour poser un pétard
- Joueur 2 : flèches pour bouger, Entrée pour poser un pétard
- Manettes acceptées (A pour poser, Start pour lancer la partie)
- Sur téléphone : joystick et bouton BOUM sous l'arène
- Échap ou P : pause. M : couper la musique

## La Surcharge (mécanique signature)

Garde la touche bombe enfoncée pour charger ton pétard :
- À moitié chargé : explosion 2 cases plus loin
- Chargé à fond : flamme rose qui traverse 2 caisses
- Pendant la charge, tu ralentis

## Les héros

| Héros | Pouvoir |
|---|---|
| Kev | Flamme vive : commence avec 3 cases de portée |
| Nova | Turbo : commence plus rapide |
| Pip | Double mèche : commence avec 2 pétards |
| Mox | Bulle : un bouclier offert à chaque manche |

## Visuels
L'affiche du menu, le sol, les murs, les caisses, les portraits des 4 héros et les 7 bonus sont peints avec Codex (`art/`, WebP). Les prompts sont dans `tools/art/prompts.json` ; `tools/art/generer.sh` les génère et `tools/art/finir.py` redimensionne, détoure le fond magenta et exporte en WebP. Le jeu reste jouable si une image manque : le dessin procédural d'origine prend le relais (`src/art.js`).

## Les bonus

Pétard en plus, portée, vitesse, bouclier, coup de pied (pousse les bombes), étoile (flamme max).
Attention à la spirale violette : une malédiction (touches inversées, escargot, pétards en folie, mèche courte) que tu peux refiler en touchant un adversaire.

## Les arènes

Place du Marché, Jardin des Lanternes, Quai des Fusées, Nuit des Lanternes (dans le noir) et Lac Gelé (sous la neige). Après 2 minutes, la Finale referme l'arène en spirale.

## Technique

HTML, CSS et JavaScript sans dépendance ni étape de construction : dessin sur canvas, sons générés avec la Web Audio API. Le code est typé (JSDoc vérifié par TypeScript en mode strict) et découpé par rôle :

| Fichier | Rôle |
|---|---|
| `src/config.js` | Données : héros, arènes, bonus, plafonds, niveaux des bots, numéro de version |
| `src/state.js` | État de la partie et requêtes sur la grille |
| `src/rules.js` | Règles : arène, pétards, flammes, bonus, malédictions, Finale, manches (sans DOM) |
| `src/ai.js` | Bots : carte du danger, recherche de chemin, choix de la cible (sans DOM) |
| `src/rng.js` | Hasard reproductible (même graine, même partie) |
| `src/save.js` | Sauvegarde versionnée |
| `src/render.js` | Dessin de l'arène |
| `src/input.js` | Clavier, manettes, commandes tactiles |
| `src/ui.js` | Menu, barre des joueurs, écrans de manche, de victoire et de pause |
| `src/audio.js` | Sons et musique |
| `src/main.js` | Boucle de jeu |

## Sauvegarde

Les réglages (joueurs, héros, bots, manches), la musique et le palmarès (parties jouées, titres par héros) sont gardés dans le navigateur (`localStorage`, clé `kevblast.sauvegarde`). Le format est versionné : toute évolution ajoute une étape à `migrate()` dans `src/save.js`. Une sauvegarde abîmée ou venant d'une version plus récente n'est jamais écrasée en silence : elle est mise de côté sous `kevblast.sauvegarde.abimee` et le jeu repart des réglages par défaut. Si le stockage est bloqué (navigation privée), le jeu fonctionne sans sauvegarder.

## Tests

```bash
npm install
npx playwright install chromium
npm test              # tout ce que lance la CI
npm run types         # vérification des types
npm run unit          # règles, bots, sauvegarde, 11 parties complètes simulées (Node, ~5 s)
npm run smoke         # fumée : ordinateur, iPhone SE, Pixel 7 couché (captures dans test-results/)
npm run partie        # partie complète dans Chromium : menu -> champion -> sauvegarde -> rechargement
```

- Les parties simulées jouent 4 bots jusqu'au champion à chaque niveau de difficulté et vérifient à chaque image qu'aucun joueur ni pétard n'entre dans un mur. Elles ont trouvé un vrai bug : la Finale ne refermait jamais la ligne du centre, et deux survivants là faisaient durer la manche sans fin.
- `?graine=N` rejoue exactement la même partie ; `?turbo=N` l'accélère (utilisé par `npm run partie`).
- La CI GitHub (`.github/workflows/tests.yml`) lance tout sur chaque PR ; GitHub Pages publie directement la branche `main` (fichier `.nojekyll`).
