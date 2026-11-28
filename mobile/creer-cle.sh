#!/usr/bin/env bash
# Crée la clé de signature des applis Android de Kevin et la range dans les secrets
# GitHub du dépôt, pour que chaque APK publié s'installe par-dessus le précédent.
# À lancer UNE fois sur ton Mac, depuis le dossier du jeu (outils : keytool, gh).
#   bash mobile/creer-cle.sh             -> crée ~/.kevin-android/kevin-apps.keystore si besoin
#                                           puis remplit les secrets de ce dépôt
# Pour un autre jeu, relancer la même commande dans son dossier : la clé existante est réutilisée.
set -euo pipefail
DIR="$HOME/.kevin-android"; KS="$DIR/kevin-apps.keystore"; PWF="$DIR/mot-de-passe"
mkdir -p "$DIR"; chmod 700 "$DIR"
if [ ! -f "$KS" ]; then
  openssl rand -base64 24 | tr -d '\n' > "$PWF"; chmod 600 "$PWF"
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -alias kevin -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$(cat "$PWF")" -keypass "$(cat "$PWF")" -dname "CN=Kevin Creations, O=Kevin Creations, C=FR"
  echo "Clé créée : $KS (garde une copie de ce dossier en lieu sûr, elle signe toutes les mises à jour)."
fi
base64 < "$KS" | tr -d '\n' | gh secret set ANDROID_KEYSTORE_BASE64
gh secret set ANDROID_KEYSTORE_PASSWORD < "$PWF"
echo "Secrets ANDROID_KEYSTORE_BASE64 et ANDROID_KEYSTORE_PASSWORD enregistrés pour $(gh repo view --json nameWithOwner -q .nameWithOwner)."
