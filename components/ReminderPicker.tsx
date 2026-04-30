"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { REMINDER_PRESETS } from "@/data/reminders";
import type { GameAction, Player } from "@/lib/types";

export function ReminderPicker({
  player,
  storytellerId,
  dispatch,
  onClose,
}: {
  player: Player;
  storytellerId: string;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");

  const add = (token: string) => {
    if (!token.trim()) return;
    dispatch({ type: "ADD_REMINDER", storytellerId, playerId: player.id, token });
    setCustom("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 ring-1 ring-stone-700 max-w-sm w-full p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-stone-300 text-xs uppercase tracking-[0.2em]">
            Ajouter un reminder · {player.name}
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-200"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {REMINDER_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => add(p.id)}
              className={`px-2 py-1.5 ring-1 text-xs text-left ${p.badgeClass}`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add(custom)}
            placeholder="Texte libre…"
            className="flex-1 px-2 py-1.5 bg-stone-950 ring-1 ring-stone-700 text-stone-100 text-xs"
          />
          <button
            onClick={() => add(custom)}
            disabled={!custom.trim()}
            className="px-3 ring-1 ring-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs disabled:opacity-40"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
