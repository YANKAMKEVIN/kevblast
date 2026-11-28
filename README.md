# KEVBLAST

Le festival des pétards : un jeu d'arène à bombes original, jouable directement dans le navigateur.

Fais sauter les caisses, ramasse les bonus, piège tes adversaires et sois le dernier debout.

## Jouer

En ligne : https://yankamkevin.github.io/kevblast/ (publié automatiquement à chaque fusion dans `main`).

Sur Android (appli) : sur le téléphone, ouvrir https://github.com/yankamkevin/kevblast/releases/latest/download/kevblast.apk, puis ouvrir le fichier téléchargé et autoriser l'installation (voir « L'appli Android » plus bas).

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
| `src/natif.js` | Appli Android : bouton retour, pause en arrière-plan (aussi dans le navigateur) |

## L'appli Android

Le même jeu, emballé avec [Capacitor](https://capacitorjs.com) dans une vraie appli Android (`dev.kevin.kevblast`), qui marche sans connexion :

- Plein écran (barres système masquées, un glissement depuis le bord les rappelle), écran toujours allumé pendant qu'on joue, portrait comme paysage, caméra perforée du Galaxy S24 évitée.
- Bouton retour du téléphone : met la partie en pause, puis la reprend ; après la victoire, revient au menu ; depuis le menu, ferme l'appli. Entre deux manches il ne fait rien (pas de sortie par erreur).
- Appel, verrouillage, autre appli : la partie se met en pause et le son se coupe (aussi dans le navigateur quand l'onglet est caché).
- Icône et écran de démarrage tirés des visuels peints (Kev sur le ciel de feux d'artifice de l'affiche), générés par `npm run mobile:icones`.
- Polices embarquées (`fonts/`, licence OFL) : plus aucun appel à Google Fonts, ni dans l'appli ni sur le web.
- Palmarès et réglages gardés dans l'appli (même sauvegarde versionnée que sur le web).

**Installer sur le téléphone** : chaque fusion dans `main` publie l'APK sur la page [Releases](https://github.com/yankamkevin/kevblast/releases). Sur le S24 : ouvrir le lien `releases/latest/download/kevblast.apk`, télécharger, ouvrir le fichier, autoriser « Installer des applis inconnues » pour le navigateur la première fois. Pour que les versions suivantes s'installent par-dessus sans perdre le palmarès, elles doivent toutes être signées avec la même clé : lancer une fois `bash mobile/creer-cle.sh` sur le Mac (crée la clé dans `~/.kevin-android/`, jamais dans le dépôt, et remplit les secrets `ANDROID_KEYSTORE_BASE64` et `ANDROID_KEYSTORE_PASSWORD` du dépôt). Sans ces secrets, l'APK est signé avec une clé de debug jetable : il s'installe, mais chaque nouvelle version demande de désinstaller l'ancienne. La même clé sert pour tous les jeux et pour le Play Store plus tard. Sur chaque PR, l'APK est aussi téléchargeable dans les artefacts de l'action « Android ».

**Construire soi-même** (Java 21 et SDK Android requis) :

```bash
npm install
npm run mobile:apk     # -> android/app/build/outputs/apk/release/app-release.apk
npm run mobile:test    # parcours complet sur un téléphone branché en USB (débogage USB activé) ou un émulateur
```

| Fichier | Rôle |
|---|---|
| `capacitor.config.json` | Identifiant et nom de l'appli |
| `mobile/mobile.config.json` | Fichiers du jeu embarqués, sources de l'icône |
| `mobile/build-www.mjs` | Copie le jeu dans `mobile/www` et vérifie que tout est embarqué, rien chargé d'Internet |
| `mobile/icones.mjs` | Icônes (adaptative, ronde, classique) et écran de démarrage depuis les visuels |
| `mobile/creer-cle.sh` | Crée la clé de signature sur le Mac et la range dans les secrets GitHub |
| `android/` | Projet Android (version = celle de `package.json`, plein écran dans `MainActivity.java`) |
| `tests/android.mjs` | Parcours complet sur Android |
| `mobile/GABARIT.md` | Comment appliquer la même chose à un autre jeu web |

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
npm run mobile:test   # parcours complet de l'appli sur Android (téléphone branché ou émulateur)
```

- Les parties simulées jouent 4 bots jusqu'au champion à chaque niveau de difficulté et vérifient à chaque image qu'aucun joueur ni pétard n'entre dans un mur. Elles ont trouvé un vrai bug : la Finale ne refermait jamais la ligne du centre, et deux survivants là faisaient durer la manche sans fin.
- `?graine=N` rejoue exactement la même partie ; `?turbo=N` l'accélère (utilisé par `npm run partie`).
- Le parcours Android (`tests/android.mjs`, sur émulateur dans la CI) installe l'APK et vérifie : démarrage, 31 visuels et polices embarqués, pont natif, partie lancée au doigt, joystick, bouton BOUM, cadence d'images, bouton retour (pause puis reprise), passage en arrière-plan, paysage, sortie de l'appli, aucune erreur JavaScript ni plantage natif. Captures et journal dans les artefacts `captures-android`.
- La CI GitHub (`.github/workflows/tests.yml` pour le jeu, `.github/workflows/android.yml` pour l'APK) lance tout sur chaque PR ; GitHub Pages publie directement la branche `main` (fichier `.nojekyll`).
