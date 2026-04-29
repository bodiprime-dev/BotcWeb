"use client";
import { useState } from "react";
import { ArrowLeft, BookOpen, Eye, EyeOff, Gavel, Moon, Skull, Sun, Users } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import type { GameState, GameAction, Player } from "@/lib/types";
import { RoleIcon } from "./RoleIcon";
import { RoleInfoDisplay } from "./RoleInfoDisplay";
import { ScriptReference } from "./ScriptReference";

export function PlayerView({
  game,
  me,
  dispatch,
  onLeave,
}: {
  game: GameState;
  me: Player;
  dispatch: (action: GameAction) => void;
  onLeave?: () => void;
}) {
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const others = game.players.filter(p => p.id !== me.id && !p.isStoryteller);
  const [revealed, setRevealed] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const displayRoleId = me.displayRole || me.role!;
  const myRole = ROLES[displayRoleId];
  const team = TEAM_COLORS[myRole.team as Team];

  return (
    <div className="min-h-screen p-6">
      {showScript && <ScriptReference scriptId={game.scriptId} onClose={() => setShowScript(false)} />}

      <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
        {onLeave ? (
          <button onClick={onLeave} className="flex items-center gap-2 text-stone-400 hover:text-stone-200">
            <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Quitter</span>
          </button>
        ) : (
          <div className="text-stone-500 text-xs tracking-[0.3em]">{game.code}</div>
        )}
        <div className="flex items-center gap-2 text-stone-500 text-xs uppercase">
          {game.phase === "day" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          {game.phase === "day" ? "Jour" : "Nuit"} {game.day}
        </div>
        {onLeave && (
          <div className="text-stone-500 text-xs tracking-[0.3em]">{game.code}</div>
        )}
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-stone-900/90 text-stone-100 p-8 ring-1 ring-amber-900/40 mb-4">
          <div className="text-center">
            <div className="text-xs uppercase text-stone-400 mb-1">
              Bonjour {me.name}, ton rôle est
            </div>
            {revealed ? (
              <>
                <div className="my-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/60 ring-1 ring-amber-800/40 text-amber-200/80 text-[10px] uppercase tracking-[0.3em]">
                    <span className="w-1 h-1 bg-amber-500/70 rounded-full" />{team.label}
                  </div>
                </div>
                <div className="flex justify-center mb-3">
                  <RoleIcon roleId={displayRoleId} size={96} />
                </div>
                <h2 className="text-5xl mb-4 italic text-amber-100">{myRole.name}</h2>
                <div className="text-left max-w-md mx-auto bg-stone-950/60 ring-1 ring-stone-700 p-4 mb-4">
                  <div className="text-xs uppercase text-amber-500/70 tracking-wider mb-2">Capacité</div>
                  <p className="text-stone-200 leading-relaxed text-sm">{myRole.ability}</p>
                </div>
                {(myRole.firstNight || myRole.otherNight) && (
                  <div className="max-w-md mx-auto text-xs text-stone-500 flex gap-4 justify-center mb-4">
                    {myRole.firstNight && <span>1ère nuit : #{myRole.firstNight}</span>}
                    {myRole.otherNight && <span>Autres nuits : #{myRole.otherNight}</span>}
                  </div>
                )}
                <RoleInfoDisplay
                  roleInfo={me.roleInfo ?? []}
                  players={game.players}
                  scriptId={game.scriptId}
                />
                <button
                  onClick={() => setRevealed(false)}
                  className="mt-4 text-xs uppercase text-stone-400 hover:text-stone-100 inline-flex items-center gap-2"
                >
                  <EyeOff className="w-3 h-3" /> Cacher
                </button>
              </>
            ) : (
              <button onClick={() => setRevealed(true)} className="my-12">
                <div className="w-32 h-32 mx-auto bg-stone-800 ring-2 ring-stone-600 flex items-center justify-center hover:bg-stone-700 transition-all">
                  <Eye className="w-12 h-12 text-stone-300" strokeWidth={1.2} />
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.3em] text-stone-400">Toucher pour révéler</div>
              </button>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowScript(true)}
          className="w-full flex items-center justify-center gap-2 p-3 mb-6 bg-stone-900 ring-1 ring-stone-700 text-stone-400 hover:text-stone-200 hover:ring-stone-500 text-xs uppercase tracking-[0.2em] transition-all"
        >
          <BookOpen className="w-3 h-3" /> Voir tous les rôles du script
        </button>

        <div className="mb-6">
          <h3 className="text-stone-400 text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" /> La place du village
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {others.map(p => (
              <button
                key={p.id}
                onClick={() => game.phase === "day" && p.alive && dispatch({ type: "NOMINATE", nominatorId: me.id, nomineeId: p.id })}
                disabled={!p.alive || game.phase !== "day"}
                className={`p-3 ring-1 transition-all ${
                  p.alive ? "bg-stone-900 ring-stone-700 hover:ring-stone-500" : "bg-stone-950 ring-stone-800 opacity-40"
                } ${game.nominee === p.id ? "ring-orange-500 bg-orange-950/40" : ""}`}
              >
                <div
                  className="aspect-square rounded-full bg-stone-800 ring-1 ring-stone-700 flex items-center justify-center mb-2 mx-auto"
                  style={{ width: 48, height: 48 }}
                >
                  {p.alive
                    ? <span className="text-stone-300 text-lg">{p.name[0]}</span>
                    : <Skull className="w-5 h-5 text-stone-600" />}
                </div>
                <div className="text-center text-xs text-stone-300">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {game.nominee && (
          <div className="bg-orange-950/40 ring-1 ring-orange-800 p-4 text-center">
            <Gavel className="w-4 h-4 inline mr-2 text-orange-300" />
            <span className="text-stone-200 text-sm">
              Nomination :{" "}
              <span className="text-orange-300 font-bold">
                {game.players.find(p => p.id === game.nominee)?.name}
              </span>
            </span>
          </div>
        )}
        {game.phase === "night" && !game.nominee && (
          <div className="bg-indigo-950/40 ring-1 ring-indigo-800/40 p-4 text-center text-indigo-100/80 text-sm italic">
            La nuit tombe. Ferme les yeux et attends le Conteur…
          </div>
        )}
      </div>
    </div>
  );
}
