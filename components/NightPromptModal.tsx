"use client";
import { useState } from "react";
import { Check, Moon, X } from "lucide-react";
import type { GameState, GameAction, Player } from "@/lib/types";

export function NightPromptModal({
  game,
  me,
  dispatch,
}: {
  game: GameState;
  me: Player;
  dispatch: (action: GameAction) => void;
}) {
  const prompt = me.nightPrompt;
  const submitted = me.nightSubmission;
  const [picked, setPicked] = useState<string[]>([]);

  if (!prompt) return null;

  const targets = game.players.filter(p => !p.isStoryteller && p.id !== me.id);

  const togglePick = (id: string) => {
    if (prompt.kind !== "pick") return;
    setPicked(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= prompt.max) {
        // Si max=1, on remplace ; sinon on bloque
        if (prompt.max === 1) return [id];
        return prev;
      }
      return [...prev, id];
    });
  };

  const submit = () => {
    if (prompt.kind === "ack") {
      dispatch({ type: "SUBMIT_NIGHT_PROMPT", playerId: me.id, targetIds: [] });
    } else {
      if (picked.length < prompt.min || picked.length > prompt.max) return;
      dispatch({ type: "SUBMIT_NIGHT_PROMPT", playerId: me.id, targetIds: picked });
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-stone-900 ring-1 ring-indigo-700/60 max-w-md w-full p-6 text-center">
          <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <div className="text-stone-100 text-lg mb-1">Réponse envoyée</div>
          <div className="text-stone-400 text-sm">
            En attente du Conteur…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-stone-900 ring-1 ring-indigo-700/60 max-w-md w-full p-6">
        <div className="flex items-center gap-2 text-indigo-300 text-xs uppercase tracking-[0.3em] mb-3">
          <Moon className="w-3 h-3" /> Le Conteur te demande
        </div>
        <div className="text-stone-100 text-lg mb-4">{prompt.label}</div>

        {prompt.kind === "ack" ? (
          <button
            onClick={submit}
            className="w-full p-3 bg-indigo-900 ring-1 ring-indigo-700 hover:bg-indigo-800 text-stone-100 uppercase tracking-wide text-sm"
          >
            J'ai compris
          </button>
        ) : (
          <>
            <div className="text-xs text-stone-400 mb-3">
              Choisis {prompt.min === prompt.max ? prompt.min : `${prompt.min} à ${prompt.max}`} joueur(s)
              {" • "}
              <span className={picked.length >= prompt.min && picked.length <= prompt.max ? "text-emerald-400" : "text-stone-500"}>
                {picked.length} sélectionné{picked.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4 max-h-72 overflow-y-auto">
              {targets.map(p => {
                const sel = picked.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePick(p.id)}
                    disabled={!p.alive && prompt.kind === "pick"}
                    className={`p-2 ring-1 text-sm transition-all ${
                      sel
                        ? "bg-amber-900 ring-amber-600 text-amber-100"
                        : "bg-stone-800 ring-stone-700 text-stone-300 hover:ring-stone-500"
                    } ${!p.alive ? "opacity-40" : ""}`}
                  >
                    {p.name}
                    {!p.alive && <div className="text-[10px] text-stone-500">mort</div>}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPicked([])}
                className="p-2 ring-1 ring-stone-700 text-stone-400 hover:text-stone-200 text-xs uppercase"
              >
                <X className="w-3 h-3 inline mr-1" /> Effacer
              </button>
              <button
                onClick={submit}
                disabled={picked.length < prompt.min || picked.length > prompt.max}
                className="p-2 ring-1 bg-indigo-900 ring-indigo-700 hover:bg-indigo-800 disabled:bg-stone-900 disabled:text-stone-600 disabled:ring-stone-800 text-stone-100 uppercase text-xs"
              >
                <Check className="w-3 h-3 inline mr-1" /> Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
