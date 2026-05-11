"use client";
import { useState } from "react";
import { BookOpen, X, ChevronDown, ChevronUp } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, TEAM_DESCRIPTIONS, type Team } from "@/data/scripts";
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
    minion: "Sbires (Minions)",
    demon: "Démon",
    traveler: "Voyageurs",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <div className="flex items-center gap-2 text-amber-400 text-base uppercase tracking-[0.2em] font-display">
          <BookOpen className="w-5 h-5" /> {script.name}
        </div>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="p-2 text-stone-300 hover:text-stone-100"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-10 max-w-2xl w-full mx-auto">
        {teamOrder.map(team => {
          const roles = Object.entries(script.roles).filter(([, r]) => r.team === team);
          if (!roles.length) return null;
          const tc = TEAM_COLORS[team];
          const desc = TEAM_DESCRIPTIONS[team];
          return (
            <section key={team} className="mt-7">
              <header className="mb-3">
                <div className={`flex items-center gap-2 ${tc.text}`}>
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${tc.accent}`} />
                  <h2 className="text-base uppercase tracking-[0.3em] font-display">
                    {teamLabels[team]}
                  </h2>
                  <span className="text-stone-500 text-sm">· {roles.length}</span>
                </div>
                <p className={`mt-2 text-[15px] leading-snug ${tc.text} opacity-90`}>
                  {desc.tagline}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-stone-300">
                  {desc.details}
                </p>
              </header>
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
                      <div className="flex items-center gap-3 px-3 py-3">
                        <RoleIcon roleId={id} size={40} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className={`text-lg italic font-display ${open ? tc.text : "text-stone-100"}`}>
                            {role.name}
                          </span>
                          {!open && (
                            <p className="text-[13px] text-stone-400 mt-0.5 line-clamp-2 leading-snug">
                              {role.ability}
                            </p>
                          )}
                        </div>
                        {open ? (
                          <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        )}
                      </div>
                      {open && (
                        <div className="px-4 pb-4 pt-0">
                          <p className="text-stone-200 text-[15px] leading-relaxed">
                            {role.ability}
                          </p>
                          {(role.firstNight || role.otherNight) && (
                            <div className="mt-3 flex gap-3 text-[12px] text-stone-500">
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
            </section>
          );
        })}
      </div>
    </div>
  );
}
