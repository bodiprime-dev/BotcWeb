"use client";
import { FlaskConical, Gavel, Skull } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import { getReminderPreset } from "@/data/reminders";
import type { GameState } from "@/lib/types";
import { useWindowSize } from "@/hooks/useWindowSize";
import { RoleIcon } from "./RoleIcon";

export function Grimoire({
  game,
  selectedId,
  onSelectPlayer,
  panelOpen,
}: {
  game: GameState;
  selectedId: string | null;
  onSelectPlayer: (id: string | null) => void;
  panelOpen: boolean;
}) {
  const { vw, vh } = useWindowSize();
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const playable = game.players.filter(p => !p.isStoryteller);

  // Ellipse : ry limité par la hauteur, rx exploite toute la largeur (max 2×ry)
  const availW = panelOpen ? Math.max(vw - 360, 200) : vw - 32;
  const availH = vh - 200;
  const ry = Math.max(90, Math.min(playable.length * 28, availH * 0.42));
  const iconBox = Math.max(60, Math.min(96, Math.round(ry * 0.42 + 22)));
  const iconSize = Math.round(iconBox * 0.65);
  const rx = Math.min(Math.floor((availW - iconBox - 48) / 2), Math.round(ry * 2.0));
  const cx = rx + iconBox / 2 + 24;
  const cy = ry + iconBox / 2 + 24;
  const totalW = Math.round(cx * 2);
  const totalH = Math.round(cy * 2);

  return (
    <div className="relative" style={{ width: totalW, height: totalH, maxWidth: "100%" }}>
      <div
        className="absolute rounded-full ring-1 ring-stone-700/40"
        style={{ left: Math.round(totalW * 0.1), right: Math.round(totalW * 0.1), top: Math.round(totalH * 0.1), bottom: Math.round(totalH * 0.1) }}
      />
      <div
        className="absolute rounded-full ring-1 ring-stone-800/40"
        style={{ left: Math.round(totalW * 0.18), right: Math.round(totalW * 0.18), top: Math.round(totalH * 0.18), bottom: Math.round(totalH * 0.18) }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Skull className="w-10 h-10 text-stone-700" strokeWidth={1.2} />
      </div>

      {playable.map((p, i) => {
        const angle = (i / playable.length) * 2 * Math.PI - Math.PI / 2;
        const half = iconBox / 2;
        const x = cx + rx * Math.cos(angle) - half;
        const y = cy + ry * Math.sin(angle) - half;
        const role = ROLES[p.role!];
        const team = TEAM_COLORS[role.team as Team];
        const isNominee = game.nominee === p.id;
        const isDrunk = p.role === "drunk";

        return (
          <button
            key={p.id}
            onClick={() => onSelectPlayer(p.id === selectedId ? null : p.id)}
            className="absolute"
            style={{ left: x, top: y }}
          >
            <div
              style={{ width: iconBox, height: iconBox }}
              className={`rounded-full ${team.bg} ring-2 flex flex-col items-center justify-center transition-all relative ${
                selectedId === p.id ? "scale-110 ring-amber-400"
                : isNominee ? "ring-orange-400"
                : team.ring
              } ${!p.alive ? "opacity-40 grayscale" : ""}`}
            >
              <RoleIcon roleId={p.role!} size={iconSize} />
              <div className={`text-[8px] font-medium ${team.text} px-1 text-center leading-tight`}>
                {role.name}{isDrunk ? " 🍺" : ""}
              </div>
              {!p.alive && (
                <div className="absolute inset-0 rounded-full bg-stone-900/70 flex items-center justify-center">
                  <Skull className="w-6 h-6 text-stone-500" />
                </div>
              )}
              {!p.alive && (
                <div
                  title={p.ghostVoteUsed ? "Vote fantôme déjà utilisé" : "Vote fantôme disponible"}
                  className={`absolute -bottom-1 -left-1 w-4 h-4 rounded-full ring-1 flex items-center justify-center text-[9px] font-bold ${
                    p.ghostVoteUsed
                      ? "bg-stone-800 ring-stone-700 text-stone-600"
                      : "bg-purple-900 ring-purple-600 text-purple-100"
                  }`}
                >
                  V
                </div>
              )}
              {p.poisoned && p.alive && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-purple-800 ring-1 ring-purple-600 flex items-center justify-center">
                  <FlaskConical className="w-2.5 h-2.5 text-purple-200" />
                </div>
              )}
              {isNominee && p.alive && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-800 ring-1 ring-orange-600 flex items-center justify-center">
                  <Gavel className="w-2.5 h-2.5 text-orange-200" />
                </div>
              )}
            </div>
            <div className="text-center mt-1 text-stone-200 text-xs">{p.name}</div>
            {p.reminders.length > 0 && (
              <div className="flex flex-wrap gap-0.5 justify-center mt-0.5 max-w-[110px]">
                {p.reminders.map((tok, ri) => {
                  const pr = getReminderPreset(tok);
                  return (
                    <span
                      key={ri}
                      title={pr?.label ?? tok}
                      className={`inline-block px-1 py-px ring-1 text-[8px] leading-tight ${
                        pr?.badgeClass ?? "bg-stone-800 ring-stone-600 text-stone-300"
                      }`}
                    >
                      {pr?.emoji ?? ""}{pr ? "" : tok.slice(0, 6)}
                    </span>
                  );
                })}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
