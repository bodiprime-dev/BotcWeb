# BotcWeb — Guide développeur

Application web Blood on the Clocktower (BotC) — assistant Conteur.
Stack : Next.js 14 App Router · TypeScript · Tailwind CSS · Pusher · Vercel KV.

---

## Architecture générale

```
app/
  page.tsx                  # Accueil : créer ou rejoindre une partie
  simulator/page.tsx        # Mode simulation local (pas de backend)
                            #   → SimulatorPage, PerspectiveBar, SimLobby
  game/[code]/page.tsx      # Page de jeu connectée (Pusher + Vercel KV)
                            #   → GamePage, Lobby
  api/game/
    create/route.ts         # POST → crée une partie (Vercel KV)
    join/route.ts           # POST → ajoute un joueur
    action/route.ts         # POST → applique une action (applyAction) et push via Pusher
    [code]/route.ts         # GET → état actuel de la partie
    state/route.ts          # GET → état (alias)

components/
  StorytellerView.tsx       # Vue Conteur — partagée simulateur + jeu réel
  PlayerView.tsx            # Vue joueur — partagée simulateur + jeu réel
  LobbyRoleSteps.tsx        # Enchaînement d'étapes rôles (roles→drunk→lunatic→bluffs)
  Grimoire.tsx              # Ovale adaptatif des joueurs
  StorytellerDrawer.tsx     # Panneau latéral GM (contrôles joueur, ordre nuit)
  RoleIcon.tsx              # Icône de rôle (GitHub CDN, états loading/ok/failed)
  ScriptReference.tsx       # Modal plein-écran de référence des rôles
  RoleInfoDisplay.tsx       # Affichage des RoleInfoEntry côté joueur
  RoleInfoEditor.tsx        # Éditeur GM des RoleInfoEntry d'un joueur
  RoleChangePanel.tsx       # Panneau GM pour changer le rôle d'un joueur en cours de partie
  RoleRevealModal.tsx       # Modal GM pour révéler/attribuer un rôle

hooks/
  useWindowSize.ts          # { vw, vh } réactif (resize listener)
  useNightOrder.ts          # NightOrderEntry[] triés par ordre, gère drunk/lunatic

lib/
  types.ts      # Types partagés : GameState, Player, GameAction, RoleInfoEntry
  game.ts       # Reducer pur applyAction() + helpers (pickDemonBluffs, buildRoleInfo…)
  store.ts      # Helpers Vercel KV (lecture/écriture de GameState)
  pusher-client.ts / pusher-server.ts

data/
  scripts.ts    # Définitions des rôles et scripts (TROUBLE_BREWING, BAD_MOON_RISING)
                # Aussi : TEAM_COLORS (palette partagée), getScriptList()
```

---

## Règles fondamentales du reducer (`lib/game.ts`)

- `applyAction(state, action)` est **pur** (sans effets de bord).
- Le simulateur et la page de jeu réelle utilisent **le même reducer** — toute logique métier doit être dans `game.ts`, pas dans les pages.
- `buildRoleInfo(roleId, allPlayers, script, demonBluffs, lunaticBluffs)` génère les infos de première nuit selon le rôle. Elle est appelée une seule fois au `START_GAME`.
- Les infos de rôle (`roleInfo: RoleInfoEntry[]`) sont modifiables en cours de partie via `SET_ROLE_INFO` (l'éditeur GM dans le panneau latéral).

---

## Flux de lancement de partie (lobby)

Le lobby suit un enchaînement d'étapes. Les étapes `players` sont gérées localement dans `SimLobby` (simulateur) et `Lobby` (jeu réel). Les étapes de configuration des rôles (`roles` → `START_GAME`) sont gérées par `LobbyRoleSteps` — **partagé entre les deux lobbies**.

```
players → roles → drunk? → lunatic? → lunatic-bluffs? → bluffs? → START_GAME
```

| Étape | Condition d'affichage | Ce qu'elle fait |
|---|---|---|
| `players` | toujours | Ajouter/supprimer/réordonner des joueurs |
| `roles` | si GM clique "Configurer les rôles" | Sélection manuelle des rôles |
| `drunk` | si `drunk` est dans les rôles sélectionnés | Choisir le faux rôle du Drunk |
| `lunatic` | si `lunatic` est dans les rôles | Choisir le démon **absent du jeu** que le Lunatique croit être |
| `lunatic-bluffs` | après `lunatic` | Choisir les 3 bluffs du Lunatique (distincts de ceux du Démon) |
| `bluffs` | si un Démon est dans les rôles | Choisir les 3 bluffs du Démon |

**Points clés :**
- Le Lunatique doit croire être un démon **non sélectionné** dans la partie.
- Le Lunatique a ses **propres** bluffs, distincts de ceux du Démon.
- Si rôles aléatoires (aucune sélection manuelle), toutes ces étapes sont sautées et le reducer auto-génère bluffs/lunatique.
- `LobbyRoleSteps` gère son propre état interne (selectedRoleIds, drunkFakeRoleId, etc.) et appelle `dispatch({ type: "START_GAME", ... })` directement.

---

## Rôles spéciaux — comportements à connaître

### Drunk
- `role = "drunk"`, `displayRole = <faux rôle townsfolk>`.
- Le joueur voit son `displayRole`, jamais `drunk`.
- Au `START_GAME`, ses infos sont générées pour son `displayRole` avec des données rotées (fausses).
- Dans le grimoire GM, on voit le vrai rôle (`drunk`) + le 🍺 badge.

### Lunatic
- `role = "lunatic"`, `displayRole = <id du démon fictif>`.
- Le joueur voit son `displayRole` (il croit être un démon).
- Le Démon fictif doit être un démon du script **absent** de la partie.
- Il reçoit ses propres 3 bluffs (`lunaticBluffRoleIds`), différents de ceux du Démon.
- L'action `START_GAME` accepte `lunaticFakeDemonId` et `lunaticBluffRoleIds`.

### Fortune Teller (Devin)
- **Pas d'info initiale** — le Red Herring est une info GM privée, pas une info joueur.
- Le joueur choisit 2 cibles chaque nuit ; le GM ajoute manuellement le résultat via `RoleInfoEditor` (type `fortune_result`).

### Chef / Empath
- Reçoivent un compteur à `0` au départ ; le GM le met à jour via `SET_ROLE_INFO`.
- Nécessitent de connaître l'ordre des sièges (information hors-système).

---

## Types importants (`lib/types.ts`)

### `RoleInfoEntry`
Union discriminée des informations attachées à un joueur :
- `bluffs` : 3 rôles que le Démon (ou Lunatique) peut prétendre être.
- `two_players_one_role` : Lavandière / Bibliothécaire / Enquêteur (ou résultat Devin si `result` est présent).
- `player_and_role` : Grand-mère.
- `role_list` : Parrain (liste d'Outsiders).
- `count` : Chef / Empath.
- `text` : note libre GM.

### `Player`
- `role` : vrai rôle (stocké côté serveur, jamais envoyé aux autres joueurs).
- `displayRole` : rôle affiché au joueur (= `role` sauf Drunk/Lunatic).
- `roleInfo` : tableau d'entrées RoleInfo visibles par le joueur.

### `START_GAME` action
Champs notables :
- `drunkFakeRoleId` : le faux rôle du Drunk.
- `lunaticFakeDemonId` : le démon fictif du Lunatique (absent du jeu).
- `lunaticBluffRoleIds` : 3 bluffs pour le Lunatique.
- `demonBluffRoleIds` : 3 bluffs pour le Démon.
- `prefillRoleInfo` : si `false`, aucune info n'est générée automatiquement.

---

## Grimoire (ovale)

Extrait dans `components/Grimoire.tsx`. Utilise `useWindowSize` en interne.

Le grimoire est une ellipse : `ry` (vertical) est limité par la hauteur de l'écran, `rx` (horizontal) exploite toute la largeur disponible jusqu'à `2×ry`.

```typescript
// Ellipse adaptive selon la fenêtre
const availW = panelOpen ? Math.max(vw - 360, 200) : vw - 32;
const availH = vh - 200;
const ry = Math.max(90, Math.min(playable.length * 28, availH * 0.42));
const iconBox = Math.max(60, Math.min(96, Math.round(ry * 0.42 + 22)));
const iconSize = Math.round(iconBox * 0.65);
const rx = Math.min(Math.floor((availW - iconBox - 48) / 2), Math.round(ry * 2.0));
const cx = rx + iconBox / 2 + 24;
const cy = ry + iconBox / 2 + 24;
const totalW = Math.round(cx * 2);
const totalH = Math.round(cy * 2);
// Position joueur i : x = cx + rx*cos(angle) - half, y = cy + ry*sin(angle) - half
```

Les anneaux décoratifs sont des `div` `rounded-full` rectangulaires dont les insets horizontaux/verticaux sont proportionnels à `totalW`/`totalH` (`* 0.1` et `* 0.18`).

---

## Icônes de rôle

Les icônes proviennent du projet open-source `bra1n/townsquare` (GitHub CDN).
URL : `https://raw.githubusercontent.com/bra1n/townsquare/main/src/assets/icons/{roleId}.png`

Le composant `RoleIcon` (`components/RoleIcon.tsx`) gère les états `loading` / `ok` / `failed` (fallback silencieux si l'icône n'existe pas).

---

## Simulateur vs Jeu réel

| | Simulateur (`/simulator`) | Jeu réel (`/game/[code]`) |
|---|---|---|
| Persistence | `useState` local | Vercel KV |
| Temps réel | Non | Pusher |
| `dispatch` | appelle `applyAction()` directement (sync) | `POST /api/game/action` (async) |
| Reducer | Identique | Identique |
| UI Conteur | `StorytellerView` (partagé) | `StorytellerView` (partagé) |
| UI Joueur | `PlayerView` (partagé) | `PlayerView` (partagé) |
| Lobby joueurs | `SimLobby` (local) | `Lobby` (local) |
| Lobby rôles | `LobbyRoleSteps` (partagé) | `LobbyRoleSteps` (partagé) |

**Règles :**
- Toute correction de logique métier dans `game.ts` s'applique automatiquement aux deux modes.
- Toute correction UI dans `components/` s'applique automatiquement aux deux modes.
- Les lobbies `SimLobby` et `Lobby` restent séparés car leur UX diffère (contrôles d'édition GM vs lecture seule pour les joueurs non-GM).

---

## Ordre de la nuit (`hooks/useNightOrder.ts`)

Calculé via le hook `useNightOrder(game)` dans `StorytellerDrawer` :
- Pour `drunk` : utilise `displayRole.firstNight/otherNight` (le drunk pense être son faux rôle).
- Pour `lunatic` : utilise `displayRole.firstNight/otherNight` (le lunatic pense être son faux démon).
- Seuls les joueurs **vivants** avec un rôle actif cette nuit apparaissent.
- Implémenté avec une boucle `for...of` impérative (pas de `.filter()` avec type predicate) pour éviter les problèmes TypeScript.

---

## Ajouter un script / des rôles

1. Ajouter les entrées dans `data/scripts.ts` sous la structure `Script`.
2. Si le rôle reçoit des infos en première nuit, ajouter un `case` dans `buildRoleInfo()` (`lib/game.ts`).
3. Si le rôle nécessite une étape de setup spéciale (comme Drunk / Lunatic), ajouter l'étape dans `LobbyRoleSteps` (les deux lobbies bénéficieront automatiquement de la modification).
4. Les scripts sont automatiquement listés via `getScriptList()` dans le sélecteur de l'accueil et du simulateur.

---

## Couleurs d'équipe (`TEAM_COLORS`)

Définies dans `data/scripts.ts`, utilisées partout (grimoire, sidebar nuit, vue joueur, sélecteur de rôles).

**Choix de design** : le `bg` est uniformément sombre (`bg-stone-900`) pour que les rôles soient indiscernables de loin — un voisin ne peut pas deviner l'équipe d'un joueur en regardant son écran. Seul le Conteur voit les nuances via le `ring`.
