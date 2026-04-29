"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import { RoleIcon } from "./RoleIcon";

export function RoleChangePanel({
  currentRoleId,
  scriptId,
  onSelect,
}: {
  currentRoleId: string;
  scriptId: string;
  onSelect: (roleId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const script = SCRIPTS[scriptId];
  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon"];

  return (
    <div className="border-t border-stone-700 mt-3 pt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-[0.15em] text-stone-400 hover:text-stone-200 transition-colors"
      >
        <span>Changer le rôle</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {teamOrder.map(team => {
            const roles = Object.entries(script.roles).filter(([, r]) => r.team === team);
            if (!roles.length) return null;
            const tc = TEAM_COLORS[team];
            return (
              <div key={team}>
                <div className={`text-[10px] uppercase tracking-[0.25em] mb-1 ${tc.text} opacity-70`}>{tc.label}</div>
                <div className="space-y-0.5">
                  {roles.map(([id, role]) => (
                    <button
                      key={id}
                      onClick={() => { onSelect(id); setOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left ring-1 transition-all ${
                        id === currentRoleId
                          ? `${tc.accent} ring-transparent text-stone-100`
                          : "bg-stone-900 ring-stone-800 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                      }`}
                    >
                      <RoleIcon roleId={id} size={16} className="flex-shrink-0" />
                      {role.name}
                      {id === currentRoleId && <span className="ml-auto text-[9px] opacity-60">actuel</span>}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
