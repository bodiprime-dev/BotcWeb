import { SCRIPTS, type Role } from "@/data/scripts";
import type { GameState, Player } from "@/lib/types";

export interface NightOrderEntry {
  player: Player;
  realRole: Role;
  order: number;
}

export function useNightOrder(game: GameState): NightOrderEntry[] {
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const isFirstNight = game.day === 1;

  const entries: NightOrderEntry[] = [];
  for (const p of game.players) {
    if (p.isStoryteller || !p.alive || !p.role) continue;
    const realRoleId = p.role;
    const displayRoleId = p.displayRole || p.role;
    const orderRoleId = (realRoleId === "drunk" || realRoleId === "lunatic") ? displayRoleId : realRoleId;
    const orderRole = ROLES[orderRoleId];
    if (!orderRole) continue;
    const order = isFirstNight ? orderRole.firstNight : orderRole.otherNight;
    if (order == null) continue;
    entries.push({ player: p, realRole: ROLES[realRoleId], order });
  }
  return entries.sort((a, b) => a.order - b.order);
}
