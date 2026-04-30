// Reminder tokens préset (BotC). Liste manipulée par le Conteur uniquement.
// La forme est libre côté reducer ; ces presets ne servent qu'à l'UI.

export interface ReminderPreset {
  id: string;        // valeur stockée
  label: string;     // libellé affiché
  emoji?: string;
  badgeClass?: string; // tailwind classes pour la pastille
}

export const REMINDER_PRESETS: ReminderPreset[] = [
  { id: "drunk",       label: "Ivre",        emoji: "🍺", badgeClass: "bg-amber-900 ring-amber-700 text-amber-200" },
  { id: "protected",   label: "Protégé",     emoji: "🛡️", badgeClass: "bg-blue-900 ring-blue-700 text-blue-200" },
  { id: "mad",         label: "Folie",       emoji: "🌀", badgeClass: "bg-fuchsia-900 ring-fuchsia-700 text-fuchsia-200" },
  { id: "used",        label: "Utilisée",    emoji: "✓",  badgeClass: "bg-stone-800 ring-stone-600 text-stone-300" },
  { id: "red-herring", label: "Red Herring", emoji: "🐟", badgeClass: "bg-rose-900 ring-rose-700 text-rose-200" },
  { id: "master",      label: "Maître",      emoji: "🎩", badgeClass: "bg-indigo-900 ring-indigo-700 text-indigo-200" },
  { id: "no-ability",  label: "Sans capacité", emoji: "✗", badgeClass: "bg-stone-800 ring-stone-600 text-stone-400" },
  { id: "is-the-demon",label: "Devient Démon", emoji: "😈", badgeClass: "bg-red-900 ring-red-700 text-red-200" },
];

export function getReminderPreset(id: string): ReminderPreset | null {
  return REMINDER_PRESETS.find(r => r.id === id) ?? null;
}
