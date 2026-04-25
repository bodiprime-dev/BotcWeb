export type Phase = "lobby" | "day" | "night";

export interface Player {
  id: string;
  name: string;
  role: string | null;   // null en lobby
  alive: boolean;
  isStoryteller: boolean;
  poisoned: boolean;
}

export interface GameState {
  code: string;
  scriptId: string;
  phase: Phase;
  day: number;
  players: Player[];
  storytellerId: string | null;
  createdAt: number;
  startedAt: number | null;
  selectedRoleIds: string[];   // rôles effectivement en jeu
  nominee: string | null;
  votes: Record<string, string[]>;
}

export interface PlayerView {
  code: string;
  scriptId: string;
  phase: Phase;
  day: number;
  me: Player;
  others: Array<Omit<Player, "role"> & { role: null }>;
  storytellerId: string | null;
  nominee: string | null;
}

export type GameAction =
  | { type: "ADD_PLAYER"; name: string }
  | { type: "REMOVE_PLAYER"; playerId: string }
  | { type: "START_GAME"; storytellerId: string; selectedRoleIds: string[] }
  | { type: "TOGGLE_ALIVE"; playerId: string; storytellerId: string }
  | { type: "TOGGLE_POISON"; playerId: string; storytellerId: string }
  | { type: "SET_NOMINEE"; playerId: string | null; storytellerId: string }
  | { type: "TOGGLE_PHASE"; storytellerId: string }
  | { type: "NOMINATE"; nominatorId: string; nomineeId: string }
  | { type: "CLEAR_NOMINATION"; storytellerId: string };
