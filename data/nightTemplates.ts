// Templates de saisie d'information pour le mode "Nuit guidée".
// Couvre tous les rôles avec une action de nuit dans Trouble Brewing et Bad Moon Rising.
//
// Chaque template décrit ce que le Conteur doit faire pour ce rôle, à la première
// nuit (firstNight) ou aux nuits suivantes (otherNight). Si une entrée est absente,
// le rôle n'a rien à faire à ce moment-là.

import type { Team } from "@/data/scripts";

export type NightAction =
  // Le joueur reçoit une info "2 joueurs, 1 rôle" (Lavandière, Bibliothécaire, Enquêteur).
  // Le GM choisit deux joueurs et le rôle révélé. allowNone : on peut indiquer "aucun".
  | { kind: "info_two_players_one_role"; restrictTeam?: Team; allowNone?: boolean }
  // Le joueur reçoit un compteur (Chef, Empath, Chambermaid).
  | { kind: "info_count"; label: string }
  // Le joueur reçoit "1 joueur + 1 rôle" (Grand-mère, Croque-mort, Gardien des corbeaux).
  | { kind: "info_player_and_role"; restrictTeam?: Team }
  // Le joueur reçoit une liste de rôles (Parrain : outsiders en jeu).
  | { kind: "info_role_list"; restrictTeam: Team; fromInPlay: boolean }
  // Devin : le GM choisit 2 joueurs et OUI/NON.
  | { kind: "info_fortune" }
  // Le joueur a choisi une cible et le GM applique un effet (poison, ivre, protection…).
  | {
      kind: "pick_player";
      label: string;
      effect: "drunk" | "protected" | "poisoned" | "to-die" | "no-ability" | "master" | null;
      count?: 1 | 2; // par défaut 1
    }
  // Aucune saisie spécifique — on rappelle simplement au GM ce qu'il doit faire.
  | { kind: "manual"; note: string };

export interface NightTemplate {
  prompt: string;        // ce que le GM doit dire / faire (court)
  action: NightAction;
}

export interface RoleNightSpec {
  firstNight?: NightTemplate;
  otherNight?: NightTemplate;
}

// ─── Trouble Brewing ────────────────────────────────────────────────────────

const TB_TEMPLATES: Record<string, RoleNightSpec> = {
  // — Townsfolk —
  washerwoman: {
    firstNight: {
      prompt: "Désigne 2 joueurs et le Townsfolk que l'un d'eux est.",
      action: { kind: "info_two_players_one_role", restrictTeam: "townsfolk" },
    },
  },
  librarian: {
    firstNight: {
      prompt: "Désigne 2 joueurs et l'Outsider que l'un d'eux est (ou aucun).",
      action: { kind: "info_two_players_one_role", restrictTeam: "outsider", allowNone: true },
    },
  },
  investigator: {
    firstNight: {
      prompt: "Désigne 2 joueurs et le Minion que l'un d'eux est.",
      action: { kind: "info_two_players_one_role", restrictTeam: "minion" },
    },
  },
  chef: {
    firstNight: {
      prompt: "Indique combien de paires de Maléfiques sont voisines.",
      action: { kind: "info_count", label: "Paires de Maléfiques voisines" },
    },
  },
  empath: {
    firstNight: {
      prompt: "Indique combien des 2 voisins vivants de l'Empath sont Maléfiques.",
      action: { kind: "info_count", label: "Voisins maléfiques" },
    },
    otherNight: {
      prompt: "Indique combien des 2 voisins vivants de l'Empath sont Maléfiques.",
      action: { kind: "info_count", label: "Voisins maléfiques" },
    },
  },
  fortuneteller: {
    firstNight: {
      prompt: "Le Devin choisit 2 joueurs : indique si l'un d'eux est le Démon (ou Red Herring).",
      action: { kind: "info_fortune" },
    },
    otherNight: {
      prompt: "Le Devin choisit 2 joueurs : indique si l'un d'eux est le Démon (ou Red Herring).",
      action: { kind: "info_fortune" },
    },
  },
  undertaker: {
    otherNight: {
      prompt: "Indique le rôle du joueur exécuté aujourd'hui (rien si pas d'exécution).",
      action: { kind: "info_player_and_role" },
    },
  },
  monk: {
    otherNight: {
      prompt: "Le Monk désigne un autre joueur : il sera protégé du Démon cette nuit.",
      action: { kind: "pick_player", label: "Joueur protégé", effect: "protected" },
    },
  },
  ravenkeeper: {
    otherNight: {
      prompt: "Si le Ravenkeeper est mort cette nuit : il choisit un joueur, indique son rôle.",
      action: { kind: "info_player_and_role" },
    },
  },
  butler: {
    firstNight: {
      prompt: "Le Butler désigne son maître.",
      action: { kind: "pick_player", label: "Maître", effect: "master" },
    },
    otherNight: {
      prompt: "Le Butler désigne son maître.",
      action: { kind: "pick_player", label: "Maître", effect: "master" },
    },
  },
  spy: {
    firstNight: {
      prompt: "Montre le Grimoire au Spy.",
      action: { kind: "manual", note: "Le Spy voit l'ensemble du Grimoire." },
    },
    otherNight: {
      prompt: "Montre le Grimoire au Spy.",
      action: { kind: "manual", note: "Le Spy voit l'ensemble du Grimoire." },
    },
  },
  // — Outsiders —
  drunk: {
    // Le Drunk ne se réveille pas — il pense être son rôle townsfolk.
    // Géré par useNightOrder via displayRole.
  },
  // — Minions —
  poisoner: {
    firstNight: {
      prompt: "Le Poisoner désigne un joueur : il sera empoisonné jusqu'à demain soir.",
      action: { kind: "pick_player", label: "Joueur empoisonné", effect: "poisoned" },
    },
    otherNight: {
      prompt: "Le Poisoner désigne un joueur : il sera empoisonné jusqu'à demain soir.",
      action: { kind: "pick_player", label: "Joueur empoisonné", effect: "poisoned" },
    },
  },
  // — Démon —
  imp: {
    otherNight: {
      prompt: "L'Imp désigne un joueur : il mourra à l'aube (sauf protection).",
      action: { kind: "pick_player", label: "Cible de l'Imp", effect: "to-die" },
    },
  },
};

// ─── Bad Moon Rising ────────────────────────────────────────────────────────

const BMR_TEMPLATES: Record<string, RoleNightSpec> = {
  // — Townsfolk —
  grandmother: {
    firstNight: {
      prompt: "Désigne au Grand-mère un joueur Bon et son rôle.",
      action: { kind: "info_player_and_role" },
    },
  },
  sailor: {
    firstNight: {
      prompt: "Le Sailor choisit un joueur vivant : un des deux est ivre.",
      action: { kind: "pick_player", label: "Compagnon de boisson", effect: "drunk" },
    },
    otherNight: {
      prompt: "Le Sailor choisit un joueur vivant : un des deux est ivre.",
      action: { kind: "pick_player", label: "Compagnon de boisson", effect: "drunk" },
    },
  },
  chambermaid: {
    firstNight: {
      prompt: "La Chambermaid choisit 2 joueurs : indique combien se sont réveillés cette nuit.",
      action: { kind: "info_count", label: "Joueurs réveillés" },
    },
    otherNight: {
      prompt: "La Chambermaid choisit 2 joueurs : indique combien se sont réveillés cette nuit.",
      action: { kind: "info_count", label: "Joueurs réveillés" },
    },
  },
  exorcist: {
    otherNight: {
      prompt: "L'Exorcist désigne un joueur (différent de la veille) : si c'est le Démon, il ne se réveille pas.",
      action: { kind: "pick_player", label: "Cible de l'Exorcist", effect: "no-ability" },
    },
  },
  innkeeper: {
    otherNight: {
      prompt: "L'Innkeeper désigne 2 joueurs : ils sont protégés cette nuit, mais l'un d'eux est ivre demain.",
      action: { kind: "pick_player", label: "Joueurs à l'auberge", effect: "protected", count: 2 },
    },
  },
  gambler: {
    otherNight: {
      prompt: "Le Gambler désigne un joueur et un rôle. Si faux, il meurt.",
      action: { kind: "manual", note: "Si la devinette est fausse, marquer le Gambler 'mort à l'aube'." },
    },
  },
  courtier: {
    firstNight: {
      prompt: "Si le Courtier utilise sa capacité : il choisit un rôle, ce joueur est ivre 3 jours/nuits.",
      action: { kind: "manual", note: "Pose 'Ivre' sur le porteur du rôle choisi (s'il est en jeu)." },
    },
    otherNight: {
      prompt: "Si le Courtier utilise sa capacité : il choisit un rôle, ce joueur est ivre 3 jours/nuits.",
      action: { kind: "manual", note: "Pose 'Ivre' sur le porteur du rôle choisi (s'il est en jeu)." },
    },
  },
  professor: {
    otherNight: {
      prompt: "Si le Professor utilise sa capacité : il choisit un mort. Si Townsfolk, il revit.",
      action: { kind: "manual", note: "Si le mort choisi est Townsfolk, le ressusciter (basculer vivant)." },
    },
  },
  // — Outsiders —
  lunatic: {
    // Le Lunatic ne reçoit pas d'info ; il est géré via son displayRole (faux démon).
  },
  tinker: {
    otherNight: {
      prompt: "Le Tinker peut mourir à n'importe quel moment.",
      action: { kind: "manual", note: "Si tu décides de tuer le Tinker, marque-le 'mort à l'aube'." },
    },
  },
  // — Minions —
  godfather: {
    firstNight: {
      prompt: "Indique au Godfather quels Outsiders sont en jeu.",
      action: { kind: "info_role_list", restrictTeam: "outsider", fromInPlay: true },
    },
    otherNight: {
      prompt: "Si un Outsider est mort le jour : le Godfather désigne un joueur qui meurt cette nuit.",
      action: { kind: "pick_player", label: "Cible du Godfather", effect: "to-die" },
    },
  },
  devilsadvocate: {
    firstNight: {
      prompt: "Le Devil's Advocate désigne un joueur (différent chaque nuit) : il survit à son exécution demain.",
      action: { kind: "pick_player", label: "Protégé de l'exécution", effect: "protected" },
    },
    otherNight: {
      prompt: "Le Devil's Advocate désigne un joueur (différent chaque nuit) : il survit à son exécution demain.",
      action: { kind: "pick_player", label: "Protégé de l'exécution", effect: "protected" },
    },
  },
  assassin: {
    otherNight: {
      prompt: "Si l'Assassin utilise sa capacité (1×/partie) : il désigne un joueur qui meurt même protégé.",
      action: { kind: "pick_player", label: "Cible de l'Assassin", effect: "to-die" },
    },
  },
  // — Démons —
  zombuul: {
    otherNight: {
      prompt: "Si personne n'est mort aujourd'hui : le Zombuul désigne un joueur qui meurt cette nuit.",
      action: { kind: "pick_player", label: "Cible du Zombuul", effect: "to-die" },
    },
  },
  pukka: {
    firstNight: {
      prompt: "Le Pukka empoisonne un joueur : il mourra la nuit suivante.",
      action: { kind: "pick_player", label: "Cible du Pukka", effect: "poisoned" },
    },
    otherNight: {
      prompt: "Le précédent empoisonné meurt. Le Pukka empoisonne un nouveau joueur.",
      action: { kind: "pick_player", label: "Nouvelle cible du Pukka", effect: "poisoned" },
    },
  },
  shabaloth: {
    otherNight: {
      prompt: "Le Shabaloth désigne 2 joueurs qui meurent. Une victime de la nuit précédente peut revivre.",
      action: { kind: "pick_player", label: "Cibles du Shabaloth", effect: "to-die", count: 2 },
    },
  },
  po: {
    otherNight: {
      prompt: "Le Po peut tuer 0 ou 1 joueur. S'il s'abstient, il en tue 3 la nuit suivante.",
      action: { kind: "pick_player", label: "Cible du Po", effect: "to-die" },
    },
  },
};

const ALL: Record<string, RoleNightSpec> = { ...TB_TEMPLATES, ...BMR_TEMPLATES };

export function getNightTemplate(roleId: string, isFirstNight: boolean): NightTemplate | null {
  const spec = ALL[roleId];
  if (!spec) return null;
  return (isFirstNight ? spec.firstNight : spec.otherNight) ?? null;
}
