"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { REMINDER_PRESETS, getReminderPreset } from "@/data/reminders";
import type { Player, GameAction } from "@/lib/types";

export function RemindersEditor({
  player,
  storytellerId,
  dispatch,
}: {
  player: Player;
  storytellerId: string;
  dispatch: (action: GameAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const add = (token: string) => {
    if (!token.trim()) return;
    dispatch({ type: "ADD_REMINDER", storytellerId, playerId: player.id, token });
    setCustom("");
    setOpen(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-700">
      <div className="flex items-center justify-between mb-2">
        <div className="text-stone-400 text-xs uppercase tracking-wider">Reminders</div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-stone-500 hover:text-stone-200 text-xs flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Ajouter
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {player.reminders.length === 0 && !open && (
          <span className="text-xs italic text-stone-600">Aucun token.</span>
        )}
        {player.reminders.map((tok, i) => {
          const preset = getReminderPreset(tok);
          return (
            <span
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-0.5 ring-1 text-[11px] ${
                preset?.badgeClass ?? "bg-stone-800 ring-stone-600 text-stone-300"
              }`}
            >
              {preset?.emoji ?? "•"} {preset?.label ?? tok}
              <button
                onClick={() => dispatch({ type: "REMOVE_REMINDER", storytellerId, playerId: player.id, index: i })}
                aria-label="Retirer"
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
      {open && (
        <div className="bg-stone-950/60 ring-1 ring-stone-700 p-2 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            {REMINDER_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => add(p.id)}
                className={`px-2 py-1 ring-1 text-[11px] text-left ${p.badgeClass}`}
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
              className="flex-1 px-2 py-1 bg-stone-900 ring-1 ring-stone-700 text-stone-100 text-xs"
            />
            <button
              onClick={() => add(custom)}
              disabled={!custom.trim()}
              className="px-2 ring-1 ring-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs disabled:opacity-40"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
