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
4. Active GitHub Pages sur ce repo, une seule fois : **Settings → Pages → Build and
   deployment → Source : "GitHub Actions"**. Le workflow
   `.github/workflows/deploy-pages.yml` s'occupe ensuite de tout : il publie
   `site/index.html` (avec les données `data/*.json` à côté) à chaque changement sur
   `main`, y compris après chaque mise à jour automatique de la knowledge base. Le
   lien public apparaît dans Settings → Pages une fois le premier déploiement
   terminé (onglet Actions → workflow "Deploy WoCC Codex sur GitHub Pages").

## Le Codex sur laclauderie.fr/codex/

Le site de la guilde ([La-Clauderie](https://github.com/Reptile-New/La-Clauderie))
sert aussi ce Codex **directement sur son domaine** : son workflow de
déploiement OVH copie `site/` (sous `laclauderie.fr/codex/`) et `data/` (sous
`laclauderie.fr/data/`) à chaque déploiement puis toutes les 6 h. Rien à faire
ici — il suffit que ce repo reste public. La barre de navigation « guilde » en
haut de `site/index.html` détecte l'hôte : servie sur laclauderie.fr, elle
pointe vers la racine du domaine ; sur GitHub Pages, vers `/La-Clauderie/`.

## Ce que ça remplace / n'remplace pas

- **Remplace** : le travail manuel de "je télécharge le repo à la main, je
  transpile, je régénère les fichiers" qu'on a fait ensemble dans le chat —
  ça tourne maintenant tout seul.
- **Ne remplace pas** : l'upload dans un Project Claude.ai. Il n'existe pas d'API
  officielle pour ça (voir la conversation) — si tu veux continuer à utiliser un
  Project Claude pour poser des questions en langage naturel, il faudra toujours
  glisser le fichier Markdown à la main. Le bouton **« 📄 Export Markdown »** en
  haut du site le génère en un clic (toute l'encyclopédie, références résolues,
  toujours à la version courante des données). Le site de recherche
  (`site/index.html`), lui, ne demande aucune action manuelle et ne coûte aucun
  token : c'est de la recherche/filtre pur JavaScript sur les données JSON.

## Limites connues

- Le script bundle uniquement `src/sim/data.ts` et `src/sim/world_boss.ts`. Si le
  jeu ajoute un nouveau module de contenu qui n'est pas ré-exporté par ces deux
  fichiers, il faudra ajouter son chemin dans `dumpRegistries()`.
- Le déclenchement est basé sur un `cron` (vérification périodique), pas un
  vrai webhook instantané — voir la note dans le fichier `.yml` pour l'option
  plus réactive si besoin.
