"use client";
import { Sparkles } from "lucide-react";
import { SCRIPTS } from "@/data/scripts";
import type { Player, RoleInfoEntry } from "@/lib/types";
import { RoleIcon } from "./RoleIcon";

export function RoleInfoDisplay({
  roleInfo,
  players,
  scriptId,
}: {
  roleInfo: RoleInfoEntry[];
  players: Player[];
  scriptId: string;
}) {
  const script = SCRIPTS[scriptId];
  if (!roleInfo || roleInfo.length === 0) return null;
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name ?? "?";

  return (
    <div className="max-w-md mx-auto mt-4 bg-indigo-950/40 ring-1 ring-indigo-800/40 p-4 text-left">
      <div className="text-xs uppercase text-indigo-400/70 tracking-wider mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" /> Informations reçues
      </div>
      <div className="space-y-3">
        {roleInfo.map((entry, i) => {
          switch (entry.kind) {
            case "bluffs":
              return (
                <div key={i}>
                  <div className="text-xs text-stone-400 mb-1.5">Tu peux prétendre être :</div>
                  <div className="flex gap-4 items-end">
                    {entry.roleIds.map(roleId => (
                      <div key={roleId} className="flex flex-col items-center gap-1">
                        <RoleIcon roleId={roleId} size={40} />
                        <div className="text-[10px] text-stone-400 italic text-center">
                          {script.roles[roleId]?.name ?? roleId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            case "two_players_one_role":
              if (entry.result !== undefined) {
                return (
                  <div key={i} className="text-sm text-stone-300 leading-relaxed">
                    <span className="text-amber-200 font-medium">{getPlayerName(entry.playerAId)}</span>
                    {" & "}
                    <span className="text-amber-200 font-medium">{getPlayerName(entry.playerBId)}</span>
                    {" → "}
                    <span className={entry.result ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                      {entry.result ? "OUI" : "NON"}
                    </span>
                    <span className="text-stone-500 text-xs ml-1">(Devin)</span>
                  </div>
                );
              }
              return (
                <div key={i} className="text-sm text-stone-300 leading-relaxed">
                  L'un de{" "}
                  <span className="text-amber-200 font-medium">{getPlayerName(entry.playerAId)}</span>
                  {" "}ou{" "}
                  <span className="text-amber-200 font-medium">{getPlayerName(entry.playerBId)}</span>
                  {" "}est{" "}
                  <span className="inline-flex items-center gap-1 align-middle">
                    <RoleIcon roleId={entry.roleId} size={18} />
                    <span className="italic">{script.roles[entry.roleId]?.name ?? entry.roleId}</span>
                  </span>.
                </div>
              );
            case "player_and_role":
              return (
                <div key={i} className="text-sm text-stone-300 leading-relaxed">
                  <span className="text-amber-200 font-medium">{getPlayerName(entry.playerId)}</span>
                  {" "}est{" "}
                  {entry.label ? (
                    <span className="text-amber-100 italic font-medium">{entry.label}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 align-middle">
                      <RoleIcon roleId={entry.roleId} size={18} />
                      <span className="italic">{script.roles[entry.roleId]?.name ?? entry.roleId}</span>
                    </span>
                  )}.
                </div>
              );
            case "role_list":
              return (
                <div key={i}>
                  <div className="text-xs text-stone-400 mb-1.5">Outsiders en jeu :</div>
                  <div className="flex gap-2 flex-wrap">
                    {entry.roleIds.length === 0 ? (
                      <span className="text-sm text-stone-500 italic">Aucun</span>
                    ) : (
                      entry.roleIds.map(roleId => (
                        <div key={roleId} className="flex items-center gap-1">
                          <RoleIcon roleId={roleId} size={20} />
                          <span className="text-xs text-stone-300 italic">
                            {script.roles[roleId]?.name ?? roleId}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            case "count":
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-900 ring-1 ring-indigo-700 flex items-center justify-center text-indigo-100 text-xl font-bold">
                    {entry.value}
                  </div>
                  <div className="text-sm text-stone-300">{entry.label}</div>
                </div>
              );
            case "text":
              return (
                <div key={i} className="text-sm text-stone-300 italic">{entry.content}</div>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
