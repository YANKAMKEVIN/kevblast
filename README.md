# KEVBLAST

Le festival des pétards : un jeu d'arène à bombes original, jouable directement dans le navigateur.

Fais sauter les caisses, ramasse les bonus, piège tes adversaires et sois le dernier debout.

## Jouer

Ouvre `index.html` dans un navigateur (Chrome, Safari, Firefox). Aucune installation n'est nécessaire.

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

## Les bonus

Pétard en plus, portée, vitesse, bouclier, coup de pied (pousse les bombes), étoile (flamme max).
Attention à la spirale violette : une malédiction (touches inversées, escargot, pétards en folie, mèche courte) que tu peux refiler en touchant un adversaire.

## Les arènes

Place du Marché, Jardin des Lanternes, Quai des Fusées, Nuit des Lanternes (dans le noir) et Lac Gelé (sous la neige). Après 2 minutes, la Finale referme l'arène en spirale.

## Technique

Un seul fichier `index.html` : HTML, CSS et JavaScript, dessin sur canvas, sons générés avec la Web Audio API. Aucune image ni dépendance externe (à part les polices Google Fonts).
