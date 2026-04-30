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

// Demande envoyée par le Conteur à un joueur pendant la nuit (ou le jour pour Slayer).
export type NightPrompt =
  | { kind: "pick"; min: number; max: number; label: string }
  | { kind: "ack"; label: string };

export interface NightSubmission {
  targetIds: string[];
  at: number;
}

// Reminder tokens posés par le Conteur près d'un joueur (info GM-only).
// Liste libre + presets dans data/reminders.ts.
export type ReminderToken = string; // ex: "drunk", "protected", "mad", "used", "red-herring", "master"

export interface Player {
  id: string;
  name: string;
  role: string | null;          // vrai rôle (peut être "drunk")
  displayRole: string | null;   // rôle affiché côté joueur — = role sauf Drunk où c'est le rôle fictif
  alive: boolean;
  isStoryteller: boolean;
  poisoned: boolean;
  ghostVoteUsed: boolean;       // un mort dispose d'un seul vote (vote fantôme), épuisé une fois utilisé
  roleInfo: RoleInfoEntry[];    // infos de rôle (bluffs démon, infos lavandière, etc.)
  nightPrompt: NightPrompt | null;     // demande active du Conteur
  nightSubmission: NightSubmission | null; // réponse du joueur à la demande active
  reminders: ReminderToken[];   // GM-only — redacté pour tous les non-GM
  slayerUsed: boolean;          // capacité Slayer déjà consommée
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  fromId: string;            // playerId de l'émetteur
  toId: string | "all";       // "all" = canal public, sinon playerId du destinataire
  text: string;
  at: number;
}

// ─── Nominations & votes ──────────────────────────────────────────────────

export interface NominationRecord {
  nominatorId: string;
  nomineeId: string;
  yesVoterIds: string[];   // ordre d'arrivée des oui
  yesCount: number;
  executed: boolean;       // nominé exécuté à la suite de cette nomination
  at: number;              // timestamp pour l'ordre
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
  // Nomination en cours :
  nominee: string | null;
  nominator: string | null;
  votes: Record<string, boolean>; // playerId → vote (true=oui, false=non/abstention)
  // Historique du jour (effacé au passage jour→nuit) :
  nominationsToday: NominationRecord[];
  // PlayerIds dont l'action de nuit a été "cochée" par le GM cette nuit.
  // Réinitialisé à chaque transition de phase.
  nightDone: string[];
  // Chat persistant (cap. 200 messages côté serveur). Filtré par redactStateFor.
  chat: ChatMessage[];
  // Verrou de fin de partie (cf. point C). null = partie en cours.
  winner: "good" | "evil" | null;
  winReason: string | null;
  // Secrets serveur — ne sortent JAMAIS du serveur (purgés par redactStateFor).
  // Map playerId → token aléatoire utilisé pour authentifier les requêtes.
  secrets: Record<string, string>;
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
  | { type: "REORDER_PLAYERS"; playerId: string; direction: "up" | "down" }
  | { type: "START_GAME"; storytellerId: string; selectedRoleIds: string[]; drunkFakeRoleId?: string | null; lunaticFakeDemonId?: string | null; lunaticBluffRoleIds?: [string, string, string] | null; demonBluffRoleIds?: [string, string, string] | null; prefillRoleInfo?: boolean }
  | { type: "TOGGLE_ALIVE"; playerId: string; storytellerId: string }
  | { type: "TOGGLE_POISON"; playerId: string; storytellerId: string }
  | { type: "SET_NOMINEE"; playerId: string | null; storytellerId: string }
  | { type: "TOGGLE_PHASE"; storytellerId: string }
  | { type: "NOMINATE"; nominatorId: string; nomineeId: string }
  | { type: "CLEAR_NOMINATION"; storytellerId: string }
  | { type: "VOTE"; voterId: string; value: boolean }
  | { type: "RESOLVE_NOMINATION"; storytellerId: string; execute: boolean }
  | { type: "SET_ROLE_INFO"; storytellerId: string; playerId: string; roleInfo: RoleInfoEntry[] }
  | { type: "SET_PLAYER_ROLE"; storytellerId: string; playerId: string; roleId: string }
  | { type: "SET_NIGHT_PROMPT"; storytellerId: string; playerId: string; prompt: NightPrompt | null }
  | { type: "SUBMIT_NIGHT_PROMPT"; playerId: string; targetIds: string[] }
  | { type: "CLEAR_NIGHT_PROMPT"; storytellerId: string; playerId: string }
  | { type: "ADD_REMINDER"; storytellerId: string; playerId: string; token: ReminderToken }
  | { type: "REMOVE_REMINDER"; storytellerId: string; playerId: string; index: number }
  | { type: "TOGGLE_NIGHT_DONE"; storytellerId: string; playerId: string }
  | { type: "SLAYER_SHOOT"; shooterId: string; targetId: string }
  | { type: "SEND_CHAT"; fromId: string; toId: string | "all"; text: string }
  | { type: "EXILE_TRAVELER"; storytellerId: string; playerId: string };
