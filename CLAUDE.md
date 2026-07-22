# WoCC Knowledge Base

> **Style de réponse** : l'utilisateur veut des réponses COURTES. Aller à
> l'essentiel, pas de longs exposés ni de listes exhaustives.

- Repo 100 % automatisé : `data/*.json` est généré par `scripts/extract.mjs`
  (workflow `update-knowledge-base.yml`, cron 5 min) — **ne jamais éditer
  `data/` à la main**.
- La barre de navigation de `site/index.html` est chargée depuis
  `https://laclauderie.fr/assets/nav.js` (source unique côté La-Clauderie).
- Le hook `.claude/hooks/session-start.sh` clone le code du jeu en lecture
  seule dans `../world-of-claudecraft`.
- Runbook complet de l'écosystème : `La-Clauderie/CLAUDE.md`.
