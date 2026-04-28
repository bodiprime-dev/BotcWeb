import { nanoid } from "nanoid";
import type { GameState, GameAction, Player, PlayerView } from "./types";
import { SCRIPTS } from "@/data/scripts";

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

      // Le GM ne joue pas — on assigne des rôles uniquement aux non-storyteller
      const playablePlayers = state.players.filter(p => p.id !== action.storytellerId);
      const playerCount = playablePlayers.length;

      const shuffle = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

      let assignedRoles: string[];

      if (action.selectedRoleIds.length >= playerCount) {
        // Sélection manuelle : on utilise les rôles choisis, mélangés
        assignedRoles = shuffle(action.selectedRoleIds).slice(0, playerCount);
      } else {
        // Mode aléatoire : respect des règles officielles de répartition
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

      let roleIdx = 0;
      const players = state.players.map((p) => {
        if (p.id === action.storytellerId) {
          // GM = pas de rôle
          return { ...p, role: null, displayRole: null, isStoryteller: true };
        }
        const realRole = assignedRoles[roleIdx++];
        const isDrunk = realRole === "drunk";
        return {
          ...p,
          role: realRole,
          displayRole: isDrunk && action.drunkFakeRoleId ? action.drunkFakeRoleId : realRole,
          isStoryteller: false,
        };
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
      // Le GM ne peut pas nominer
      if (nominator.isStoryteller) return state;
      return { ...state, nominee: action.nomineeId, votes: {} };
    }

    case "CLEAR_NOMINATION": {
      if (action.storytellerId !== state.storytellerId) return state;
      return { ...state, nominee: null, votes: {} };
    }

    default:
      return state;
  }
}

// Vue restreinte côté joueur :
// - le joueur voit son displayRole (rôle fictif si Drunk)
// - les autres joueurs apparaissent SANS rôle (sauf pour le GM qui voit tout)
export function getPlayerView(state: GameState, playerId: string): PlayerView | null {
  const me = state.players.find(p => p.id === playerId);
  if (!me) return null;

  // Côté GM : on lui donne le vrai rôle des autres dans `role`
  // Côté joueur normal : `role` = null (privé)
  const others = state.players
    .filter(p => p.id !== playerId)
    .map(p => ({
      ...p,
      role: me.isStoryteller ? p.role : null,
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
