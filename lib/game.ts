import { nanoid } from "nanoid";
import type { GameState, GameAction, Player, PlayerView, RoleInfoEntry } from "./types";
import { SCRIPTS, type Script } from "@/data/scripts";

// Répartition officielle Blood on the Clocktower par nombre de joueurs
const ROLE_DISTRIBUTION: Record<number, { townsfolk: number; outsiders: number; minions: number; demons: number }> = {
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
    votes: {},
  };
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

function buildRoleInfo(
  roleId: string,
  allPlayers: Player[],
  script: Script,
  demonBluffs: [string, string, string] | null
): RoleInfoEntry[] {
  const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

  const nonSt = allPlayers.filter(p => !p.isStoryteller && p.role);

  switch (roleId) {
    // ─── Démons : reçoivent les bluffs ──────────────────────────────
    case "imp":
    case "pukka":
    case "zombuul":
    case "shabaloth":
    case "po": {
      if (!demonBluffs) return [];
      return [{ kind: "bluffs", roleIds: demonBluffs }];
    }

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

    // ─── Parrain : outsiders en jeu ──────────────────────────────────
    case "godfather": {
      const outsiderIds = nonSt
        .filter(p => script.roles[p.role!]?.team === "outsider")
        .map(p => p.role!);
      return [{ kind: "role_list", roleIds: outsiderIds }];
    }

    // ─── Lunatique : reçoit les mêmes bluffs que le démon ───────────
    case "lunatic": {
      if (!demonBluffs) return [];
      return [{ kind: "bluffs", roleIds: demonBluffs }];
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
        roleInfo: [],
      };
      return { ...state, players: [...state.players, player] };
    }

    case "REMOVE_PLAYER": {
      if (state.phase !== "lobby") return state;
      return { ...state, players: state.players.filter(p => p.id !== action.playerId) };
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
        const dist = ROLE_DISTRIBUTION[playerCount] ?? ROLE_DISTRIBUTION[15];
        const byTeam: Record<string, string[]> = { townsfolk: [], outsider: [], minion: [], demon: [] };
        for (const [id, role] of Object.entries(script.roles)) {
          byTeam[role.team]?.push(id);
        }
        assignedRoles = shuffle([
          ...shuffle(byTeam.townsfolk).slice(0, dist.townsfolk),
          ...shuffle(byTeam.outsider).slice(0, dist.outsiders),
          ...shuffle(byTeam.minion).slice(0, dist.minions),
          ...shuffle(byTeam.demon).slice(0, dist.demons),
        ]);
      }

      // Passe 1 : assigner les rôles (sans roleInfo encore)
      let roleIdx = 0;
      const playersWithRoles: Player[] = state.players.map((p) => {
        if (p.id === action.storytellerId) {
          return { ...p, role: null, displayRole: null, isStoryteller: true, roleInfo: [] };
        }
        const realRole = assignedRoles[roleIdx++];
        const isDrunk = realRole === "drunk";
        return {
          ...p,
          role: realRole,
          displayRole: isDrunk && action.drunkFakeRoleId ? action.drunkFakeRoleId : realRole,
          isStoryteller: false,
          roleInfo: [],
        };
      });

      // Passe 2 : calculer les infos de rôle (nécessite de connaître tous les rôles assignés)
      const demonBluffs = pickDemonBluffs(script, assignedRoles, action.demonBluffRoleIds);
      const players = playersWithRoles.map((p) => {
        if (p.isStoryteller || !p.role) return p;
        return { ...p, roleInfo: buildRoleInfo(p.role, playersWithRoles, script, demonBluffs) };
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
      return {
        ...state,
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, alive: !p.alive, poisoned: p.alive ? false : p.poisoned }
            : p
        ),
        nominee: state.nominee === action.playerId ? null : state.nominee,
      };
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
      return { ...state, nominee: action.playerId, votes: {} };
    }

    case "TOGGLE_PHASE": {
      if (action.storytellerId !== state.storytellerId) return state;
      if (state.phase === "day") return { ...state, phase: "night", nominee: null, votes: {} };
      if (state.phase === "night") return { ...state, phase: "day", day: state.day + 1 };
      return state;
    }

    case "NOMINATE": {
      if (state.phase !== "day") return state;
      const nominator = state.players.find(p => p.id === action.nominatorId);
      const nominee = state.players.find(p => p.id === action.nomineeId);
      if (!nominator || !nominee || !nominator.alive || !nominee.alive) return state;
      if (nominator.isStoryteller) return state;
      return { ...state, nominee: action.nomineeId, votes: {} };
    }

    case "CLEAR_NOMINATION": {
      if (action.storytellerId !== state.storytellerId) return state;
      return { ...state, nominee: null, votes: {} };
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
