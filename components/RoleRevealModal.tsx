"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import type { Player, RoleInfoEntry } from "@/lib/types";
import { RoleIcon } from "./RoleIcon";

export function RoleRevealModal({
  scriptId,
  allPlayers,
  onClose,
  onAddInfo,
}: {
  scriptId: string;
  allPlayers: Player[];
  onClose: () => void;
  onAddInfo: (playerId: string, entry: RoleInfoEntry) => void;
}) {
  const script = SCRIPTS[scriptId];
  const [step, setStep] = useState<"picking" | "displaying">("picking");
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addKind, setAddKind] = useState<"player_and_role" | "two_players_one_role">("player_and_role");
  const [recipientId, setRecipientId] = useState("");
  const [playerAId, setPlayerAId] = useState("");
  const [playerBId, setPlayerBId] = useState("");

  const nonSt = allPlayers.filter(p => !p.isStoryteller);
  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon"];

  const role = selectedRoleId ? script.roles[selectedRoleId] : null;
  const team = role ? (role.team as Team) : null;
  const tc = team ? TEAM_COLORS[team] : null;

  const handleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    setStep("displaying");
    setShowAdd(false);
    setRecipientId(""); setPlayerAId(""); setPlayerBId("");
  };

  const handleAdd = () => {
    if (!selectedRoleId || !recipientId || !playerAId) return;
    if (addKind === "two_players_one_role" && !playerBId) return;
    const entry: RoleInfoEntry = addKind === "player_and_role"
      ? { kind: "player_and_role", playerId: playerAId, roleId: selectedRoleId }
      : { kind: "two_players_one_role", playerAId, playerBId, roleId: selectedRoleId };
    onAddInfo(recipientId, entry);
    onClose();
  };

  if (step === "picking") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-stone-950">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 sticky top-0 bg-stone-950 z-10">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-400">Révéler un rôle</div>
          <button onClick={onClose} className="text-stone-300 hover:text-stone-100 p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {teamOrder.map(t => {
            const roles = Object.entries(script.roles).filter(([, r]) => r.team === t);
            if (!roles.length) return null;
            const c = TEAM_COLORS[t];
            return (
              <div key={t}>
                <div className={`text-[10px] uppercase tracking-[0.25em] mb-2 ${c.text} opacity-70`}>{c.label}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {roles.map(([id, r]) => (
                    <button
                      key={id}
                      onClick={() => handleSelect(id)}
                      className="flex items-center gap-2 p-2 bg-stone-900 ring-1 ring-stone-700 hover:ring-stone-500 text-left transition-all"
                    >
                      <RoleIcon roleId={id} size={32} className="flex-shrink-0" />
                      <span className="text-sm text-stone-200">{r.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 px-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-stone-300 hover:text-stone-100 p-2">
        <X className="w-6 h-6" />
      </button>
      <button
        onClick={() => { setStep("picking"); setShowAdd(false); }}
        className="absolute top-4 left-4 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider flex items-center gap-1"
      >
        ← Retour
      </button>

      <div className="flex flex-col items-center gap-4 mb-8 text-center">
        <RoleIcon roleId={selectedRoleId!} size={140} />
        <div className={`text-4xl font-light italic font-display ${tc?.text ?? "text-stone-100"}`}>{role?.name}</div>
        <div className={`text-xs uppercase tracking-[0.2em] px-3 py-1 ring-1 ${tc?.accent ?? ""} opacity-80`}>{tc?.label}</div>
        <p className="text-stone-200 text-[15px] max-w-md leading-relaxed">{role?.ability}</p>
      </div>

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="px-6 py-3 bg-stone-800 ring-1 ring-stone-600 text-stone-200 text-sm uppercase tracking-wider hover:ring-amber-600 transition-all"
        >
          + Ajouter l'info à un joueur
        </button>
      ) : (
        <div className="bg-stone-900 ring-1 ring-stone-700 p-4 w-full max-w-sm space-y-3">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-400 mb-1">Ajouter à un joueur</div>
          <div className="flex gap-2">
            <button
              onClick={() => setAddKind("player_and_role")}
              className={`flex-1 p-2 text-xs ring-1 transition-all ${addKind === "player_and_role" ? "bg-amber-900/40 ring-amber-700/50 text-amber-200" : "bg-stone-800 ring-stone-700 text-stone-400"}`}
            >
              1 joueur + rôle
            </button>
            <button
              onClick={() => { setAddKind("two_players_one_role"); setPlayerBId(""); }}
              className={`flex-1 p-2 text-xs ring-1 transition-all ${addKind === "two_players_one_role" ? "bg-amber-900/40 ring-amber-700/50 text-amber-200" : "bg-stone-800 ring-stone-700 text-stone-400"}`}
            >
              2 joueurs + rôle
            </button>
          </div>
          <select
            value={recipientId}
            onChange={e => setRecipientId(e.target.value)}
            className="w-full px-2 py-1.5 bg-stone-800 ring-1 ring-stone-700 text-stone-200 text-xs"
          >
            <option value="">Destinataire (qui reçoit l'info)…</option>
            {nonSt.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select
            value={playerAId}
            onChange={e => setPlayerAId(e.target.value)}
            className="w-full px-2 py-1.5 bg-stone-800 ring-1 ring-stone-700 text-stone-200 text-xs"
          >
            <option value="">{addKind === "player_and_role" ? "Joueur visé…" : "Joueur A…"}</option>
            {nonSt.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {addKind === "two_players_one_role" && (
            <select
              value={playerBId}
              onChange={e => setPlayerBId(e.target.value)}
              className="w-full px-2 py-1.5 bg-stone-800 ring-1 ring-stone-700 text-stone-200 text-xs"
            >
              <option value="">Joueur B…</option>
              {nonSt.filter(p => p.id !== playerAId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 p-2 bg-stone-800 ring-1 ring-stone-700 text-stone-400 text-xs"
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 p-2 bg-amber-900/60 ring-1 ring-amber-700/50 text-amber-100 text-xs hover:bg-amber-900 transition-all"
            >
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
