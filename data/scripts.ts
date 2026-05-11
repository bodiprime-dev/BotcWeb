// ═══════════════════════════════════════════════════════════════════════
//  scripts.ts — Bibliothèque de scénarios pour Blood on the Clocktower
//
//  Pour ajouter un script custom :
//  1) Créer un objet suivant le schéma `Script`
//  2) L'ajouter à l'objet `SCRIPTS` exporté en bas
// ═══════════════════════════════════════════════════════════════════════

export type Team = "townsfolk" | "outsider" | "minion" | "demon" | "traveler";

export interface Role {
  name: string;
  team: Team;
  ability: string;
  firstNight?: number;
  otherNight?: number;
}

export interface Script {
  id: string;
  name: string;
  author: string;
  description: string;
  roles: Record<string, Role>;
}

// ─── Trouble Brewing ───────────────────────────────────────────────────
const TROUBLE_BREWING: Script = {
  id: "trouble-brewing",
  name: "Trouble Brewing",
  author: "The Pandemonium Institute",
  description: "Le script d'introduction. Bienvenue à Ravenswood Bluff.",
  roles: {
    washerwoman: {
      name: "Washerwoman",
      team: "townsfolk",
      ability: "La 1re nuit, le Conteur te désigne 2 joueurs et un rôle Townsfolk précis : l'un de ces 2 joueurs détient ce rôle. Tu sais quel rôle, mais pas lequel des deux.",
      firstNight: 33,
    },
    librarian: {
      name: "Librarian",
      team: "townsfolk",
      ability: "La 1re nuit, le Conteur te désigne 2 joueurs et un rôle Outsider précis : l'un d'eux détient ce rôle — ou il t'apprend qu'aucun Outsider n'est en jeu.",
      firstNight: 34,
    },
    investigator: {
      name: "Investigator",
      team: "townsfolk",
      ability: "La 1re nuit, le Conteur te désigne 2 joueurs et un rôle de Sbire précis : l'un d'eux est ce Sbire. Tu sais quel rôle, mais pas lequel des deux.",
      firstNight: 35,
    },
    chef: {
      name: "Chef",
      team: "townsfolk",
      ability: "La 1re nuit, tu apprends combien de paires de joueurs Maléfiques sont assis côte à côte autour du cercle (0, 1, 2…). Deux Maléfiques séparés par un Bon ne forment pas une paire.",
      firstNight: 36,
    },
    empath: {
      name: "Empath",
      team: "townsfolk",
      ability: "Chaque nuit, tu apprends combien de tes deux voisins vivants les plus proches sont Maléfiques (0, 1 ou 2). Les joueurs morts entre vous sont ignorés.",
      firstNight: 37,
      otherNight: 53,
    },
    fortuneteller: {
      name: "Fortune Teller",
      team: "townsfolk",
      ability: "Chaque nuit, désigne 2 joueurs : tu apprends si OUI ou NON l'un d'eux est le Démon. Un joueur Bon précis est ton Red Herring : il déclenche aussi un OUI s'il fait partie des deux désignés.",
      firstNight: 38,
      otherNight: 54,
    },
    undertaker: {
      name: "Undertaker",
      team: "townsfolk",
      ability: "Chaque nuit (sauf la 1re), tu apprends le rôle du joueur exécuté aujourd'hui. Si aucune exécution n'a eu lieu, tu ne reçois rien.",
      otherNight: 55,
    },
    monk: {
      name: "Monk",
      team: "townsfolk",
      ability: "Chaque nuit (sauf la 1re), désigne un autre joueur que toi : il est protégé du Démon cette nuit. Sa protection n'empêche pas les autres sources de mort.",
      otherNight: 12,
    },
    ravenkeeper: {
      name: "Ravenkeeper",
      team: "townsfolk",
      ability: "Si tu meurs durant la nuit, tu te réveilles aussitôt et tu désignes un joueur : tu apprends son rôle. Sans effet si tu meurs le jour.",
      otherNight: 41,
    },
    virgin: {
      name: "Virgin",
      team: "townsfolk",
      ability: "La 1re fois que tu es nominée, si le nominateur est un Townsfolk, il est exécuté immédiatement (la nomination ne se poursuit pas). Tu perds ensuite ta capacité, qu'elle ait déclenché ou non.",
    },
    slayer: {
      name: "Slayer",
      team: "townsfolk",
      ability: "Une fois par partie, le jour, déclare publiquement viser un joueur en te déclarant Slayer : si c'est le Démon, il meurt immédiatement. Sans effet si tu es ivre ou empoisonnée.",
    },
    soldier: {
      name: "Soldier",
      team: "townsfolk",
      ability: "Tu es immunisé contre la capacité offensive du Démon : il ne peut pas te tuer la nuit. Les autres causes de mort (exécution, Sbires, Voyageurs…) restent normales.",
    },
    mayor: {
      name: "Mayor",
      team: "townsfolk",
      ability: "Si seuls 3 joueurs sont vivants à la fin du jour sans aucune exécution, le Bien gagne. De plus, si tu mourrais la nuit, le Conteur peut faire mourir un autre joueur à ta place.",
    },
    butler: {
      name: "Butler",
      team: "outsider",
      ability: "Chaque nuit, désigne un autre joueur : c'est ton Maître jusqu'à la nuit suivante. Le lendemain, tu ne peux voter que si ton Maître vote OUI au même tour.",
      firstNight: 39,
      otherNight: 56,
    },
    drunk: {
      name: "Drunk",
      team: "outsider",
      ability: "Tu ignores que tu es ivre. Tu te crois être un Townsfolk précis et tu joues comme tel, mais ton pouvoir ne fonctionne pas et toutes les informations que tu reçois sont fausses.",
    },
    recluse: {
      name: "Recluse",
      team: "outsider",
      ability: "Tu es Bon, mais tu peux apparaître comme un Sbire ou comme le Démon vis-à-vis des autres pouvoirs (Enquêteur, Devin, Slayer…). Tu comptes toujours comme Bon pour la victoire.",
    },
    saint: {
      name: "Saint",
      team: "outsider",
      ability: "Si tu es exécuté par vote, le Mal gagne immédiatement. Mourir d'une autre cause (Démon, Slayer, etc.) ne déclenche pas cet effet.",
    },
    poisoner: {
      name: "Poisoner",
      team: "minion",
      ability: "Chaque nuit, désigne un joueur : il est empoisonné jusqu'à la fin de la nuit suivante. Son pouvoir échoue et toutes les informations qu'il reçoit sont fausses (au choix du Conteur).",
      firstNight: 17,
      otherNight: 8,
    },
    spy: {
      name: "Spy",
      team: "minion",
      ability: "Chaque nuit, tu vois le Grimoire entier (rôles, alignements, marqueurs). Tu peux apparaître comme un Townsfolk ou un Outsider précis vis-à-vis des autres pouvoirs, et tu comptes comme Bon pour eux.",
      firstNight: 48,
      otherNight: 67,
    },
    scarletwoman: {
      name: "Scarlet Woman",
      team: "minion",
      ability: "Si le Démon meurt alors qu'il reste 5 joueurs vivants ou plus (Voyageurs exclus), tu deviens immédiatement le Démon et apprends quel rôle tu prends. Tu conserves ton alignement Maléfique.",
    },
    baron: {
      name: "Baron",
      team: "minion",
      ability: "Tant que tu es en jeu, la mise en place ajoute 2 Outsiders supplémentaires et retire 2 Townsfolk. Tu n'as pas d'autre pouvoir.",
    },
    imp: {
      name: "Imp",
      team: "demon",
      ability: "Chaque nuit (sauf la 1re), désigne un joueur : il meurt. Si tu te désignes toi-même, tu meurs et un Sbire vivant (au choix du Conteur) devient l'Imp à ta place.",
      otherNight: 24,
    },
    bureaucrat: {
      name: "Bureaucrat",
      team: "traveler",
      ability: "Chaque jour, désigne secrètement un joueur : ses votes comptent triple aujourd'hui (Bon ou Mal indifféremment).",
    },
    thief: {
      name: "Thief",
      team: "traveler",
      ability: "Chaque jour, désigne secrètement un joueur : ses votes comptent en négatif aujourd'hui (chaque OUI compte comme -1).",
    },
    scapegoat: {
      name: "Scapegoat",
      team: "traveler",
      ability: "Si un joueur de ton alignement est exécuté, tu peux choisir de mourir à sa place. Sinon, tu n'as aucun autre pouvoir.",
    },
  },
};

// ─── Bad Moon Rising ───────────────────────────────────────────────────
const BAD_MOON_RISING: Script = {
  id: "bad-moon-rising",
  name: "Bad Moon Rising",
  author: "The Pandemonium Institute",
  description: "La mort rôde. Personne n'est en sécurité, même la nuit.",
  roles: {
    grandmother: {
      name: "Grandmother",
      team: "townsfolk",
      ability: "La 1re nuit, le Conteur te révèle un joueur Bon précis (ton « petit-fils ») et son rôle. Si le Démon le tue la nuit, tu meurs aussi immédiatement.",
      firstNight: 40,
    },
    sailor: {
      name: "Sailor",
      team: "townsfolk",
      ability: "Chaque nuit, désigne un joueur vivant : toi ou lui êtes ivre jusqu'à la nuit suivante (au choix du Conteur). Tant que tu es en vie, tu ne peux mourir d'aucune cause.",
      firstNight: 14,
      otherNight: 4,
    },
    chambermaid: {
      name: "Chambermaid",
      team: "townsfolk",
      ability: "Chaque nuit, désigne 2 autres joueurs : tu apprends combien d'entre eux se sont réveillés cette nuit pour utiliser leur capacité (0, 1 ou 2).",
      firstNight: 49,
      otherNight: 68,
    },
    exorcist: {
      name: "Exorcist",
      team: "townsfolk",
      ability: "Chaque nuit (sauf la 1re), désigne un joueur différent de la veille : si c'est le Démon, il ne se réveille pas cette nuit (et donc ne tue pas) et il apprend qui tu es.",
      otherNight: 18,
    },
    innkeeper: {
      name: "Innkeeper",
      team: "townsfolk",
      ability: "Chaque nuit (sauf la 1re), désigne 2 autres joueurs : ils sont protégés de toute mort cette nuit, mais l'un d'eux (au choix du Conteur) devient ivre jusqu'à la nuit suivante.",
      otherNight: 22,
    },
    gambler: {
      name: "Gambler",
      team: "townsfolk",
      ability: "Chaque nuit (sauf la 1re), désigne un joueur et devine son rôle : si ta devinette est fausse, tu meurs. Si elle est juste, rien ne se passe.",
      otherNight: 33,
    },
    gossip: {
      name: "Gossip",
      team: "townsfolk",
      ability: "Chaque jour, tu peux faire une déclaration publique. Si elle est vraie, un joueur Maléfique meurt la nuit suivante (au choix du Conteur).",
      otherNight: 28,
    },
    courtier: {
      name: "Courtier",
      team: "townsfolk",
      ability: "Une fois par partie, la nuit, désigne un rôle : le joueur qui le détient (s'il existe) devient ivre pendant 3 jours et 3 nuits.",
      firstNight: 30,
      otherNight: 14,
    },
    professor: {
      name: "Professor",
      team: "townsfolk",
      ability: "Une fois par partie, la nuit (sauf la 1re), désigne un joueur mort : si c'est un Townsfolk, il revient à la vie. Sinon, ta capacité est perdue.",
      otherNight: 38,
    },
    minstrel: {
      name: "Minstrel",
      team: "townsfolk",
      ability: "Si un Sbire meurt par exécution, tous les autres joueurs (sauf les Voyageurs) deviennent ivres jusqu'à la fin du jour suivant.",
    },
    tealady: {
      name: "Tea Lady",
      team: "townsfolk",
      ability: "Si tes deux voisins vivants les plus proches sont tous deux Bons, ils ne peuvent ni mourir ni être tués par aucune cause.",
    },
    pacifist: {
      name: "Pacifist",
      team: "townsfolk",
      ability: "Les Townsfolk Bons exécutés peuvent ne pas mourir (au choix du Conteur). L'exécution se déroule, mais le joueur reste en vie.",
    },
    fool: {
      name: "Fool",
      team: "townsfolk",
      ability: "La 1re fois que tu mourrais — de jour comme de nuit — tu ne meurs pas. La capacité s'épuise après ce premier sauvetage.",
    },
    goon: {
      name: "Goon",
      team: "outsider",
      ability: "Le 1er joueur (Bon ou Maléfique) qui utilise un pouvoir nocturne sur toi change d'alignement. Tu deviens ivre jusqu'au lendemain soir.",
    },
    lunatic: {
      name: "Lunatic",
      team: "outsider",
      ability: "Tu te crois être le Démon, mais tu es en réalité un Outsider Bon. Le Conteur écoute tes choix sans rien appliquer ; le vrai Démon connaît ton identité et tes cibles.",
      firstNight: 21,
      otherNight: 9,
    },
    tinker: {
      name: "Tinker",
      team: "outsider",
      ability: "Tu peux mourir à n'importe quel moment — de jour comme de nuit — au choix du Conteur. Rien d'autre.",
      otherNight: 70,
    },
    moonchild: {
      name: "Moonchild",
      team: "outsider",
      ability: "Lorsque tu apprends ta mort, désigne publiquement un joueur : s'il est Bon, il meurt cette nuit. Capacité unique : tu n'as pas d'effet supplémentaire.",
    },
    godfather: {
      name: "Godfather",
      team: "minion",
      ability: "La 1re nuit, tu apprends la liste des Outsiders en jeu. Si un Outsider meurt durant le jour, désigne un joueur la nuit suivante : il meurt.",
      firstNight: 18,
      otherNight: 21,
    },
    devilsadvocate: {
      name: "Devil's Advocate",
      team: "minion",
      ability: "Chaque nuit, désigne un joueur vivant différent de la veille : il survit à son exécution le lendemain (sans mourir).",
      firstNight: 19,
      otherNight: 7,
    },
    assassin: {
      name: "Assassin",
      team: "minion",
      ability: "Une fois par partie, la nuit (sauf la 1re), désigne un joueur : il meurt, même s'il est protégé ou normalement immunisé.",
      otherNight: 26,
    },
    mastermind: {
      name: "Mastermind",
      team: "minion",
      ability: "Si le Démon est exécuté, la partie ne s'arrête pas immédiatement : le Mal a un jour entier de plus pour gagner. Si une exécution a lieu ce jour-là, le Mal perd.",
    },
    zombuul: {
      name: "Zombuul",
      team: "demon",
      ability: "Chaque nuit (sauf la 1re), si aucun joueur n'est mort durant le jour, désigne un joueur : il meurt. La 1re fois que tu mourrais le jour, tu fais semblant et restes secrètement en vie.",
      otherNight: 23,
    },
    pukka: {
      name: "Pukka",
      team: "demon",
      ability: "Chaque nuit, désigne un joueur : il est empoisonné et mourra la nuit suivante (au moment où tu en empoisonnes un nouveau).",
      firstNight: 26,
      otherNight: 25,
    },
    shabaloth: {
      name: "Shabaloth",
      team: "demon",
      ability: "Chaque nuit (sauf la 1re), désigne 2 joueurs : ils meurent. Une victime de la nuit précédente peut revenir à la vie (au choix du Conteur).",
      otherNight: 27,
    },
    po: {
      name: "Po",
      team: "demon",
      ability: "Chaque nuit (sauf la 1re), tu peux désigner 0 ou 1 joueur : il meurt. Si tu choisis de ne tuer personne une nuit, tu désignes 3 joueurs la nuit suivante : tous meurent.",
      otherNight: 29,
    },
    bureaucrat: {
      name: "Bureaucrat",
      team: "traveler",
      ability: "Chaque jour, désigne secrètement un joueur : ses votes comptent triple aujourd'hui (Bon ou Mal indifféremment).",
    },
    thief: {
      name: "Thief",
      team: "traveler",
      ability: "Chaque jour, désigne secrètement un joueur : ses votes comptent en négatif aujourd'hui (chaque OUI compte comme -1).",
    },
    scapegoat: {
      name: "Scapegoat",
      team: "traveler",
      ability: "Si un joueur de ton alignement est exécuté, tu peux choisir de mourir à sa place. Sinon, tu n'as aucun autre pouvoir.",
    },
  },
};

// ─── Registre exporté ──────────────────────────────────────────────────
export const SCRIPTS: Record<string, Script> = {
  "trouble-brewing": TROUBLE_BREWING,
  "bad-moon-rising": BAD_MOON_RISING,
};

// ─── Palette d'équipes ─────────────────────────────────────────────────
//
// Cette palette est partagée par TOUS les usages (cercle Conteur, sidebar
// nuit, modal de référence, badge sur la vue joueur, sélecteur de rôles
// dans le lobby, etc.). C'est donc le levier le plus efficace pour
// homogénéiser le rendu.
//
// Choix de design :
//  - `bg`   est uniformément `bg-stone-900` → de loin (>1m), tous les rôles
//           se ressemblent. On ne peut PAS deviner bien/mal d'un coup d'œil
//           sur l'écran d'un voisin.
//  - `ring` porte la signature subtile (ambre/rouge, opacité modérée). Vue
//           de près, le Conteur la repère, mais elle ne saute pas aux yeux.
//  - `text` reste haut-contraste sur fond sombre — les noms de rôles
//           écrits dans la sidebar nuit (fond `bg-indigo-950/60`) sont
//           maintenant tous lisibles, contrairement à l'ancien
//           `text-amber-950` (presque noir sur bleu marine = invisible).
//  - `accent` garde une teinte forte. Sert aux pastilles numériques de
//           l'ordre de nuit, aux petits points colorés, etc. — éléments
//           ponctuels qui aident le Conteur à scanner sans dominer l'UI.
//
export const TEAM_COLORS: Record<Team, { bg: string; ring: string; text: string; label: string; accent: string }> = {
  townsfolk: { bg: "bg-stone-900", ring: "ring-amber-800/50", text: "text-amber-200", label: "Townsfolk", accent: "bg-amber-700" },
  outsider:  { bg: "bg-stone-900", ring: "ring-amber-600/40", text: "text-amber-100", label: "Outsider",  accent: "bg-amber-500" },
  minion:    { bg: "bg-stone-900", ring: "ring-red-900/60",   text: "text-red-300",   label: "Minion",    accent: "bg-red-800" },
  demon:     { bg: "bg-stone-900", ring: "ring-red-700/70",   text: "text-rose-200",  label: "Démon",     accent: "bg-red-700" },
  traveler:  { bg: "bg-stone-900", ring: "ring-emerald-700/60", text: "text-emerald-200", label: "Voyageur", accent: "bg-emerald-700" },
};

// ─── Descriptions des équipes ──────────────────────────────────────────
//
// Rappel synthétique de ce que représente chaque équipe à Ravenswood
// Bluff. Affiché dans la modale « Voir les rôles du script » au-dessus
// de chaque section. Volontairement court : 1 paragraphe par équipe,
// orienté joueur (« tu / vous »).
//
export const TEAM_DESCRIPTIONS: Record<Team, { tagline: string; details: string }> = {
  townsfolk: {
    tagline: "Le camp des Bons. La majorité du village.",
    details:
      "Chaque Townsfolk possède une capacité unique au service de l'enquête : déduire qui est le Démon, échanger des informations, se protéger. Pour gagner, vous devez collectivement exécuter le Démon avant qu'il ne décime le village.",
  },
  outsider: {
    tagline: "Bons mais handicapants pour le camp du Bien.",
    details:
      "Les Outsiders jouent avec les Bons mais leurs capacités les pénalisent (informations faussées, vote restreint, défaite si exécuté…). Ils peuvent être manipulés par les Maléfiques et compliquent la lecture du jeu pour les Townsfolk.",
  },
  minion: {
    tagline: "Le camp du Mal — les Sbires du Démon.",
    details:
      "Les Sbires connaissent l'identité du Démon (et entre eux) dès la première nuit. Leur rôle est de protéger le Démon, semer la confusion, empoisonner ou affaiblir les Townsfolk, et faire exécuter les Bons. Ils gagnent avec le Démon.",
  },
  demon: {
    tagline: "Le chef des Maléfiques. Un seul par partie.",
    details:
      "Le Démon connaît ses Sbires et reçoit 3 bluffs : des rôles Townsfolk absents du jeu qu'il peut prétendre être. Chaque nuit (sauf parfois la 1re), il tue un joueur. Le Mal gagne dès qu'il ne reste que 2 joueurs vivants ou si un Saint est exécuté.",
  },
  traveler: {
    tagline: "Joueurs de passage, alignement public.",
    details:
      "Les Voyageurs rejoignent ou quittent la table sans casser la partie. Leur alignement (Bon ou Mal) est connu de tous dès leur arrivée. Ils possèdent des capacités diurnes spéciales et peuvent être exilés à la majorité sans nomination formelle.",
  },
};

export const getScriptList = () =>
  Object.values(SCRIPTS).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    roleCount: Object.keys(s.roles).length,
  }));
