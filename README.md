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

## Les héros : les Pétards Vivants

Les pièces d'artifice elles-mêmes, en carton peint, avec des bras et des jambes en caoutchouc.

| Héros | Qui c'est | Pouvoir |
|---|---|---|
| Kev | La bombe boxeuse, fanfaron au grand cœur | Flamme vive : commence avec 3 cases de portée |
| Nova | La fusée pilote, toujours pressée | Turbo : commence plus rapide |
| Pip | Les pétards jumeaux, deux têtes et zéro accord | Double mèche : commence avec 2 pétards |
| Mox | La boule fumigène, zen dans sa bulle | Bulle : un bouclier offert à chaque manche |

Dans l'arène, chaque héros a trois vues peintes (face, dos, profil, en miroir vers la gauche) que le code anime : petits bonds et dandinement en marchant, respiration au repos, tremblement pendant la Surcharge. Mox flotte, Nova laisse des traits de vitesse, un anneau à sa couleur repère chaque joueur. Chacun a ses répliques (K.O., victoire de manche, titre), choisies sans toucher au hasard de la partie pour qu'une graine rejoue toujours la même partie. L'écran du champion montre sa pose de victoire.

## Visuels
L'affiche du menu, le sol, les murs, les caisses, les héros (portrait, pose de victoire, trois vues d'arène) et les 7 bonus sont peints avec Codex (`art/`, WebP, 31 images). Les prompts sont dans `tools/art/prompts.json` ; les images de héros joignent la planche de référence `tools/art/references/petards_vivants.jpg` pour garder le même design partout. `tools/art/generer.sh` les génère et `tools/art/finir.py` redimensionne, détoure le fond magenta, découpe la fiche de modèle de chaque héros en trois vues et exporte en WebP. Le jeu reste jouable si une image manque : le dessin procédural d'origine prend le relais (`src/art.js`).

Les arènes ont leurs propres prompts (`tools/art/arenes.json`, 30 images) : un concept par arène (`tools/art/concepts/`), joint ensuite à chaque visuel de cette arène pour garder ses matières et sa lumière, puis son sol, son pilier, sa caisse, sa borne et son décor de fond (`art/arenes/`). `tools/art/rogner.py` recadre les objets détourés au plus juste. Une arène n'est chargée que si elle figure dans `PAINTED_ARENAS` (`src/art.js`), ce que vérifient les tests.

## Les bonus

Pétard en plus, portée, vitesse, bouclier, coup de pied (pousse les bombes), étoile (flamme max).
Attention à la spirale violette : une malédiction (touches inversées, escargot, pétards en folie, mèche courte) que tu peux refiler en touchant un adversaire.

## Les arènes : le Grand Festival

Chaque arène est un lieu de la fête, à une heure différente de la nuit :

| Arène | Ambiance | Piliers | Caisses |
|---|---|---|---|
| Place du Marché | crépuscule doré, étals rayés, fanions, confettis | bornes-fontaines à lanterne | caisses de pétards |
| Jardin des Lanternes | heure bleue, cerisiers, lucioles et pétales | lanternes de pierre moussues | paniers de fleurs et de fusées |
| Quai des Fusées | nuit au port, eau qui scintille, braises | bittes d'amarrage | tonneaux de poudre et fusées bâchées |
| Nuit des Lanternes | minuit dans une cour de temple : on n'y voit que ce qui brille | grandes lanternes laquées | piles de lampions |
| Lac Gelé | aurore boréale sur la glace, neige | blocs de glace à lanterne | caisses-cadeaux enneigées |

Le sol peint est calé sur les 13 x 11 cases. Piliers, caisses et bornes sont peints en trois quarts, comme les héros, et dessinés rangée par rangée pour que ce qui est devant passe devant. Une clôture de bornes reliées par des guirlandes (fanions, lampions ou ampoules) qui se balancent fait le tour du plateau, et le décor peint du lieu s'étend derrière lui. Les lanternes, les mèches et les flammes éclairent vraiment l'arène (`src/lumiere.js`), et chaque lieu a son ambiance animée (`src/decor.js`). Le décor n'utilise jamais le hasard de la partie : une graine rejoue toujours la même partie. Après 2 minutes, la Finale referme l'arène en spirale.

Côté téléphone : seuls les visuels de l'arène jouée sont attendus (les autres arrivent en arrière-plan), les objets sont réduits une seule fois à leur taille d'affichage, les ombres et les bornes immobiles sont peintes dans le sol, la lumière est calculée au quart de la résolution, et si les images ralentissent durablement le jeu retire de lui-même les halos les plus coûteux.

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
| `src/render.js` | Dessin de l'arène (ordre de profondeur, pétards, flammes, héros) |
| `src/decor.js` | Décor des arènes : sol, piliers, caisses, clôture et guirlandes, fond peint, ambiance animée |
| `src/lumiere.js` | Éclairage : obscurité teintée et halos des lanternes, mèches et flammes |
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
npm run unit          # règles, bots, héros, sauvegarde, 11 parties complètes simulées (Node, ~5 s)
npm run smoke         # fumée : ordinateur, iPhone SE, Pixel 7 couché (captures dans test-results/)
npm run partie        # partie complète dans Chromium : menu -> champion -> sauvegarde -> rechargement
```

- Les parties simulées jouent 4 bots jusqu'au champion à chaque niveau de difficulté et vérifient à chaque image qu'aucun joueur ni pétard n'entre dans un mur. Elles ont trouvé un vrai bug : la Finale ne refermait jamais la ligne du centre, et deux survivants là faisaient durer la manche sans fin.
- `?graine=N` rejoue exactement la même partie ; `?turbo=N` l'accélère (utilisé par `npm run partie`).
- La CI GitHub (`.github/workflows/tests.yml`) lance tout sur chaque PR ; GitHub Pages publie directement la branche `main` (fichier `.nojekyll`).
