// ═══════════════════════════════════════════════════════════════════════
//  scripts.ts — Bibliothèque de scénarios pour Blood on the Clocktower
//
//  Pour ajouter un script custom :
//  1) Créer un objet suivant le schéma `Script`
//  2) L'ajouter à l'objet `SCRIPTS` exporté en bas
// ═══════════════════════════════════════════════════════════════════════

export type Team = "townsfolk" | "outsider" | "minion" | "demon";

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
    washerwoman:   { name: "Washerwoman",    team: "townsfolk", ability: "Tu apprends qu'un joueur parmi 2 est un Townsfolk précis.", firstNight: 33 },
    librarian:     { name: "Librarian",      team: "townsfolk", ability: "Tu apprends qu'un joueur parmi 2 est un Outsider précis (ou aucun).", firstNight: 34 },
    investigator:  { name: "Investigator",   team: "townsfolk", ability: "Tu apprends qu'un joueur parmi 2 est un Minion précis.", firstNight: 35 },
    chef:          { name: "Chef",           team: "townsfolk", ability: "Tu apprends combien de paires de Maléfiques sont voisines.", firstNight: 36 },
    empath:        { name: "Empath",         team: "townsfolk", ability: "Chaque nuit, tu apprends combien de tes voisins vivants sont Maléfiques.", firstNight: 37, otherNight: 53 },
    fortuneteller: { name: "Fortune Teller", team: "townsfolk", ability: "Chaque nuit, choisis 2 joueurs : tu apprends si l'un est le Démon. Un Bon est ton Red Herring.", firstNight: 38, otherNight: 54 },
    undertaker:    { name: "Undertaker",     team: "townsfolk", ability: "Chaque nuit (sauf la 1re), tu apprends quel rôle a été exécuté aujourd'hui.", otherNight: 55 },
    monk:          { name: "Monk",           team: "townsfolk", ability: "Chaque nuit (sauf la 1re), protège un autre joueur du Démon.", otherNight: 12 },
    ravenkeeper:   { name: "Ravenkeeper",    team: "townsfolk", ability: "Si tu meurs la nuit, tu te réveilles et apprends le rôle d'un joueur.", otherNight: 41 },
    virgin:        { name: "Virgin",         team: "townsfolk", ability: "La 1re fois que tu es nommée, si le nominateur est un Townsfolk, il est exécuté immédiatement." },
    slayer:        { name: "Slayer",         team: "townsfolk", ability: "Une fois par partie, en public, désigne un joueur : si c'est le Démon, il meurt." },
    soldier:       { name: "Soldier",        team: "townsfolk", ability: "Tu es immunisé contre le Démon." },
    mayor:         { name: "Mayor",          team: "townsfolk", ability: "Si seuls 3 joueurs vivent et qu'aucune exécution n'a lieu, le Bien gagne." },
    butler:        { name: "Butler",         team: "outsider",  ability: "Chaque nuit, choisis ton maître. Tu ne peux voter que s'il vote.", firstNight: 39, otherNight: 56 },
    drunk:         { name: "Drunk",          team: "outsider",  ability: "Tu te crois être un Townsfolk, mais tu es ivre. Tes infos sont fausses." },
    recluse:       { name: "Recluse",        team: "outsider",  ability: "Tu peux apparaître comme Maléfique aux yeux d'autres rôles." },
    saint:         { name: "Saint",          team: "outsider",  ability: "Si tu es exécuté, le Mal gagne." },
    poisoner:      { name: "Poisoner",       team: "minion",    ability: "Chaque nuit, empoisonne un joueur : son pouvoir ne fonctionne pas.", firstNight: 17, otherNight: 8 },
    spy:           { name: "Spy",            team: "minion",    ability: "Chaque nuit, tu vois le Grimoire. Tu peux apparaître comme Bon.", firstNight: 48, otherNight: 67 },
    scarletwoman:  { name: "Scarlet Woman",  team: "minion",    ability: "S'il y a 5+ joueurs vivants et que le Démon meurt, tu deviens le Démon." },
    baron:         { name: "Baron",          team: "minion",    ability: "Il y a 2 Outsiders supplémentaires en jeu." },
    imp:           { name: "Imp",            team: "demon",     ability: "Chaque nuit (sauf la 1re), tue un joueur. Si tu te tues, un Minion devient l'Imp.", otherNight: 24 },
  },
};

// ─── Bad Moon Rising ───────────────────────────────────────────────────
const BAD_MOON_RISING: Script = {
  id: "bad-moon-rising",
  name: "Bad Moon Rising",
  author: "The Pandemonium Institute",
  description: "La mort rôde. Personne n'est en sécurité, même la nuit.",
  roles: {
    grandmother:   { name: "Grandmother",     team: "townsfolk", ability: "La 1re nuit, tu apprends un joueur Bon et son rôle. Si le Démon le tue, tu meurs aussi.", firstNight: 40 },
    sailor:        { name: "Sailor",          team: "townsfolk", ability: "Chaque nuit, choisis un joueur vivant : l'un de vous est ivre. Tu ne peux pas mourir.", firstNight: 14, otherNight: 4 },
    chambermaid:   { name: "Chambermaid",     team: "townsfolk", ability: "Chaque nuit, choisis 2 joueurs (pas toi) : combien se sont réveillés cette nuit.", firstNight: 49, otherNight: 68 },
    exorcist:      { name: "Exorcist",        team: "townsfolk", ability: "Chaque nuit (sauf la 1re), choisis un joueur différent : le Démon ne se réveille pas et te connaît.", otherNight: 18 },
    innkeeper:     { name: "Innkeeper",       team: "townsfolk", ability: "Chaque nuit (sauf la 1re), choisis 2 joueurs : ils sont protégés, mais l'un est ivre demain.", otherNight: 22 },
    gambler:       { name: "Gambler",         team: "townsfolk", ability: "Chaque nuit (sauf la 1re), devine le rôle d'un joueur. Faux = tu meurs.", otherNight: 33 },
    gossip:        { name: "Gossip",          team: "townsfolk", ability: "Chaque jour, déclaration publique. Si vraie, un Maléfique meurt cette nuit.", otherNight: 28 },
    courtier:      { name: "Courtier",        team: "townsfolk", ability: "Une fois par partie, choisis un rôle de nuit : ce joueur est ivre 3 jours et 3 nuits.", firstNight: 30, otherNight: 14 },
    professor:     { name: "Professor",       team: "townsfolk", ability: "Une fois par partie, choisis un mort : si Townsfolk, il revit.", otherNight: 38 },
    minstrel:      { name: "Minstrel",        team: "townsfolk", ability: "Si un Minion meurt par exécution, tous les autres sont ivres jusqu'au lendemain." },
    tealady:       { name: "Tea Lady",        team: "townsfolk", ability: "Si tes deux voisins vivants sont Bons, ils ne peuvent pas mourir." },
    pacifist:      { name: "Pacifist",        team: "townsfolk", ability: "Les Townsfolk Bons exécutés peuvent ne pas mourir." },
    fool:          { name: "Fool",            team: "townsfolk", ability: "La 1re fois que tu meurs, tu ne meurs pas." },
    goon:          { name: "Goon",            team: "outsider",  ability: "Le 1er joueur qui te cible la nuit change d'alignement." },
    lunatic:       { name: "Lunatic",         team: "outsider",  ability: "Tu te crois être le Démon, mais non. Le Démon connaît tes choix.", firstNight: 21, otherNight: 9 },
    tinker:        { name: "Tinker",          team: "outsider",  ability: "Tu peux mourir à n'importe quel moment.", otherNight: 70 },
    moonchild:     { name: "Moonchild",       team: "outsider",  ability: "Quand tu apprends ta mort, désigne un joueur : si Bon, il meurt cette nuit." },
    godfather:     { name: "Godfather",       team: "minion",    ability: "Tu apprends quels Outsiders sont en jeu. Si un Outsider meurt le jour, tue un joueur la nuit.", firstNight: 18, otherNight: 21 },
    devilsadvocate:{ name: "Devil's Advocate",team: "minion",    ability: "Chaque nuit, choisis un joueur différent : il survit à son exécution demain.", firstNight: 19, otherNight: 7 },
    assassin:      { name: "Assassin",        team: "minion",    ability: "Une fois par partie, la nuit, choisis un joueur : il meurt même protégé.", otherNight: 26 },
    mastermind:    { name: "Mastermind",      team: "minion",    ability: "Si le Démon est exécuté, le Mal a un jour de plus pour gagner." },
    zombuul:       { name: "Zombuul",         team: "demon",     ability: "Chaque nuit (sauf la 1re), si personne n'est mort le jour, tue un joueur. 1re mort : tu fais semblant.", otherNight: 23 },
    pukka:         { name: "Pukka",           team: "demon",     ability: "Chaque nuit, empoisonne un joueur : il meurt la nuit suivante. Tu en empoisonnes alors un autre.", firstNight: 26, otherNight: 25 },
    shabaloth:     { name: "Shabaloth",       team: "demon",     ability: "Chaque nuit (sauf la 1re), tue 2 joueurs. Une victime de la nuit dernière peut revivre.", otherNight: 27 },
    po:            { name: "Po",              team: "demon",     ability: "Chaque nuit (sauf la 1re), tu peux tuer un joueur. Si non, tue 3 joueurs la nuit suivante.", otherNight: 29 },
  },
};

// ─── Registre exporté ──────────────────────────────────────────────────
export const SCRIPTS: Record<string, Script> = {
  "trouble-brewing": TROUBLE_BREWING,
  "bad-moon-rising": BAD_MOON_RISING,
};

export const TEAM_COLORS: Record<Team, { bg: string; ring: string; text: string; label: string; accent: string }> = {
  townsfolk: { bg: "bg-stone-100",  ring: "ring-amber-700/40", text: "text-amber-950", label: "Townsfolk", accent: "bg-amber-700" },
  outsider:  { bg: "bg-stone-100",  ring: "ring-amber-700/40", text: "text-amber-950", label: "Outsider",  accent: "bg-amber-600" },
  minion:    { bg: "bg-red-950/80", ring: "ring-red-900",      text: "text-red-50",    label: "Minion",    accent: "bg-red-800" },
  demon:     { bg: "bg-red-950",    ring: "ring-red-700",      text: "text-red-50",    label: "Démon",     accent: "bg-red-700" },
};

export const getScriptList = () =>
  Object.values(SCRIPTS).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    roleCount: Object.keys(s.roles).length,
  }));
