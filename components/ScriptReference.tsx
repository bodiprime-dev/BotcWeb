"use client";
import { useState } from "react";
import { BookOpen, X, ChevronDown, ChevronUp } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import { RoleIcon } from "./RoleIcon";

export function ScriptReference({
  scriptId,
  onClose,
}: {
  scriptId: string;
  onClose: () => void;
}) {
  const script = SCRIPTS[scriptId];
  const [expanded, setExpanded] = useState<string | null>(null);
  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon", "traveler"];
  const teamLabels: Record<Team, string> = {
    townsfolk: "Townsfolk",
    outsider: "Outsiders",
    minion: "Minions",
    demon: "Démon",
    traveler: "Voyageurs",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2 text-amber-400 text-sm uppercase tracking-[0.2em]">
          <BookOpen className="w-4 h-4" /> {script.name}
        </div>
        <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-100">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {teamOrder.map(team => {
          const roles = Object.entries(script.roles).filter(([, r]) => r.team === team);
          if (!roles.length) return null;
          const tc = TEAM_COLORS[team];
          return (
            <div key={team} className="mt-6">
              <div className={`text-xs uppercase tracking-[0.3em] mb-3 ${tc.text} opacity-80`}>
                {teamLabels[team]}
              </div>
              <div className="space-y-2">
                {roles.map(([id, role]) => {
                  const open = expanded === id;
                  return (
                    <div
                      key={id}
                      className={`ring-1 transition-all cursor-pointer ${
                        open ? `bg-stone-800/70 ${tc.ring}` : "bg-stone-900 ring-stone-800"
                      }`}
                      onClick={() => setExpanded(open ? null : id)}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <RoleIcon roleId={id} size={32} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm italic ${open ? tc.text : "text-stone-200"}`}>
                            {role.name}
                          </span>
                          {!open && (
                            <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{role.ability}</p>
                          )}
                        </div>
                        {open ? (
                          <ChevronUp className="w-3 h-3 text-stone-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-stone-500 flex-shrink-0" />
                        )}
                      </div>
                      {open && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-stone-300 text-sm leading-relaxed">{role.ability}</p>
                          {(role.firstNight || role.otherNight) && (
                            <div className="mt-2 flex gap-3 text-xs text-stone-500">
                              {role.firstNight && <span>1ère nuit : #{role.firstNight}</span>}
                              {role.otherNight && <span>Autres nuits : #{role.otherNight}</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
