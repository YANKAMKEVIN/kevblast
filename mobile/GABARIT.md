# Gabarit : faire l'appli Android d'un jeu web

KEVBLAST sert de modèle. Pour un autre jeu web sans étape de construction (kevflip, kevrage, kevcadence…), copier puis adapter :

| Copier tel quel | Adapter |
|---|---|
| `mobile/build-www.mjs`, `mobile/www-check.mjs`, `mobile/icones.mjs` | `mobile/mobile.config.json` : fichiers du jeu à embarquer, héros et fond de l'icône, couleur de fond |
| `mobile/creer-cle.sh` (puis le lancer dans le dossier du jeu : même clé pour tous) | `capacitor.config.json` : `appId` = `dev.kevin.<nom>`, `appName`, `backgroundColor` |
| `.github/workflows/android.yml` | dans le workflow : nom de l'APK (`kevblast.apk`) et texte de la release |
| `tests/android.mjs` (squelette) | les étapes propres au jeu : bouton « Jouer », commandes tactiles, état exposé pour les tests |
| `src/natif.js` (squelette) | `backAction()` selon les écrans du jeu (pause, menu, sortie) |

## Étapes

1. Polices : les télécharger dans `fonts/` (woff2, sous-ensembles latin et latin-ext) et remplacer le lien Google Fonts de `index.html` par `fonts/fonts.css`. `npm run mobile:www` refuse toute ressource chargée depuis Internet.
2. `npm install -E @capacitor/core @capacitor/android @capacitor/app` et `npm install -DE @capacitor/cli sharp`, puis les scripts `mobile:*` de `package.json`.
3. `npm run mobile:www && npx cap add android`, puis reprendre de KEVBLAST : `android/app/build.gradle` (version lue dans `package.json`, signature), `MainActivity.java` (plein écran, écran allumé ; changer la ligne `package`), `res/values/styles.xml` et `ic_launcher_background.xml` (couleur du jeu), `mipmap-anydpi-v26/*.xml`, `AndroidManifest.xml` (`appCategory`, `screenOrientation`).
4. `npm run mobile:icones`, regarder `mobile/icone-512.png`.
5. Brancher `src/natif.js` dans le point d'entrée du jeu (`initNatif({ togglePause, showMenu })`) et ajouter `mobile/www/` au `.gitignore`.
6. Tests : reprendre `tests/unit/mobile.test.mjs` (identifiant unique, fichiers embarqués, icônes, bouton retour) et un parcours `tests/partie.mjs` qui vérifie la pause quand l'onglet est caché.
7. PR : la CI « Android » construit l'APK, le joue sur émulateur, puis le publie à la fusion dans `main` (`releases/latest/download/<jeu>.apk`).

## Points d'attention

- Le jeu doit exposer son état aux tests (`window.__kev` dans KEVBLAST) pour que le parcours Android puisse vérifier ce qui se passe.
- Le jeu doit être jouable au doigt : sinon, ajouter d'abord des commandes tactiles (et les tester dans `tests/smoke.mjs` en profil téléphone).
- Un jeu avec étape de construction (Vite…) : pointer `webDir` sur le dossier construit et appeler `checkWww()` dessus au lieu de `build-www.mjs`.
