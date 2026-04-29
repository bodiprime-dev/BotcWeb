"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Eye, Moon, PanelRightClose, PanelRightOpen, Sun } from "lucide-react";
import type { GameState, GameAction, Player, RoleInfoEntry } from "@/lib/types";
import { Grimoire } from "./Grimoire";
import { StorytellerDrawer } from "./StorytellerDrawer";
import { ScriptReference } from "./ScriptReference";
import { RoleRevealModal } from "./RoleRevealModal";

export function StorytellerView({
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const selected = game.players.find(p => p.id === selectedId);

  useEffect(() => { if (selectedId) setPanelOpen(true); }, [selectedId]);
  useEffect(() => { if (game.phase === "night") setPanelOpen(true); }, [game.phase]);

  const closePanel = () => { setSelectedId(null); setPanelOpen(false); };

  return (
    <div className="min-h-[100dvh] px-2 sm:px-4 pb-6 pt-3 flex flex-col">
      {showScript && <ScriptReference scriptId={game.scriptId} onClose={() => setShowScript(false)} />}
      {showRoleReveal && (
        <RoleRevealModal
          scriptId={game.scriptId}
          allPlayers={game.players}
          onClose={() => setShowRoleReveal(false)}
          onAddInfo={(playerId, entry) => {
            const player = game.players.find(p => p.id === playerId);
            if (!player) return;
            dispatch({
              type: "SET_ROLE_INFO",
              storytellerId: me.id,
              playerId,
              roleInfo: [...player.roleInfo, entry] as RoleInfoEntry[],
            });
          }}
        />
      )}

      <div className="flex items-center justify-between mb-4 max-w-7xl w-full mx-auto gap-2">
        {onLeave ? (
          <button onClick={onLeave} className="flex items-center gap-2 text-stone-400 hover:text-stone-200">
            <ArrowLeft className="w-4 h-4" /> <span className="text-sm hidden sm:inline">Quitter</span>
          </button>
        ) : (
          <div className="text-stone-500 text-xs tracking-[0.2em] uppercase hidden md:block">
            Conteur · {game.code}
          </div>
        )}
        {onLeave && (
          <div className="text-stone-500 text-xs tracking-[0.2em] uppercase hidden md:block">
            Conteur · {game.code}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowScript(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider"
          >
            <BookOpen className="w-3 h-3" /> <span className="hidden sm:inline">Rôles</span>
          </button>
          <button
            onClick={() => setShowRoleReveal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider"
          >
            <Eye className="w-3 h-3" /> <span className="hidden sm:inline">Révéler</span>
          </button>
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase hidden sm:block">
            {game.phase === "day" ? "Jour" : "Nuit"} {game.day}
          </div>
          <button
            onClick={() => dispatch({ type: "TOGGLE_PHASE", storytellerId: me.id })}
            className={`flex items-center gap-2 px-4 py-2 ring-1 ${
              game.phase === "day"
                ? "bg-amber-900/30 ring-amber-700/50 text-amber-100"
                : "bg-indigo-950 ring-indigo-800 text-indigo-100"
            }`}
          >
            {game.phase === "day" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm">{game.phase === "day" ? "Jour" : "Nuit"}</span>
          </button>
          <button
            onClick={() => setPanelOpen(o => !o)}
            aria-label={panelOpen ? "Fermer le panneau" : "Ouvrir le panneau"}
            className={`flex items-center justify-center w-10 h-10 ring-1 transition-all ${
              panelOpen
                ? "bg-amber-950/40 ring-amber-700/50 text-amber-200"
                : "bg-stone-900 ring-stone-700 text-stone-400 hover:text-stone-200"
            }`}
          >
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 text-stone-400 text-xs tracking-[0.3em] uppercase">
            <BookOpen className="w-3 h-3" /> Grimoire
          </div>
        </div>
        <Grimoire
          game={game}
          selectedId={selectedId}
          onSelectPlayer={setSelectedId}
          panelOpen={panelOpen}
        />
      </div>

      {panelOpen && (
        <div
          onClick={closePanel}
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] transition-opacity"
          aria-hidden
        />
      )}

      <StorytellerDrawer
        game={game}
        selected={selected}
        dispatch={dispatch}
        open={panelOpen}
        onClose={closePanel}
        meId={me.id}
      />
    </div>
  );
}
