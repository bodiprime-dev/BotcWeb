"use client";
import { BookOpen, Check, FlaskConical, Gavel, Moon, Skull, Sparkles, X } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import type { GameState, GameAction, Player, RoleInfoEntry } from "@/lib/types";
import { executionThreshold } from "@/lib/game";
import { useNightOrder } from "@/hooks/useNightOrder";
import { RoleIcon } from "./RoleIcon";
import { RoleInfoEditor } from "./RoleInfoEditor";
import { RoleChangePanel } from "./RoleChangePanel";
import { RemindersEditor } from "./RemindersEditor";

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
                  ? <Skull className="w-4 h-4 text-stone-300" />
                  : <Sparkles className="w-4 h-4 text-amber-400" />}
                {selected.alive ? "Tuer" : "Ressusciter"}
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

            {selected.role && script.roles[selected.role]?.team === "traveler" && selected.alive && (
              <button
                onClick={() => dispatch({ type: "EXILE_TRAVELER", storytellerId: meId, playerId: selected.id })}
                className="mt-3 w-full p-2 ring-1 ring-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-200 text-xs uppercase tracking-wide"
              >
                Exiler ce Voyageur
              </button>
            )}

            <RemindersEditor player={selected} storytellerId={meId} dispatch={dispatch} />

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

        {game.nominee && (() => {
          const nomineeP = game.players.find(p => p.id === game.nominee);
          const nominatorP = game.nominator ? game.players.find(p => p.id === game.nominator) : null;
          const yesVoters = game.players.filter(p => game.votes[p.id] === true);
          const noVoters = game.players.filter(p => game.votes[p.id] === false);
          const yesCount = yesVoters.length;
          const threshold = executionThreshold(game);
          const reaches = yesCount >= threshold;
          const livingNonGM = game.players.filter(p => !p.isStoryteller && p.alive);
          const pending = livingNonGM.filter(p => game.votes[p.id] === undefined);
          return (
            <div className="bg-orange-950/50 ring-1 ring-orange-800 p-3">
              <div className="text-orange-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Gavel className="w-3 h-3" /> Nomination en cours
              </div>
              <div className="text-stone-100 mb-2">
                {nominatorP ? <span className="text-stone-400">{nominatorP.name} → </span> : null}
                <span className="font-medium">{nomineeP?.name}</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-2xl font-bold ${reaches ? "text-amber-300" : "text-stone-300"}`}>{yesCount}</span>
                <span className="text-stone-500 text-xs">/ {threshold} oui requis</span>
                {pending.length > 0 && (
                  <span className="text-stone-500 text-xs ml-auto">{pending.length} en attente</span>
                )}
              </div>
              {(yesVoters.length > 0 || noVoters.length > 0) && (
                <div className="space-y-1 mb-3 text-xs">
                  {yesVoters.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                      <span className="text-stone-300">{yesVoters.map(p => p.name).join(", ")}</span>
                    </div>
                  )}
                  {noVoters.length > 0 && (
                    <div className="flex items-start gap-1.5">
                      <X className="w-3 h-3 text-stone-500 mt-0.5 flex-shrink-0" />
                      <span className="text-stone-500">{noVoters.map(p => p.name).join(", ")}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => dispatch({ type: "RESOLVE_NOMINATION", storytellerId: meId, execute: true })}
                  disabled={!reaches}
                  className={`p-2 ring-1 text-xs uppercase tracking-wide transition-all ${
                    reaches
                      ? "bg-red-900 ring-red-700 text-red-100 hover:bg-red-800"
                      : "bg-stone-900 ring-stone-700 text-stone-600 cursor-not-allowed"
                  }`}
                >
                  Exécuter
                </button>
                <button
                  onClick={() => dispatch({ type: "RESOLVE_NOMINATION", storytellerId: meId, execute: false })}
                  className="p-2 ring-1 ring-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs uppercase tracking-wide"
                >
                  Clore (sans exéc.)
                </button>
              </div>
              <button
                onClick={() => dispatch({ type: "CLEAR_NOMINATION", storytellerId: meId })}
                className="text-orange-400/80 text-xs underline mt-2 block"
              >
                Annuler la nomination
              </button>
            </div>
          );
        })()}

        {game.nominationsToday.length > 0 && (
          <div className="bg-stone-900 ring-1 ring-stone-700 p-3">
            <div className="text-stone-400 text-xs uppercase tracking-wider mb-2">
              Nominations du jour {game.day}
            </div>
            <ol className="space-y-1">
              {game.nominationsToday.map((n, i) => {
                const nor = game.players.find(p => p.id === n.nominatorId);
                const nee = game.players.find(p => p.id === n.nomineeId);
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-stone-600 w-4">{i + 1}.</span>
                    <span className="text-stone-400">{nor?.name ?? "?"}</span>
                    <span className="text-stone-600">→</span>
                    <span className={n.executed ? "text-red-300 line-through" : "text-stone-200"}>
                      {nee?.name ?? "?"}
                    </span>
                    <span className="ml-auto text-stone-500">{n.yesCount} oui</span>
                    {n.executed && <Skull className="w-3 h-3 text-red-400" />}
                  </li>
                );
              })}
            </ol>
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
                  const done = game.nightDone.includes(player.id);
                  return (
                    <li
                      key={player.id}
                      className={`flex items-center gap-2 transition-opacity ${done ? "opacity-40" : ""}`}
                    >
                      <button
                        onClick={() => dispatch({ type: "TOGGLE_NIGHT_DONE", storytellerId: meId, playerId: player.id })}
                        aria-label={done ? "Marquer non fait" : "Marquer fait"}
                        className={`w-5 h-5 ring-1 flex items-center justify-center flex-shrink-0 transition-all ${
                          done
                            ? "bg-emerald-700 ring-emerald-500 text-emerald-50"
                            : "bg-stone-800 ring-stone-600 hover:bg-stone-700 text-stone-400"
                        }`}
                      >
                        {done ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                      </button>
                      <RoleIcon roleId={player.role!} size={24} className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${tc.text} ${done ? "line-through" : ""}`}>
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
