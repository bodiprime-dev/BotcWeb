# Blood on the Clocktower — Table Virtuelle

Application web temps réel pour jouer à Blood on the Clocktower.
**Stack :** Next.js 14 · React · Tailwind · Pusher Channels · Vercel KV · TypeScript

---

## 🧱 Architecture

```
clocktower/
├── app/
│   ├── page.tsx                    Accueil (créer/rejoindre)
│   ├── game/[code]/page.tsx        Lobby + Conteur + Joueur
│   ├── api/
│   │   ├── game/create             POST → { code }
│   │   ├── game/join               POST → { playerId }
│   │   ├── game/state              GET  → vue joueur
│   │   ├── game/action             POST → applique action + broadcast
│   │   └── game/[code]             GET  → état brut
│   ├── layout.tsx
│   └── globals.css
├── data/
│   └── scripts.ts                  ⭐ Trouble Brewing + Bad Moon Rising
├── lib/
│   ├── types.ts                    GameState, Player, GameAction
│   ├── store.ts                    KV (lire/écrire les parties)
│   ├── game.ts                     Reducer pur + génération de codes
│   ├── pusher-server.ts            Push d'événements
│   └── pusher-client.ts            Abonnement temps réel
└── package.json
```

**Flux temps réel :** un joueur déclenche une action → POST `/api/game/action` →
le serveur applique le reducer, sauve en KV, broadcast via Pusher → tous les
clients abonnés au canal `game-XXXX` reçoivent le nouvel état.

---

## 🚀 Tout faire depuis l'iPad — pas-à-pas

### Étape 1 — Compte GitHub
Crée un compte sur [github.com](https://github.com) si tu n'en as pas.

### Étape 2 — Créer le repo
1. Sur github.com, clique **+ → New repository**
2. Nom : `clocktower`, **Public** ou **Private** au choix, coche **Add a README**
3. **Create repository**

### Étape 3 — Uploader les fichiers
1. Dans le repo, clique **Add file → Upload files**
2. Glisse-dépose le dossier `clocktower/` complet (tu peux compresser puis Safari extraira)
3. Plus simple : utilise **github.dev** — sur la page du repo, presse `.` (point) sur ton clavier iPad. Ça ouvre VS Code dans le navigateur. Tu peux créer/coller chaque fichier à la main, ou drag-drop.
4. Une fois tout en place, en bas à gauche de github.dev → bouton **Source Control** → écris un message (`initial commit`) → **Commit & Push**.

### Étape 4 — Créer une app Pusher (gratuit)
1. Va sur [pusher.com](https://pusher.com), crée un compte
2. **Channels → Create app**
3. Nom : `clocktower`, Cluster : `eu` (ou `us2` si tu préfères), Frontend : React, Backend : Node.js
4. Onglet **App keys** → garde sous la main : `app_id`, `key`, `secret`, `cluster`

### Étape 5 — Déployer sur Vercel
1. Va sur [vercel.com](https://vercel.com), connecte-toi avec GitHub
2. **Add New → Project** → importe ton repo `clocktower`
3. Avant de cliquer Deploy, ouvre **Environment Variables** et ajoute :
   - `PUSHER_APP_ID` = ton app_id
   - `NEXT_PUBLIC_PUSHER_KEY` = ta key
   - `PUSHER_SECRET` = ton secret
   - `NEXT_PUBLIC_PUSHER_CLUSTER` = `eu` (ou ton cluster)
4. **Deploy** — attends 2 minutes
5. Dans le projet déployé, onglet **Storage → Create → KV** → nom `clocktower-kv` → **Create & Connect**.
   Vercel injecte automatiquement les vars `KV_*`.
6. Onglet **Deployments → ⋯ → Redeploy** sur le dernier build pour prendre les vars KV en compte.

### Étape 6 — Installer comme app sur l'iPad
1. Ouvre l'URL Vercel (ex. `https://clocktower-toi.vercel.app`) dans **Safari**
2. Bouton **Partager** → **Sur l'écran d'accueil**
3. L'app s'ajoute, plein écran sans la barre Safari (PWA)

### Étape 7 — Jouer
- Le **Conteur** crée la partie sur son iPad → reçoit un code à 4 lettres
- Les **joueurs** ouvrent l'URL sur leur appareil → "Rejoindre une partie" → entrent le code → entrent leur prénom
- Le 1er joueur (= le créateur) est automatiquement Conteur, marqué d'une 👑
- Quand 5+ joueurs sont là, le Conteur clique **Lancer la partie**
- Les rôles sont distribués aléatoirement, le Conteur voit le Grimoire complet, chaque joueur voit son rôle privé

---

## ✏️ Modifier le code depuis l'iPad

Pour changer du code après coup : sur la page du repo GitHub, presse `.` → github.dev s'ouvre → édite → Commit & Push → Vercel redéploie tout seul en 1-2 min.

---

## ➕ Ajouter un script custom

Édite `data/scripts.ts`, ajoute un nouvel objet sur le modèle de `TROUBLE_BREWING`, puis ajoute-le au registre `SCRIPTS`. Push → ça s'affiche dans la liste des scénarios.

```ts
const MON_SCRIPT: Script = {
  id: "mon-script",
  name: "Mon Scénario",
  author: "Toi",
  description: "Description courte.",
  roles: {
    monrole: { name: "Mon Rôle", team: "townsfolk", ability: "Description." },
    // ...
  },
};

export const SCRIPTS = {
  "trouble-brewing": TROUBLE_BREWING,
  "bad-moon-rising": BAD_MOON_RISING,
  "mon-script": MON_SCRIPT,  // ← ajouter ici
};
```

---

## 💸 Coûts

- **Vercel Hobby** : gratuit (limite généreuse)
- **Vercel KV** : gratuit jusqu'à 30 000 commandes/jour
- **Pusher Channels Sandbox** : gratuit jusqu'à 100 connexions simultanées et 200k messages/jour

Largement suffisant pour des parties privées entre amis.

---

## 🛠 Pour développement local (si un jour tu as un Mac/PC)

```bash
npm install
cp .env.example .env.local   # remplir les valeurs
npm run dev
```
