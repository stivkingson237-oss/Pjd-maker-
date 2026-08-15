# PJD Maker — projet Vite autonome

Ce dossier contient l'application PJD Maker prête à lancer en local avec Vite,
en dehors de l'environnement artifact Claude d'origine.

## Installation

```bash
npm install
npm run dev
```

Puis ouvre l'URL affichée (en général http://localhost:5173).

## Build de production

```bash
npm run build
npm run preview
```

## ⚠️ Points à savoir

- **`src/storagePolyfill.js`** simule `window.storage` (l'API de stockage de la
  plateforme Claude) avec `localStorage`, pour que l'app fonctionne telle quelle.
  C'est un stockage propre à chaque navigateur — pas un vrai backend partagé.
  Pour une vraie persistance (comptes utilisables depuis plusieurs appareils),
  il faut remplacer ces appels par de vrais appels à votre backend (Supabase,
  déjà partiellement en place — voir le dépôt `pjd-maker` avec les fonctions
  Edge et migrations SQL).
- Le logo est encodé en base64 directement dans `src/App.jsx` (constantes
  `LOGO_ICON` / `LOGO_FULL`) — tu peux les extraire en fichiers image séparés
  si tu préfères.
- Les identifiants Supabase (URL, clé anon, URL des fonctions) sont codés en
  dur dans `src/App.jsx` — c'est sûr pour la clé anon (faite pour être
  publique), mais si tu changes de projet Supabase, pense à les mettre à jour.
