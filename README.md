# WoCC Knowledge Pipeline

Extraction automatique + site de recherche pour les données de
[World of ClaudeCraft](https://github.com/levy-street/world-of-claudecraft) —
sans IA, sans token, à jour à chaque nouvelle release du jeu.

## Ce que contient ce dossier

```
scripts/extract.mjs                        → le script d'extraction (testé et fonctionnel)
.github/workflows/update-knowledge-base.yml → l'automatisation GitHub Actions
site/index.html                             → le site de recherche statique
data/                                        → généré par le script (déjà rempli, tag v0.21.0)
```

## Utilisation manuelle (pour tester ou forcer une mise à jour)

```bash
npm install esbuild --no-save
node scripts/extract.mjs v0.21.0 ./data   # un tag précis
node scripts/extract.mjs latest ./data    # le dernier tag automatiquement
```

Puis pour voir le site :
```bash
python3 -m http.server 8080
# ouvrir http://localhost:8080/site/index.html
```

## Mettre en place l'automatisation (ce que tu dois faire, une seule fois)

1. Crée un nouveau repo GitHub à toi (ex. `wocc-knowledge-base`).
2. Copie tout ce dossier dedans (`scripts/`, `.github/`, `site/`, `data/`).
3. Push. La GitHub Action se lance automatiquement toutes les heures (configurable
   dans le fichier `.yml`, section `cron`), vérifie s'il y a un nouveau tag sur le
   jeu, et si oui, régénère `data/` et commite le résultat toute seule.
4. Active GitHub Pages sur ce repo (Settings → Pages → branche `main`, dossier `/site`
   ou racine selon ta config) pour avoir un lien public vers le site de recherche,
   toujours à jour, sans rien faire.

## Ce que ça remplace / n'remplace pas

- **Remplace** : le travail manuel de "je télécharge le repo à la main, je
  transpile, je régénère les fichiers" qu'on a fait ensemble dans le chat —
  ça tourne maintenant tout seul.
- **Ne remplace pas** : l'upload dans un Project Claude.ai. Il n'existe pas d'API
  officielle pour ça (voir la conversation) — si tu veux continuer à utiliser un
  Project Claude pour poser des questions en langage naturel, il faudra toujours
  glisser le fichier Markdown à la main. Le site de recherche (`site/index.html`),
  lui, ne demande aucune action manuelle et ne coûte aucun token : c'est de la
  recherche/filtre pur JavaScript sur les données JSON.

## Limites connues

- Le script bundle uniquement `src/sim/data.ts` et `src/sim/world_boss.ts`. Si le
  jeu ajoute un nouveau module de contenu qui n'est pas ré-exporté par ces deux
  fichiers, il faudra ajouter son chemin dans `dumpRegistries()`.
- Le site ne génère pas de Markdown — si tu veux garder aussi la version texte
  pour un Project Claude, il faut un script supplémentaire qui transforme le
  JSON en Markdown (comme celui utilisé lors de notre première extraction).
- Le déclenchement est basé sur un `cron` (vérification périodique), pas un
  vrai webhook instantané — voir la note dans le fichier `.yml` pour l'option
  plus réactive si besoin.
