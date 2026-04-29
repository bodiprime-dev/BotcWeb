export type Phase = "lobby" | "day" | "night";

// ─── RoleInfo ──────────────────────────────────────────────────────────────
// Informations structurées attachées à la fiche d'un joueur.
// Générées automatiquement au START_GAME pour les rôles qui reçoivent des
// infos en première nuit, et modifiables par le GM via SET_ROLE_INFO.

export type RoleInfoEntry =
  | { kind: "bluffs"; roleIds: [string, string, string] }
  | { kind: "two_players_one_role"; playerAId: string; playerBId: string; roleId: string; result?: boolean }
  | { kind: "player_and_role"; playerId: string; roleId: string; label?: string }
  | { kind: "role_list"; roleIds: string[] }
  | { kind: "count"; label: string; value: number }
  | { kind: "text"; content: string };

// ─── Player ────────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  role: string | null;          // vrai rôle (peut être "drunk")
  displayRole: string | null;   // rôle affiché côté joueur — = role sauf Drunk où c'est le rôle fictif
  alive: boolean;
  isStoryteller: boolean;
  poisoned: boolean;
  roleInfo: RoleInfoEntry[];    // infos de rôle (bluffs démon, infos lavandière, etc.)
}

// ─── GameState ─────────────────────────────────────────────────────────────

export interface GameState {
  code: string;
  scriptId: string;
  phase: Phase;
  day: number;
  players: Player[];
  storytellerId: string | null;
  createdAt: number;
  startedAt: number | null;
  selectedRoleIds: string[];
  nominee: string | null;
  votes: Record<string, string[]>;
}

// ─── PlayerView ────────────────────────────────────────────────────────────

export interface PlayerView {
  code: string;
  scriptId: string;
  phase: Phase;
  day: number;
  me: Player;
  others: Array<Omit<Player, "role" | "roleInfo"> & { role: null; roleInfo: [] }>;
  storytellerId: string | null;
  nominee: string | null;
}

// ─── GameAction ────────────────────────────────────────────────────────────

export type GameAction =
  | { type: "ADD_PLAYER"; name: string }
  | { type: "REMOVE_PLAYER"; playerId: string }
  | { type: "START_GAME"; storytellerId: string; selectedRoleIds: string[]; drunkFakeRoleId?: string | null; lunaticFakeDemonId?: string | null; lunaticBluffRoleIds?: [string, string, string] | null; demonBluffRoleIds?: [string, string, string] | null; prefillRoleInfo?: boolean }
  | { type: "TOGGLE_ALIVE"; playerId: string; storytellerId: string }
  | { type: "TOGGLE_POISON"; playerId: string; storytellerId: string }
  | { type: "SET_NOMINEE"; playerId: string | null; storytellerId: string }
  | { type: "TOGGLE_PHASE"; storytellerId: string }
  | { type: "NOMINATE"; nominatorId: string; nomineeId: string }
  | { type: "CLEAR_NOMINATION"; storytellerId: string }
  | { type: "SET_ROLE_INFO"; storytellerId: string; playerId: string; roleInfo: RoleInfoEntry[] };
