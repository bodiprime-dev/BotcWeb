"use client";
import { BookOpen, FlaskConical, Gavel, Moon, Skull, Sparkles, X } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import type { GameState, GameAction, Player, RoleInfoEntry } from "@/lib/types";
import { useNightOrder } from "@/hooks/useNightOrder";
import { RoleIcon } from "./RoleIcon";
import { RoleInfoEditor } from "./RoleInfoEditor";
import { RoleChangePanel } from "./RoleChangePanel";

export function StorytellerDrawer({
  game,
  selected,
  dispatch,
  open,
  onClose,
  meId,
}: {
  game: GameState;
  selected: Player | undefined;
  dispatch: (action: GameAction) => void;
  open: boolean;
  onClose: () => void;
  meId: string;
}) {
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const nightOrder = useNightOrder(game);

  return (
    <aside
      aria-hidden={!open}
      className={`fixed inset-y-0 right-0 w-full sm:max-w-sm z-30 bg-stone-950/95 backdrop-blur-md ring-1 ring-stone-800 overflow-y-auto transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-stone-800 sticky top-0 bg-stone-950/95 backdrop-blur-md z-10"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
      >
        <div className="text-stone-400 text-xs uppercase tracking-[0.2em]">Panneau</div>
        <button
          onClick={onClose}
          aria-label="Fermer le panneau"
          className="text-stone-300 hover:text-stone-100 p-2 -mr-1 ring-1 ring-stone-700 hover:ring-stone-500 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {selected ? (
          <div className="bg-stone-900 text-stone-100 p-4 ring-1 ring-amber-900/40">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs uppercase text-stone-400">Joueur</div>
                <div className="text-2xl text-stone-100">{selected.name}</div>
                {selected.role === "drunk" && (
                  <div className="text-xs text-amber-300 mt-0.5">
                    🍺 Drunk — pense être {ROLES[selected.displayRole!]?.name}
                  </div>
                )}
              </div>
              <button onClick={onClose} className="text-stone-400 hover:text-stone-100 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t border-stone-700 pt-3 mb-3">
              <div className="flex items-start gap-3">
                <RoleIcon roleId={selected.role!} size={56} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${TEAM_COLORS[ROLES[selected.role!].team as Team].accent}`} />
                    <span className="text-xs uppercase text-stone-300">
                      {TEAM_COLORS[ROLES[selected.role!].team as Team].label}
                    </span>
                  </div>
                  <div className={`text-lg italic mb-1 ${TEAM_COLORS[ROLES[selected.role!].team as Team].text}`}>
                    {ROLES[selected.role!].name}
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">{ROLES[selected.role!].ability}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => dispatch({ type: "TOGGLE_ALIVE", playerId: selected.id, storytellerId: meId })}
                className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide transition-all ${
                  !selected.alive
                    ? "bg-stone-800 ring-stone-600 text-stone-300"
                    : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-stone-700"
                }`}
              >
                {selected.alive
                  ? <Sparkles className="w-4 h-4 text-amber-400" />
                  : <Skull className="w-4 h-4 text-stone-400" />}
                {selected.alive ? "Tuer" : "Vivant"}
              </button>
              <button
                onClick={() => selected.alive && dispatch({ type: "TOGGLE_POISON", playerId: selected.id, storytellerId: meId })}
                disabled={!selected.alive}
                className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide transition-all disabled:opacity-40 ${
                  selected.poisoned
                    ? "bg-purple-900 ring-purple-700 text-purple-200"
                    : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-purple-900/40"
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                {selected.poisoned ? "Empoisonné" : "Empoisonner"}
              </button>
              <button
                onClick={() => selected.alive && dispatch({
                  type: "SET_NOMINEE",
                  playerId: game.nominee === selected.id ? null : selected.id,
                  storytellerId: meId,
                })}
                disabled={!selected.alive}
                className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide transition-all disabled:opacity-40 ${
                  game.nominee === selected.id
                    ? "bg-orange-900 ring-orange-700 text-orange-200"
                    : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-orange-900/40"
                }`}
              >
                <Gavel className="w-4 h-4" />
                {game.nominee === selected.id ? "Nominé" : "Nominer"}
              </button>
            </div>

            <RoleChangePanel
              currentRoleId={selected.role!}
              scriptId={game.scriptId}
              onSelect={roleId => dispatch({ type: "SET_PLAYER_ROLE", storytellerId: meId, playerId: selected.id, roleId })}
            />
            <RoleInfoEditor
              player={selected}
              allPlayers={game.players}
              scriptId={game.scriptId}
              onSave={roleInfo => dispatch({ type: "SET_ROLE_INFO", storytellerId: meId, playerId: selected.id, roleInfo: roleInfo as RoleInfoEntry[] })}
            />
          </div>
        ) : (
          <div className="bg-stone-900 text-stone-300 p-4 ring-1 ring-stone-700 text-center">
            <BookOpen className="w-7 h-7 mx-auto mb-2 text-stone-500" />
            <p className="text-sm italic text-stone-500">Touche un joueur pour le gérer</p>
          </div>
        )}

        {game.nominee && (
          <div className="bg-orange-950/50 ring-1 ring-orange-800 p-3">
            <div className="text-orange-300 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Gavel className="w-3 h-3" /> Nomination en cours
            </div>
            <div className="text-stone-100 font-medium">
              {game.players.find(p => p.id === game.nominee)?.name}
            </div>
            <button
              onClick={() => dispatch({ type: "CLEAR_NOMINATION", storytellerId: meId })}
              className="text-orange-400 text-xs underline mt-1"
            >
              Annuler
            </button>
          </div>
        )}

        {game.phase === "night" && (
          <div className="bg-indigo-950/60 ring-1 ring-indigo-900 p-4">
            <div className="text-indigo-300 text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
              <Moon className="w-3 h-3" /> Ordre de la nuit {game.day}
            </div>
            {nightOrder.length === 0 ? (
              <p className="text-stone-500 text-xs italic">Aucune action cette nuit.</p>
            ) : (
              <ol className="space-y-2">
                {nightOrder.map(({ player, realRole }, i) => {
                  const tc = TEAM_COLORS[realRole.team as Team];
                  const isDrunk = player.role === "drunk";
                  return (
                    <li key={player.id} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full ${tc.accent} text-stone-50 text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
                        {i + 1}
                      </span>
                      <RoleIcon roleId={player.role!} size={24} className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${tc.text}`}>
                          {realRole.name}{isDrunk ? " 🍺" : ""}
                        </div>
                        <div className="text-stone-400 text-xs">{player.name}</div>
                      </div>
                      {(player.poisoned || isDrunk) && (
                        <FlaskConical className="w-3 h-3 text-purple-400 flex-shrink-0" />
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
