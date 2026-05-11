import { nanoid } from "nanoid";
import type { GameState, GameAction, Player, PlayerView, RoleInfoEntry, NominationRecord, ChatMessage } from "./types";
import { SCRIPTS, type Script } from "@/data/scripts";

// Répartition officielle Blood on the Clocktower par nombre de joueurs
export const ROLE_DISTRIBUTION: Record<number, { townsfolk: number; outsiders: number; minions: number; demons: number }> = {
   5: { townsfolk: 3, outsiders: 0, minions: 1, demons: 1 },
   6: { townsfolk: 4, outsiders: 0, minions: 1, demons: 1 },
   7: { townsfolk: 5, outsiders: 0, minions: 1, demons: 1 },
   8: { townsfolk: 5, outsiders: 1, minions: 1, demons: 1 },
   9: { townsfolk: 5, outsiders: 2, minions: 1, demons: 1 },
  10: { townsfolk: 7, outsiders: 0, minions: 2, demons: 1 },
  11: { townsfolk: 7, outsiders: 1, minions: 2, demons: 1 },
  12: { townsfolk: 7, outsiders: 2, minions: 2, demons: 1 },
  13: { townsfolk: 9, outsiders: 0, minions: 3, demons: 1 },
  14: { townsfolk: 9, outsiders: 1, minions: 3, demons: 1 },
  15: { townsfolk: 9, outsiders: 2, minions: 3, demons: 1 },
};

// Quotas attendus par équipe pour `playerCount` joueurs, en tenant compte
// des setup-modifiers présents dans `selectedRoleIds` (Baron : +2 Outsiders / -2 Townsfolk).
// Au-delà de 15, les surnuméraires sont des Voyageurs.
export function getRoleQuotas(playerCount: number, selectedRoleIds: string[]): {
  townsfolk: number; outsiders: number; minions: number; demons: number; travelers: number;
} {
  const standardCount = Math.min(playerCount, 15);
  const travelers = Math.max(0, playerCount - 15);
  const base = ROLE_DISTRIBUTION[standardCount] ?? ROLE_DISTRIBUTION[15];
  let outsiders = base.outsiders;
  let townsfolk = base.townsfolk;
  if (selectedRoleIds.includes("baron")) {
    const shift = Math.min(2, townsfolk);
    outsiders += shift;
    townsfolk -= shift;
  }
  return { townsfolk, outsiders, minions: base.minions, demons: base.demons, travelers };
}

export function createNewGame(scriptId: string): GameState {
  const code = generateCode();
  return {
    code,
    scriptId,
    phase: "lobby",
    day: 0,
    players: [],
    storytellerId: null,
    createdAt: Date.now(),
    startedAt: null,
    selectedRoleIds: [],
    nominee: null,
    nominator: null,
    votes: {},
    nominationsToday: [],
    nightDone: [],
    chat: [],
    winner: null,
    winReason: null,
    secrets: {},
    chatEnabled: false,
  };
}

// Seuil pour qu'une nomination passe : majorité (≥ ceil(N/2)) des joueurs vivants.
export function executionThreshold(state: GameState): number {
  const living = state.players.filter(p => !p.isStoryteller && p.alive).length;
  return Math.ceil(living / 2);
}

// Détection de victoire — appelée après chaque mort / fin de jour.
// Renvoie null si la partie continue.
// Règles :
// - Mauvais : ≤ 2 joueurs vivants (le Démon ne peut plus perdre par exécution)
// - Mauvais : un Saint a été exécuté
// - Bons   : aucun Démon vivant (et pas de Scarlet Woman pour reprendre)
// - Bons   : le Maire est vivant à 3 joueurs et aucune exécution n'a eu lieu ce jour
export function checkVictory(
  state: GameState,
  ctx?: { saintExecuted?: boolean; dayJustEnded?: boolean }
): { winner: "good" | "evil"; reason: string } | null {
  if (state.winner !== null) return null;
  if (state.phase === "lobby") return null;

  const script = SCRIPTS[state.scriptId];
  if (!script) return null;

  if (ctx?.saintExecuted) {
    return { winner: "evil", reason: "Un Saint a été exécuté." };
  }

  // Les Voyageurs ne comptent ni dans le décompte minimum ni pour la victoire des Bons.
  const playable = state.players.filter(p =>
    !p.isStoryteller && (!p.role || script.roles[p.role]?.team !== "traveler")
  );
  const living = playable.filter(p => p.alive);

  if (living.length <= 2) {
    return { winner: "evil", reason: "Il ne reste plus que 2 joueurs vivants ou moins." };
  }

  // Aucun Démon vivant (et pas de Scarlet Woman pour devenir Démon)
  const livingDemon = living.some(p => p.role && script.roles[p.role]?.team === "demon");
  if (!livingDemon) {
    const livingSW = living.some(p => p.role === "scarletwoman");
    if (!livingSW) {
      return { winner: "good", reason: "Le Démon est mort." };
    }
  }

  // Mayor : 3 joueurs vivants à la fin du jour, sans exécution aujourd'hui
  if (ctx?.dayJustEnded) {
    const mayorAlive = living.some(p => p.role === "mayor");
    const noExecutionToday = !state.nominationsToday.some(n => n.executed);
    if (mayorAlive && living.length === 3 && noExecutionToday) {
      return { winner: "good", reason: "Le Maire l'emporte (3 vivants, pas d'exécution)." };
    }
  }

  return null;
}

function withVictoryCheck(
  state: GameState,
  ctx?: { saintExecuted?: boolean; dayJustEnded?: boolean }
): GameState {
  const v = checkVictory(state, ctx);
  if (!v) return state;
  return { ...state, winner: v.winner, winReason: v.reason };
}

// Si le Démon meurt à 5 vivants ou + ET qu'une Scarlet Woman est en vie,
// elle prend la place du Démon (rôle, displayRole) et reçoit une note privée.
function withScarletPromotion(state: GameState): GameState {
  if (state.winner) return state;
  if (state.phase === "lobby") return state;
  const script = SCRIPTS[state.scriptId];
  if (!script) return state;
  const playable = state.players.filter(p => !p.isStoryteller);
  const living = playable.filter(p => p.alive);
  if (living.length < 5) return state;
  const livingDemonExists = living.some(p => p.role && script.roles[p.role]?.team === "demon");
  if (livingDemonExists) return state;
  const sw = living.find(p => p.role === "scarletwoman");
  if (!sw) return state;
  const deadDemon = playable.find(p => !p.alive && p.role && script.roles[p.role]?.team === "demon");
  if (!deadDemon || !deadDemon.role) return state;
  const newRole = deadDemon.role;
  return {
    ...state,
    players: state.players.map(p =>
      p.id === sw.id
        ? {
            ...p,
            role: newRole,
            displayRole: newRole,
            roleInfo: [
              ...p.roleInfo,
              { kind: "text", content: `Le Démon est mort. Tu es maintenant ${script.roles[newRole]?.name ?? newRole}.` },
            ],
          }
        : p
    ),
  };
}

function afterDeath(state: GameState, ctx?: { saintExecuted?: boolean }): GameState {
  return withVictoryCheck(withScarletPromotion(state), ctx);
}

export function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

// ─── Helpers RoleInfo ──────────────────────────────────────────────────────

function pickDemonBluffs(
  script: Script,
  assignedRoles: string[],
  provided?: [string, string, string] | null
): [string, string, string] | null {
  if (provided && provided.length === 3) return provided;
  const inPlay = new Set(assignedRoles);
  const candidates = Object.entries(script.roles)
    .filter(([id, r]) => r.team === "townsfolk" && !inPlay.has(id))
    .map(([id]) => id)
    .sort(() => Math.random() - 0.5);
  if (candidates.length < 3) return null;
  return [candidates[0], candidates[1], candidates[2]];
}

// Picks 3 bluff roles for the Lunatic — different from the demon's bluffs
function pickLunaticBluffs(
  script: Script,
  assignedRoles: string[],
  demonBluffs: [string, string, string] | null,
  provided?: [string, string, string] | null
): [string, string, string] | null {
  if (provided && provided.length === 3) return provided;
  const excluded = new Set([...assignedRoles, ...(demonBluffs ?? [])]);
  const candidates = Object.entries(script.roles)
    .filter(([id, r]) => r.team === "townsfolk" && !excluded.has(id))
    .map(([id]) => id)
    .sort(() => Math.random() - 0.5);
  if (candidates.length >= 3) return [candidates[0], candidates[1], candidates[2]];
  // Fallback: relax constraint (allow overlap with demonBluffs)
  const inPlay = new Set(assignedRoles);
  const fallback = Object.entries(script.roles)
    .filter(([id, r]) => r.team === "townsfolk" && !inPlay.has(id))
    .map(([id]) => id)
    .sort(() => Math.random() - 0.5);
  if (fallback.length < 3) return null;
  return [fallback[0], fallback[1], fallback[2]];
}

function buildRoleInfo(
  roleId: string,
  selfId: string,
  allPlayers: Player[],
  script: Script,
  demonBluffs: [string, string, string] | null,
  lunaticBluffs: [string, string, string] | null
): RoleInfoEntry[] {
  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  const nonSt = allPlayers.filter(p => !p.isStoryteller && p.role);
  const team = script.roles[roleId]?.team;

  // ─── Démons : bluffs + identités des Sbires + Lunatique ─────────────────
  // Tous les Démons (TB, BMR, futurs scripts) suivent la même logique :
  // ils apprennent leurs Sbires et reçoivent 3 bluffs.
  if (team === "demon") {
    const entries: RoleInfoEntry[] = [];
    if (demonBluffs) entries.push({ kind: "bluffs", roleIds: demonBluffs });
    const minions = nonSt
      .filter(p => script.roles[p.role!]?.team === "minion")
      .map(p => ({ playerId: p.id, roleId: p.role! }));
    if (minions.length > 0) {
      entries.push({ kind: "evil_team", label: "Tes Sbires", teammates: minions });
    }
    const lunaticPlayer = nonSt.find(p => p.role === "lunatic");
    if (lunaticPlayer) {
      entries.push({ kind: "player_and_role", playerId: lunaticPlayer.id, roleId: "lunatic" });
    }
    return entries;
  }

  // ─── Sbires : voient le Démon et leurs collègues Sbires ─────────────────
  // Certains Sbires (ex: Parrain) ont en plus une info propre à leur rôle :
  // on chaîne les deux ensembles d'entrées.
  if (team === "minion") {
    const entries: RoleInfoEntry[] = [];
    const teammates = nonSt
      .filter(p =>
        p.id !== selfId &&
        (script.roles[p.role!]?.team === "demon" || script.roles[p.role!]?.team === "minion")
      )
      .map(p => ({ playerId: p.id, roleId: p.role! }));
    if (teammates.length > 0) {
      entries.push({ kind: "evil_team", label: "Ton équipe maléfique", teammates });
    }
    if (roleId === "godfather") {
      const outsiderIds = nonSt
        .filter(p => script.roles[p.role!]?.team === "outsider")
        .map(p => p.role!);
      entries.push({ kind: "role_list", roleIds: outsiderIds });
    }
    return entries;
  }

  switch (roleId) {

    // ─── Lavandière : 1 joueur townsfolk parmi 2 ────────────────────
    case "washerwoman": {
      const trueOnes = shuffle(nonSt.filter(p => script.roles[p.role!]?.team === "townsfolk"));
      if (trueOnes.length < 1) return [];
      const truePlayer = trueOnes[0];
      const decoys = shuffle(nonSt.filter(p => p.id !== truePlayer.id));
      if (decoys.length < 1) return [];
      const [a, b] = shuffle([truePlayer, decoys[0]]);
      return [{ kind: "two_players_one_role", playerAId: a.id, playerBId: b.id, roleId: truePlayer.role! }];
    }

    // ─── Bibliothécaire : 1 joueur outsider parmi 2 (ou aucun) ─────
    case "librarian": {
      const trueOnes = shuffle(nonSt.filter(p => script.roles[p.role!]?.team === "outsider"));
      if (trueOnes.length === 0) return [{ kind: "text", content: "Aucun Outsider n'est en jeu." }];
      const truePlayer = trueOnes[0];
      const decoys = shuffle(nonSt.filter(p => p.id !== truePlayer.id));
      if (decoys.length < 1) return [];
      const [a, b] = shuffle([truePlayer, decoys[0]]);
      return [{ kind: "two_players_one_role", playerAId: a.id, playerBId: b.id, roleId: truePlayer.role! }];
    }

    // ─── Enquêteur : 1 joueur minion parmi 2 ────────────────────────
    case "investigator": {
      const trueOnes = shuffle(nonSt.filter(p => script.roles[p.role!]?.team === "minion"));
      if (trueOnes.length < 1) return [];
      const truePlayer = trueOnes[0];
      const decoys = shuffle(nonSt.filter(p => p.id !== truePlayer.id));
      if (decoys.length < 1) return [];
      const [a, b] = shuffle([truePlayer, decoys[0]]);
      return [{ kind: "two_players_one_role", playerAId: a.id, playerBId: b.id, roleId: truePlayer.role! }];
    }

    // ─── Chef / Empath : nécessite l'ordre des sièges → GM remplit ──
    case "chef":
      return [{ kind: "count", label: "Paires maléfiques voisines", value: 0 }];

    case "empath":
      return [{ kind: "count", label: "Voisins maléfiques", value: 0 }];

    // ─── Grand-mère : 1 joueur bon + son rôle ───────────────────────
    case "grandmother": {
      const goodOnes = shuffle(nonSt.filter(p =>
        script.roles[p.role!]?.team === "townsfolk" ||
        script.roles[p.role!]?.team === "outsider"
      ));
      if (goodOnes.length < 1) return [];
      const chosen = goodOnes[0];
      return [{ kind: "player_and_role", playerId: chosen.id, roleId: chosen.role! }];
    }

    // ─── Lunatique : reçoit ses propres bluffs (différents du démon) ──
    case "lunatic": {
      if (!lunaticBluffs) return [];
      return [{ kind: "bluffs", roleIds: lunaticBluffs }];
    }

    // ─── Devin : pas d'info initiale, c'est au joueur de choisir 2 cibles chaque nuit ──
    case "fortuneteller": {
      return [];
    }

    default:
      return [];
  }
}

// ─── Reducer ───────────────────────────────────────────────────────────────

export function applyAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "ADD_PLAYER": {
      const trimmed = action.name.trim();
      if (!trimmed) return state;
      if (state.players.some(p => p.name === trimmed)) return state;
      if (state.phase !== "lobby") return state;
      const player: Player = {
        id: nanoid(8),
        name: trimmed,
        role: null,
        displayRole: null,
        alive: true,
        isStoryteller: false,
        poisoned: false,
        ghostVoteUsed: false,
        roleInfo: [],
        reminders: [],
        slayerUsed: false,
      };
      const secret = nanoid(24);
      return {
        ...state,
        players: [...state.players, player],
        secrets: { ...state.secrets, [player.id]: secret },
      };
    }

    case "REMOVE_PLAYER": {
      if (state.phase !== "lobby") return state;
      return { ...state, players: state.players.filter(p => p.id !== action.playerId) };
    }

    case "REORDER_PLAYERS": {
      if (state.phase !== "lobby") return state;
      const idx = state.players.findIndex(p => p.id === action.playerId);
      if (idx <= 0) return state; // GM (index 0) cannot be moved, and player not found
      const swapIdx = action.direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx <= 0 || swapIdx >= state.players.length) return state; // can't swap with GM or out of bounds
      const players = [...state.players];
      [players[idx], players[swapIdx]] = [players[swapIdx], players[idx]];
      return { ...state, players };
    }

    case "START_GAME": {
      if (state.phase !== "lobby") return state;
      if (state.players.length < 5) return state;
      const script = SCRIPTS[state.scriptId];
      if (!script) return state;

      const playablePlayers = state.players.filter(p => p.id !== action.storytellerId);
      const playerCount = playablePlayers.length;

      const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

      let assignedRoles: string[];

      if (action.selectedRoleIds.length >= playerCount) {
        assignedRoles = shuffle(action.selectedRoleIds).slice(0, playerCount);
      } else {
        // Au-delà de 15 joueurs, les surnuméraires sont des Voyageurs.
        // On garde la distribution standard pour les 15 premiers.
        const standardCount = Math.min(playerCount, 15);
        const travelerCount = Math.max(0, playerCount - 15);
        const baseDist = ROLE_DISTRIBUTION[standardCount] ?? ROLE_DISTRIBUTION[15];
        const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [], traveler: [] };
        for (const [id, role] of Object.entries(script.roles)) {
          byTeam[role.team]?.push(id);
        }
        // Si le GM a pré-choisi des bluffs du Démon en mode aléatoire, on les
        // retire du pool de Townsfolk tirables : un bluff doit être un rôle
        // absent du jeu.
        const reservedBluffs = new Set(action.demonBluffRoleIds ?? []);
        if (reservedBluffs.size > 0) {
          byTeam.townsfolk = byTeam.townsfolk.filter(id => !reservedBluffs.has(id));
        }
        // Au-delà de 15 sans Voyageur dans le script, on refuse le démarrage.
        if (travelerCount > 0 && byTeam.traveler.length === 0) return state;
        // 1) On tire d'abord les minions et démon, puis on regarde si un setup-modifier
        //    impose un ajustement (Baron : +2 Outsiders / -2 Townsfolk).
        const minions = shuffle(byTeam.minion).slice(0, baseDist.minions);
        const demons = shuffle(byTeam.demon).slice(0, baseDist.demons);
        let outsiderCount = baseDist.outsiders;
        let townsfolkCount = baseDist.townsfolk;
        if (minions.includes("baron")) {
          const shift = Math.min(2, townsfolkCount, byTeam.outsider.length - outsiderCount);
          outsiderCount += shift;
          townsfolkCount -= shift;
        }
        const outsiders = shuffle(byTeam.outsider).slice(0, outsiderCount);
        const townsfolk = shuffle(byTeam.townsfolk).slice(0, townsfolkCount);
        // Voyageurs : tirage avec remise si la liste est plus courte que travelerCount
        const travelers: string[] = [];
        for (let i = 0; i < travelerCount; i++) {
          const pool = byTeam.traveler;
          travelers.push(pool[Math.floor(Math.random() * pool.length)]);
        }
        assignedRoles = shuffle([...townsfolk, ...outsiders, ...minions, ...demons, ...travelers]);
      }

      // Passe 1 : assigner les rôles (sans roleInfo encore)
      let roleIdx = 0;
      const playersWithRoles: Player[] = state.players.map((p) => {
        if (p.id === action.storytellerId) {
          return { ...p, role: null, displayRole: null, isStoryteller: true, roleInfo: [] };
        }
        const realRole = assignedRoles[roleIdx++];
        const isDrunk = realRole === "drunk";
        const isLunatic = realRole === "lunatic";
        return {
          ...p,
          role: realRole,
          displayRole: isDrunk && action.drunkFakeRoleId
            ? action.drunkFakeRoleId
            : isLunatic && action.lunaticFakeDemonId
            ? action.lunaticFakeDemonId
            : realRole,
          isStoryteller: false,
          roleInfo: [],
        };
      });

      // Passe 2 : calculer les infos de rôle (nécessite de connaître tous les rôles assignés)
      // Les bluffs Démon, l'équipe maléfique (Démon + Sbires) et les bluffs du Lunatique
      // sont TOUJOURS générés — ce sont les infos minimales nécessaires pour jouer.
      // Les autres infos de rôle (Lavandière, Grand-mère, etc.) ne sont générées que si
      // prefillRoleInfo !== false.
      const demonBluffs = pickDemonBluffs(script, assignedRoles, action.demonBluffRoleIds);
      const lunaticBluffs = pickLunaticBluffs(script, assignedRoles, demonBluffs, action.lunaticBluffRoleIds);
      const players = playersWithRoles.map((p) => {
        if (p.isStoryteller || !p.role) return p;
        const pTeam = script.roles[p.role]?.team;
        // Infos toujours générées : Démon, Sbires, Lunatique
        const isAlwaysInfoRole = pTeam === "demon" || pTeam === "minion" || p.role === "lunatic";
        if (!isAlwaysInfoRole && action.prefillRoleInfo === false) return p;
        if (p.role === "drunk" && p.displayRole) {
          // Drunk gets false info: generate for their fake role but with rotated player assignments
          const nonSt = playersWithRoles.filter(q => !q.isStoryteller && q.role);
          const roles = nonSt.map(q => q.role!);
          const rotated = [roles[roles.length - 1], ...roles.slice(0, -1)];
          const falsePlayers = nonSt.map((q, i) => ({ ...q, role: rotated[i], displayRole: rotated[i] }));
          const infoPlayers = playersWithRoles.map(q => falsePlayers.find(f => f.id === q.id) ?? q);
          return { ...p, roleInfo: buildRoleInfo(p.displayRole, p.id, infoPlayers, script, demonBluffs, lunaticBluffs) };
        }
        return { ...p, roleInfo: buildRoleInfo(p.role, p.id, playersWithRoles, script, demonBluffs, lunaticBluffs) };
      });

      return {
        ...state,
        players,
        phase: "day",
        day: 1,
        startedAt: Date.now(),
        storytellerId: action.storytellerId,
        selectedRoleIds: assignedRoles,
      };
    }

    case "TOGGLE_ALIVE": {
      if (action.storytellerId !== state.storytellerId) return state;
      const target = state.players.find(p => p.id === action.playerId);
      const wasAlive = !!target?.alive;
      const players = state.players.map(p =>
        p.id === action.playerId
          ? { ...p, alive: !p.alive, poisoned: p.alive ? false : p.poisoned }
          : p
      );
      const closeOpenVote =
        state.nominee === action.playerId || state.nominator === action.playerId;
      const next: GameState = {
        ...state,
        players,
        nominee: closeOpenVote ? null : state.nominee,
        nominator: closeOpenVote ? null : state.nominator,
        votes: closeOpenVote ? {} : state.votes,
      };
      return wasAlive ? afterDeath(next) : next;
    }

    case "TOGGLE_POISON": {
      if (action.storytellerId !== state.storytellerId) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId ? { ...p, poisoned: !p.poisoned } : p
        ),
      };
    }

    case "SET_NOMINEE": {
      if (action.storytellerId !== state.storytellerId) return state;
      return { ...state, nominee: action.playerId, nominator: null, votes: {} };
    }

    case "TOGGLE_PHASE": {
      if (action.storytellerId !== state.storytellerId) return state;
      if (state.phase === "day") {
        // jour → nuit : on vérifie d'abord la victoire du Maire AVANT de purger l'historique
        const checked = withVictoryCheck(state, { dayJustEnded: true });
        return {
          ...checked,
          phase: "night",
          nominee: null,
          nominator: null,
          votes: {},
          nominationsToday: [],
          nightDone: [],
        };
      }
      if (state.phase === "night") {
        // Aube : applique les morts marquées "to-die" (sauf si "protected"),
        // puis nettoie les reminders éphémères.
        let next: GameState = state;
        for (const p of state.players) {
          const hasToDie = p.reminders.includes("to-die");
          if (!hasToDie) continue;
          const isProtected = p.reminders.includes("protected");
          if (!isProtected && p.alive) {
            next = applyAction(next, {
              type: "TOGGLE_ALIVE",
              storytellerId: state.storytellerId!,
              playerId: p.id,
            });
          }
        }
        // Retire les reminders éphémères de la nuit qui vient de finir.
        const ephemeral = new Set(["to-die", "protected"]);
        next = {
          ...next,
          players: next.players.map(pl => ({
            ...pl,
            reminders: pl.reminders.filter(t => !ephemeral.has(t)),
          })),
        };
        return { ...next, phase: "day", day: next.day + 1, nightDone: [] };
      }
      return state;
    }

    case "NOMINATE": {
      if (state.phase !== "day") return state;
      if (state.winner !== null) return state;
      if (state.nominee !== null) return state; // une nomination en cours bloque
      const nominator = state.players.find(p => p.id === action.nominatorId);
      const nominee = state.players.find(p => p.id === action.nomineeId);
      if (!nominator || !nominee || !nominator.alive || !nominee.alive) return state;
      if (nominator.isStoryteller || nominee.isStoryteller) return state;
      // Une seule nomination par jour, par accusateur ET par accusé
      const alreadyNominator = state.nominationsToday.some(n => n.nominatorId === nominator.id);
      const alreadyNominee = state.nominationsToday.some(n => n.nomineeId === nominee.id);
      if (alreadyNominator || alreadyNominee) return state;
      return { ...state, nominee: action.nomineeId, nominator: action.nominatorId, votes: {} };
    }

    case "CLEAR_NOMINATION": {
      if (action.storytellerId !== state.storytellerId) return state;
      return { ...state, nominee: null, nominator: null, votes: {} };
    }

    case "VOTE": {
      if (state.phase !== "day") return state;
      if (state.winner !== null) return state;
      if (state.nominee === null) return state;
      const voter = state.players.find(p => p.id === action.voterId);
      if (!voter || voter.isStoryteller) return state;
      // Mort sans jeton fantôme : refusé. Mort avec jeton : autorisé (consommé à la résolution).
      if (!voter.alive && voter.ghostVoteUsed) return state;
      return { ...state, votes: { ...state.votes, [voter.id]: action.value } };
    }

    case "RESOLVE_NOMINATION": {
      if (action.storytellerId !== state.storytellerId) return state;
      if (state.nominee === null) return state;
      const yesVoterIds = Object.entries(state.votes)
        .filter(([, v]) => v === true)
        .map(([id]) => id);
      const record: NominationRecord = {
        nominatorId: state.nominator ?? "",
        nomineeId: state.nominee,
        yesVoterIds,
        yesCount: yesVoterIds.length,
        executed: action.execute,
        at: Date.now(),
      };
      const executedPlayer = action.execute
        ? state.players.find(p => p.id === state.nominee)
        : null;
      // Brûle le jeton fantôme de chaque mort qui a voté (oui ou non)
      const ghostBurners = new Set(
        state.players
          .filter(p => !p.alive && state.votes[p.id] !== undefined)
          .map(p => p.id)
      );
      const players = state.players.map(p => {
        const burned = ghostBurners.has(p.id) ? { ghostVoteUsed: true } : {};
        if (action.execute && p.id === state.nominee) {
          return { ...p, ...burned, alive: false, poisoned: false };
        }
        return ghostBurners.has(p.id) ? { ...p, ...burned } : p;
      });
      const next: GameState = {
        ...state,
        players,
        nominee: null,
        nominator: null,
        votes: {},
        nominationsToday: [...state.nominationsToday, record],
      };
      const saintExecuted = action.execute && executedPlayer?.role === "saint";
      return action.execute ? afterDeath(next, { saintExecuted }) : next;
    }

    case "SET_ROLE_INFO": {
      if (action.storytellerId !== state.storytellerId) return state;
      if (state.phase === "lobby") return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId ? { ...p, roleInfo: action.roleInfo } : p
        ),
      };
    }

    case "SET_PLAYER_ROLE": {
      if (action.storytellerId !== state.storytellerId) return state;
      if (state.phase === "lobby") return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, role: action.roleId, displayRole: action.roleId, roleInfo: [] }
            : p
        ),
      };
    }

    case "ADD_REMINDER": {
      if (action.storytellerId !== state.storytellerId) return state;
      const token = action.token.trim();
      if (!token) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, reminders: [...p.reminders, token] }
            : p
        ),
      };
    }

    case "REMOVE_REMINDER": {
      if (action.storytellerId !== state.storytellerId) return state;
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, reminders: p.reminders.filter((_, i) => i !== action.index) }
            : p
        ),
      };
    }

    case "TOGGLE_NIGHT_DONE": {
      if (action.storytellerId !== state.storytellerId) return state;
      const set = new Set(state.nightDone);
      if (set.has(action.playerId)) set.delete(action.playerId);
      else set.add(action.playerId);
      return { ...state, nightDone: Array.from(set) };
    }

    case "EXILE_TRAVELER": {
      if (action.storytellerId !== state.storytellerId) return state;
      const target = state.players.find(p => p.id === action.playerId);
      if (!target || target.isStoryteller) return state;
      const script = SCRIPTS[state.scriptId];
      if (!script || !target.role || script.roles[target.role]?.team !== "traveler") return state;
      // L'exil tue le voyageur sans déclencher de fin de partie ni d'enregistrement de nomination.
      const players = state.players.map(p =>
        p.id === target.id ? { ...p, alive: false, poisoned: false } : p
      );
      return { ...state, players };
    }

    case "SEND_CHAT": {
      // Chat verrouillé tant que le GM ne l'a pas activé.
      if (!state.chatEnabled) return state;
      const sender = state.players.find(p => p.id === action.fromId);
      if (!sender) return state;
      const text = action.text.trim().slice(0, 500);
      if (!text) return state;
      // Le destinataire doit exister (sauf "all")
      if (action.toId !== "all" && !state.players.some(p => p.id === action.toId)) return state;
      const msg: ChatMessage = {
        id: nanoid(8),
        fromId: action.fromId,
        toId: action.toId,
        text,
        at: Date.now(),
      };
      // Cap à 200 messages pour éviter la croissance infinie
      const chat = [...state.chat, msg].slice(-200);
      return { ...state, chat };
    }

    case "SET_CHAT_ENABLED": {
      // En lobby : le GM est state.players[0] (storytellerId pas encore défini).
      // Une fois la partie lancée : c'est state.storytellerId qui fait foi.
      const gmId = state.storytellerId ?? state.players[0]?.id ?? null;
      if (gmId === null || action.storytellerId !== gmId) return state;
      return { ...state, chatEnabled: action.enabled };
    }

    case "SLAYER_SHOOT": {
      if (state.phase !== "day") return state;
      if (state.winner !== null) return state;
      const shooter = state.players.find(p => p.id === action.shooterId);
      const target = state.players.find(p => p.id === action.targetId);
      if (!shooter || !target) return state;
      if (shooter.isStoryteller || target.isStoryteller) return state;
      if (!shooter.alive) return state;
      if (shooter.slayerUsed) return state;
      // Le joueur DOIT se croire Slayer (displayRole) ; la vraie résolution dépend du vrai rôle.
      if (shooter.displayRole !== "slayer") return state;
      const script = SCRIPTS[state.scriptId];
      // Effet réel : seul un Slayer non empoisonné fait mourir un Démon.
      const reallyKills =
        shooter.role === "slayer" &&
        !shooter.poisoned &&
        target.role !== null &&
        script?.roles[target.role]?.team === "demon";
      const players = state.players.map(p => {
        if (p.id === shooter.id) return { ...p, slayerUsed: true };
        if (reallyKills && p.id === target.id) return { ...p, alive: false, poisoned: false };
        return p;
      });
      const next: GameState = { ...state, players };
      return reallyKills ? afterDeath(next) : next;
    }

    default:
      return state;
  }
}

// Vue restreinte côté joueur :
// - le joueur voit son displayRole (rôle fictif si Drunk)
// - les autres joueurs apparaissent SANS rôle ni roleInfo (sauf pour le GM qui voit tout)
export function getPlayerView(state: GameState, playerId: string): PlayerView | null {
  const me = state.players.find(p => p.id === playerId);
  if (!me) return null;

  const others = state.players
    .filter(p => p.id !== playerId)
    .map(p => ({
      ...p,
      role: me.isStoryteller ? p.role : null,
      roleInfo: me.isStoryteller ? p.roleInfo : [] as [],
    })) as PlayerView["others"];

  return {
    code: state.code,
    scriptId: state.scriptId,
    phase: state.phase,
    day: state.day,
    me,
    others,
    storytellerId: state.storytellerId,
    nominee: state.nominee,
  };
}

// Redaction côté serveur du GameState avant broadcast / réponse API.
// Garde le SHAPE de GameState pour ne pas casser le client, mais efface
// les champs sensibles selon le destinataire :
// - GM : voit tout
// - Joueur : voit son propre rôle, les autres ont role/displayRole/roleInfo nullifiés,
//   et selectedRoleIds (la liste des rôles en jeu) est masquée
// - Anonyme (avant join) : tous les rôles masqués
export function redactStateFor(state: GameState, recipientId: string | null): GameState {
  const recipient = recipientId ? state.players.find(p => p.id === recipientId) : null;
  if (recipient?.isStoryteller) {
    // Le GM voit tout sauf les secrets serveur.
    return { ...state, secrets: {} };
  }

  // Filtre le chat : public + messages dont je suis émetteur ou destinataire.
  const chat = state.chat.filter(m =>
    m.toId === "all" ||
    (recipient && (m.fromId === recipient.id || m.toId === recipient.id))
  );

  return {
    ...state,
    players: state.players.map(p => {
      if (recipient && p.id === recipient.id) {
        // Le joueur lui-même : voit son rôle et son roleInfo.
        // Mais il ne sait pas s'il est empoisonné ni quels reminders sont sur lui (info GM-only).
        return { ...p, poisoned: false, reminders: [] };
      }
      // Autres joueurs : aucune info privée
      return {
        ...p,
        role: null,
        displayRole: null,
        roleInfo: [],
        poisoned: false,
        reminders: [],
      };
    }),
    selectedRoleIds: [],
    chat,
    secrets: {},
  };
}
