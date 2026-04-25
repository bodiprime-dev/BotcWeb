import { nanoid } from "nanoid";
import type { GameState, GameAction, Player, PlayerView } from "./types";
import { SCRIPTS } from "@/data/scripts";

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
    nominee: null,
    votes: {},
  };
}

export function generateCode(): string {
  // 4 lettres lisibles, sans ambiguïtés
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
        alive: true,
        isStoryteller: false,
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

      const roleKeys = Object.keys(script.roles);
      const shuffledRoles = [...roleKeys].sort(() => Math.random() - 0.5).slice(0, state.players.length);
      const players = state.players.map((p, i) => ({
        ...p,
        role: shuffledRoles[i],
        isStoryteller: p.id === action.storytellerId,
      }));
      return {
        ...state,
        players,
        phase: "day",
        day: 1,
        startedAt: Date.now(),
        storytellerId: action.storytellerId,
      };
    }

    case "TOGGLE_ALIVE": {
      if (action.storytellerId !== state.storytellerId) return state;
      return {
        ...state,
        players: state.players.map(p => p.id === action.playerId ? { ...p, alive: !p.alive } : p),
      };
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

// Vue restreinte pour un joueur (sans les rôles des autres)
export function getPlayerView(state: GameState, playerId: string): PlayerView | null {
  const me = state.players.find(p => p.id === playerId);
  if (!me) return null;
  // Le Conteur voit tout
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
