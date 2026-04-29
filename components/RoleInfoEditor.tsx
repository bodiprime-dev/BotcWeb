"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { SCRIPTS } from "@/data/scripts";
import type { Player, RoleInfoEntry } from "@/lib/types";
import { RoleIcon } from "./RoleIcon";

export function RoleInfoEditor({
  player,
  allPlayers,
  scriptId,
  onSave,
}: {
  player: Player;
  allPlayers: Player[];
  scriptId: string;
  onSave: (info: RoleInfoEntry[]) => void;
}) {
  const script = SCRIPTS[scriptId];
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState("text");
  const [textContent, setTextContent] = useState("");
  const [countLabel, setCountLabel] = useState("");
  const [countValue, setCountValue] = useState(0);
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [pickedRoleIds, setPickedRoleIds] = useState<string[]>([]);
  const [fortuneResult, setFortuneResult] = useState<boolean>(true);

  const nonSt = allPlayers.filter(p => !p.isStoryteller && p.id !== player.id);
  const roleInfo = player.roleInfo ?? [];

  const resetForm = () => {
    setTextContent(""); setCountLabel(""); setCountValue(0);
    setPlayerAId(""); setPlayerBId(""); setRoleId(""); setPickedRoleIds([]);
    setFortuneResult(true); setKind("text"); setEditing(false);
  };

  const addEntry = () => {
    let entry: RoleInfoEntry | null = null;
    switch (kind) {
      case "text":
        if (!textContent.trim()) return;
        entry = { kind: "text", content: textContent.trim() };
        break;
      case "count":
        if (!countLabel.trim()) return;
        entry = { kind: "count", label: countLabel.trim(), value: countValue };
        break;
      case "two_players_one_role":
        if (!playerAId || !playerBId || !roleId) return;
        entry = { kind: "two_players_one_role", playerAId, playerBId, roleId };
        break;
      case "fortune_result":
        if (!playerAId || !playerBId) return;
        entry = { kind: "two_players_one_role", playerAId, playerBId, roleId: "", result: fortuneResult };
        break;
      case "player_and_role":
        if (!playerAId || !roleId) return;
        entry = { kind: "player_and_role", playerId: playerAId, roleId };
        break;
      case "role_list":
        entry = { kind: "role_list", roleIds: pickedRoleIds };
        break;
      case "bluffs":
        if (pickedRoleIds.length !== 3) return;
        entry = { kind: "bluffs", roleIds: pickedRoleIds as [string, string, string] };
        break;
      default:
        return;
    }
    if (!entry) return;
    onSave([...roleInfo, entry]);
    resetForm();
  };

  const getPlayerName = (id: string) => allPlayers.find(p => p.id === id)?.name ?? "?";

  return (
    <div className="mt-3 pt-3 border-t border-stone-700">
      {roleInfo.length > 0 && (
        <div className="mb-3">
          <div className="text-xs uppercase text-stone-400 tracking-wider mb-2">Infos du joueur</div>
          <div className="space-y-1.5">
            {roleInfo.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 bg-stone-800 ring-1 ring-stone-700 p-2 text-xs">
                <div className="flex-1 text-stone-300 min-w-0">
                  {entry.kind === "bluffs" && (
                    <div className="flex gap-1 items-center flex-wrap">
                      <span className="text-stone-500 mr-1">Bluffs:</span>
                      {entry.roleIds.map(id => (
                        <span key={id} className="inline-flex items-center gap-0.5">
                          <RoleIcon roleId={id} size={16} />
                          <span className="text-stone-400">{script.roles[id]?.name ?? id}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {entry.kind === "count" && (
                    <span>{entry.label}: <strong className="text-indigo-300">{entry.value}</strong></span>
                  )}
                  {entry.kind === "text" && (
                    <span className="italic text-stone-400 line-clamp-2">{entry.content}</span>
                  )}
                  {entry.kind === "two_players_one_role" && entry.result !== undefined && (
                    <span>
                      {getPlayerName(entry.playerAId)} / {getPlayerName(entry.playerBId)} → <strong>{entry.result ? "OUI" : "NON"}</strong> (Devin)
                    </span>
                  )}
                  {entry.kind === "two_players_one_role" && entry.result === undefined && (
                    <span>
                      {getPlayerName(entry.playerAId)} / {getPlayerName(entry.playerBId)} → {script.roles[entry.roleId]?.name ?? entry.roleId}
                    </span>
                  )}
                  {entry.kind === "player_and_role" && (
                    <span>{getPlayerName(entry.playerId)} → {entry.label ?? (script.roles[entry.roleId]?.name ?? entry.roleId)}</span>
                  )}
                  {entry.kind === "role_list" && (
                    <span>Rôles: {entry.roleIds.map(id => script.roles[id]?.name ?? id).join(", ") || "aucun"}</span>
                  )}
                </div>
                <button
                  onClick={() => onSave(roleInfo.filter((_, idx) => idx !== i))}
                  className="text-stone-500 hover:text-red-400 p-0.5 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full p-2 text-xs uppercase tracking-wider bg-stone-800 ring-1 ring-stone-700 text-stone-400 hover:text-stone-200 hover:ring-stone-500 transition-all"
        >
          + Ajouter une info
        </button>
      ) : (
        <div className="bg-stone-800 ring-1 ring-stone-700 p-3 space-y-2">
          <div className="text-xs uppercase text-stone-400 tracking-wider">Type d'info</div>
          <select
            value={kind}
            onChange={e => setKind(e.target.value)}
            className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs"
          >
            <option value="bluffs">Bluffs Démon (3 rôles)</option>
            <option value="two_players_one_role">2 joueurs + 1 rôle</option>
            <option value="fortune_result">Devin — 2 joueurs + OUI/NON</option>
            <option value="player_and_role">1 joueur + 1 rôle</option>
            <option value="role_list">Liste de rôles</option>
            <option value="count">Nombre</option>
            <option value="text">Note libre</option>
          </select>

          {kind === "text" && (
            <input
              value={textContent}
              onChange={e => setTextContent(e.target.value)}
              placeholder="Note…"
              className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs"
            />
          )}
          {kind === "count" && (
            <div className="flex gap-2">
              <input
                value={countLabel}
                onChange={e => setCountLabel(e.target.value)}
                placeholder="Étiquette"
                className="flex-1 px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs"
              />
              <input
                type="number"
                value={countValue}
                onChange={e => setCountValue(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs text-center"
              />
            </div>
          )}
          {(kind === "two_players_one_role" || kind === "player_and_role" || kind === "fortune_result") && (
            <>
              <select
                value={playerAId}
                onChange={e => setPlayerAId(e.target.value)}
                className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs"
              >
                <option value="">Joueur A…</option>
                {nonSt.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {(kind === "two_players_one_role" || kind === "fortune_result") && (
                <select
                  value={playerBId}
                  onChange={e => setPlayerBId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs"
                >
                  <option value="">Joueur B…</option>
                  {nonSt.filter(p => p.id !== playerAId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {kind === "fortune_result" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setFortuneResult(true)}
                    className={`flex-1 p-1.5 text-xs ring-1 ${fortuneResult ? "bg-green-900 ring-green-700 text-green-100" : "bg-stone-900 ring-stone-700 text-stone-400"}`}
                  >
                    OUI
                  </button>
                  <button
                    onClick={() => setFortuneResult(false)}
                    className={`flex-1 p-1.5 text-xs ring-1 ${!fortuneResult ? "bg-red-900 ring-red-700 text-red-100" : "bg-stone-900 ring-stone-700 text-stone-400"}`}
                  >
                    NON
                  </button>
                </div>
              )}
              {(kind === "two_players_one_role" || kind === "player_and_role") && (
                <select
                  value={roleId}
                  onChange={e => setRoleId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs"
                >
                  <option value="">Rôle…</option>
                  {Object.entries(script.roles).map(([id, r]) => (
                    <option key={id} value={id}>{r.name}</option>
                  ))}
                </select>
              )}
            </>
          )}
          {(kind === "role_list" || kind === "bluffs") && (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {Object.entries(script.roles)
                .filter(([, r]) => kind === "bluffs" ? r.team === "townsfolk" : true)
                .map(([id, r]) => {
                  const checked = pickedRoleIds.includes(id);
                  const limit = kind === "bluffs" ? 3 : Infinity;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        if (checked) setPickedRoleIds(prev => prev.filter(x => x !== id));
                        else if (pickedRoleIds.length < limit) setPickedRoleIds(prev => [...prev, id]);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left ring-1 transition-all ${
                        checked ? "bg-stone-700 ring-stone-500 text-stone-100" : "bg-stone-900 ring-stone-800 text-stone-400"
                      }`}
                    >
                      <span className={`w-3 h-3 flex-shrink-0 border ${checked ? "bg-amber-700 border-transparent" : "border-stone-600"}`} />
                      {r.name}
                    </button>
                  );
                })}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={resetForm}
              className="flex-1 p-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-xs"
            >
              Annuler
            </button>
            <button
              onClick={addEntry}
              className="flex-1 p-1.5 bg-amber-900/60 ring-1 ring-amber-700/50 text-amber-100 text-xs hover:bg-amber-900 transition-all"
            >
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
