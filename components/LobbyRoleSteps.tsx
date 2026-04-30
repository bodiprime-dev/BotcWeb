"use client";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import type { GameState, GameAction } from "@/lib/types";
import { RoleIcon } from "./RoleIcon";

export type LobbyStep = "players" | "roles" | "drunk" | "lunatic" | "lunatic-bluffs" | "bluffs";

export function LobbyRoleSteps({
  game,
  step,
  setStep,
  playableCount,
  prefillRoleInfo,
  storytellerId,
  dispatch,
}: {
  game: GameState;
  step: LobbyStep;
  setStep: (step: LobbyStep) => void;
  playableCount: number;
  prefillRoleInfo: boolean;
  storytellerId: string;
  dispatch: (action: GameAction) => void;
}) {
  const script = SCRIPTS[game.scriptId];
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [drunkFakeRoleId, setDrunkFakeRoleId] = useState<string | null>(null);
  const [lunaticFakeDemonId, setLunaticFakeDemonId] = useState<string | null>(null);
  const [lunaticBluffRoleIds, setLunaticBluffRoleIds] = useState<string[]>([]);
  const [demonBluffRoleIds, setDemonBluffRoleIds] = useState<string[]>([]);

  // Au-delà de 15 joueurs, les surnuméraires sont des Voyageurs : on inclut alors
  // la section Voyageurs dans le wizard pour permettre la sélection manuelle.
  const teamOrder: Team[] = playableCount > 15
    ? ["townsfolk", "outsider", "minion", "demon", "traveler"]
    : ["townsfolk", "outsider", "minion", "demon"];
  const teamLabels: Record<Team, string> = {
    townsfolk: "Townsfolk", outsider: "Outsiders", minion: "Minions", demon: "Démon", traveler: "Voyageurs",
  };

  if (step === "players") return null;

  const hasDemonInRoles = (roleIds: string[]) =>
    roleIds.some(id => script.roles[id]?.team === "demon");

  const launchGame = (
    roleIds: string[],
    fakeRoleId: string | null,
    lunaticDemonId: string | null,
    lunaticBluffIds: string[],
    bluffIds: string[]
  ) => {
    dispatch({
      type: "START_GAME",
      storytellerId,
      selectedRoleIds: roleIds,
      drunkFakeRoleId: fakeRoleId,
      lunaticFakeDemonId: lunaticDemonId,
      lunaticBluffRoleIds: lunaticBluffIds.length === 3 ? [lunaticBluffIds[0], lunaticBluffIds[1], lunaticBluffIds[2]] : null,
      demonBluffRoleIds: bluffIds.length === 3 ? [bluffIds[0], bluffIds[1], bluffIds[2]] : null,
      prefillRoleInfo,
    });
  };

  const launch = (roleIds: string[]) => {
    if (roleIds.includes("drunk")) {
      const opts = Object.keys(script.roles).filter(
        id => script.roles[id].team === "townsfolk" && !roleIds.includes(id)
      );
      if (opts.length > 0) { setStep("drunk"); return; }
    }
    if (roleIds.includes("lunatic")) { setStep("lunatic"); return; }
    if (hasDemonInRoles(roleIds)) { setStep("bluffs"); return; }
    launchGame(roleIds, null, null, [], []);
  };

  const fakeRoleOptions = Object.entries(script.roles)
    .filter(([id, r]) => r.team === "townsfolk" && !selectedRoleIds.includes(id))
    .map(([id, r]) => ({ id, ...r }));

  const bluffCandidates = Object.entries(script.roles)
    .filter(([id, r]) => r.team === "townsfolk" && !selectedRoleIds.includes(id))
    .map(([id, r]) => ({ id, ...r }));

  if (step === "roles") {
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Choix des rôles
          </div>
          <div className={`text-sm font-medium ${
            selectedRoleIds.length === playableCount ? "text-amber-400"
            : selectedRoleIds.length > playableCount ? "text-red-400"
            : "text-stone-400"
          }`}>
            {selectedRoleIds.length}/{playableCount}
          </div>
        </div>
        {teamOrder.map(team => {
          const roles = Object.entries(script.roles).filter(([, r]) => r.team === team);
          if (!roles.length) return null;
          const tc = TEAM_COLORS[team];
          return (
            <div key={team} className="mb-4">
              <div className={`text-xs uppercase tracking-[0.3em] mb-2 ${tc.text} opacity-70`}>{teamLabels[team]}</div>
              <div className="space-y-1">
                {roles.map(([id, role]) => {
                  const checked = selectedRoleIds.includes(id);
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                      className={`w-full flex items-center gap-3 px-3 py-2 ring-1 text-left transition-all ${
                        checked ? `bg-stone-800/70 ${tc.ring} ${tc.text}` : "bg-stone-900 ring-stone-800 text-stone-400 hover:ring-stone-600"
                      }`}
                    >
                      <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center text-[10px] font-bold transition-all ${
                        checked ? `${tc.accent} border-transparent text-stone-100` : "border-stone-600 bg-transparent"
                      }`}>
                        {checked && "✓"}
                      </div>
                      <RoleIcon roleId={id} size={28} className="flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm italic">{role.name}</div>
                        <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">{role.ability}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { setStep("players"); setSelectedRoleIds([]); }}
            className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm"
          >
            ← Annuler
          </button>
          <button
            onClick={() => launch(selectedRoleIds)}
            disabled={selectedRoleIds.length !== playableCount}
            className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all"
          >
            {selectedRoleIds.length === playableCount
              ? "Lancer la partie"
              : `${playableCount - selectedRoleIds.length} rôle(s) manquant(s)`}
          </button>
        </div>
      </div>
    );
  }

  if (step === "drunk") {
    return (
      <div className="mb-4">
        <div className="bg-amber-950/40 ring-1 ring-amber-800/40 p-4 mb-6">
          <div className="text-amber-400 text-sm font-medium mb-2">🍺 Drunk est en jeu</div>
          <p className="text-stone-300 text-sm leading-relaxed">
            Le Drunk pense être un Townsfolk. Choisis le rôle qu'il <em>croit</em> avoir.
          </p>
        </div>
        <div className="text-stone-400 text-xs uppercase tracking-[0.2em] mb-3">Le Drunk pense être…</div>
        <div className="space-y-2 mb-6">
          {fakeRoleOptions.map(role => {
            const sel = drunkFakeRoleId === role.id;
            return (
              <button
                key={role.id}
                onClick={() => setDrunkFakeRoleId(role.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left transition-all ${
                  sel ? "bg-stone-800/70 ring-amber-700/60 text-amber-200" : "bg-stone-900 ring-stone-800 text-stone-300 hover:ring-stone-600"
                }`}
              >
                <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                  sel ? "border-amber-700 bg-amber-700" : "border-stone-600"
                }`}>
                  {sel && <div className="w-1.5 h-1.5 rounded-full bg-stone-100" />}
                </div>
                <RoleIcon roleId={role.id} size={28} className="flex-shrink-0" />
                <div>
                  <div className="text-sm italic">{role.name}</div>
                  <div className="text-xs opacity-60 line-clamp-1 mt-0.5">{role.ability}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setStep("roles"); setDrunkFakeRoleId(null); }}
            className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm"
          >
            ← Retour
          </button>
          <button
            onClick={() => {
              if (selectedRoleIds.includes("lunatic")) { setStep("lunatic"); }
              else if (hasDemonInRoles(selectedRoleIds)) { setStep("bluffs"); }
              else { launchGame(selectedRoleIds, drunkFakeRoleId, null, [], []); }
            }}
            disabled={!drunkFakeRoleId}
            className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all"
          >
            {selectedRoleIds.includes("lunatic") || hasDemonInRoles(selectedRoleIds) ? "Suivant →" : "Confirmer et lancer"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "lunatic") {
    const demonOptions = Object.entries(script.roles)
      .filter(([id, r]) => r.team === "demon" && !selectedRoleIds.includes(id))
      .map(([id, r]) => ({ id, ...r }));
    return (
      <div className="mb-4">
        <div className="bg-rose-950/40 ring-1 ring-rose-800/40 p-4 mb-6">
          <div className="text-rose-400 text-sm font-medium mb-2">🌙 Lunatique est en jeu</div>
          <p className="text-stone-300 text-sm leading-relaxed">
            Le Lunatique croit être le Démon. Choisis quel Démon (absent du jeu) il pense être.
          </p>
        </div>
        <div className="text-stone-400 text-xs uppercase tracking-[0.2em] mb-3">Le Lunatique pense être…</div>
        {demonOptions.length === 0 ? (
          <p className="text-stone-500 text-sm italic mb-6">Tous les démons du script sont déjà en jeu.</p>
        ) : (
          <div className="space-y-2 mb-6">
            {demonOptions.map(role => {
              const sel = lunaticFakeDemonId === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setLunaticFakeDemonId(role.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left transition-all ${
                    sel ? "bg-stone-800/70 ring-rose-700/60 text-rose-200" : "bg-stone-900 ring-stone-800 text-stone-300 hover:ring-stone-600"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                    sel ? "border-rose-700 bg-rose-700" : "border-stone-600"
                  }`}>
                    {sel && <div className="w-1.5 h-1.5 rounded-full bg-stone-100" />}
                  </div>
                  <RoleIcon roleId={role.id} size={28} className="flex-shrink-0" />
                  <div>
                    <div className="text-sm italic">{role.name}</div>
                    <div className="text-xs opacity-60 line-clamp-1 mt-0.5">{role.ability}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => { setStep(selectedRoleIds.includes("drunk") ? "drunk" : "roles"); setLunaticFakeDemonId(null); }}
            className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm"
          >
            ← Retour
          </button>
          <button
            onClick={() => setStep("lunatic-bluffs")}
            disabled={!lunaticFakeDemonId && demonOptions.length > 0}
            className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all"
          >
            Suivant →
          </button>
        </div>
      </div>
    );
  }

  if (step === "lunatic-bluffs") {
    return (
      <div className="mb-4">
        <div className="bg-rose-950/40 ring-1 ring-rose-800/40 p-4 mb-6">
          <div className="text-rose-400 text-sm font-medium mb-2">🌙 Bluffs du Lunatique</div>
          <p className="text-stone-300 text-sm leading-relaxed">
            Choisis <strong>3 rôles Townsfolk</strong> que le Lunatique pourra prétendre être.
            Ces rôles sont distincts de ceux du Démon.
          </p>
        </div>
        <div className="text-stone-400 text-xs uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
          <span>Rôles disponibles comme bluffs</span>
          <span className={lunaticBluffRoleIds.length === 3 ? "text-rose-400" : "text-stone-500"}>
            {lunaticBluffRoleIds.length}/3
          </span>
        </div>
        <div className="space-y-2 mb-6">
          {bluffCandidates.map(role => {
            const tc = TEAM_COLORS.townsfolk;
            const sel = lunaticBluffRoleIds.includes(role.id);
            const disabled = !sel && lunaticBluffRoleIds.length >= 3;
            return (
              <button
                key={role.id}
                onClick={() => {
                  if (sel) setLunaticBluffRoleIds(prev => prev.filter(x => x !== role.id));
                  else if (!disabled) setLunaticBluffRoleIds(prev => [...prev, role.id]);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left transition-all ${
                  sel ? `bg-stone-800/70 ring-rose-700/60 ${tc.text}`
                  : disabled ? "bg-stone-950 ring-stone-800 text-stone-600 cursor-not-allowed"
                  : "bg-stone-900 ring-stone-800 text-stone-300 hover:ring-stone-600"
                }`}
              >
                <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center text-[10px] font-bold transition-all ${
                  sel ? "bg-rose-800 border-transparent text-stone-100" : "border-stone-600 bg-transparent"
                }`}>
                  {sel && "✓"}
                </div>
                <RoleIcon roleId={role.id} size={28} className="flex-shrink-0" />
                <div>
                  <div className="text-sm italic">{role.name}</div>
                  <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">{role.ability}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setStep("lunatic"); setLunaticBluffRoleIds([]); }}
            className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm"
          >
            ← Retour
          </button>
          <button
            onClick={() => {
              if (hasDemonInRoles(selectedRoleIds)) { setStep("bluffs"); }
              else { launchGame(selectedRoleIds, drunkFakeRoleId, lunaticFakeDemonId, lunaticBluffRoleIds, []); }
            }}
            disabled={lunaticBluffRoleIds.length !== 3}
            className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all"
          >
            {lunaticBluffRoleIds.length === 3
              ? hasDemonInRoles(selectedRoleIds) ? "Suivant →" : "Confirmer et lancer"
              : `${3 - lunaticBluffRoleIds.length} bluff(s) manquant(s)`}
          </button>
        </div>
      </div>
    );
  }

  if (step === "bluffs") {
    return (
      <div className="mb-4">
        <div className="bg-red-950/40 ring-1 ring-red-800/40 p-4 mb-6">
          <div className="text-red-400 text-sm font-medium mb-2">😈 Bluffs du Démon</div>
          <p className="text-stone-300 text-sm leading-relaxed">
            Choisis <strong>3 rôles Townsfolk</strong> absents du jeu. Le Démon pourra
            prétendre être l'un d'eux pendant la journée.
          </p>
        </div>
        <div className="text-stone-400 text-xs uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
          <span>Rôles disponibles comme bluffs</span>
          <span className={demonBluffRoleIds.length === 3 ? "text-amber-400" : "text-stone-500"}>
            {demonBluffRoleIds.length}/3
          </span>
        </div>
        <div className="space-y-2 mb-6">
          {bluffCandidates.map(role => {
            const tc = TEAM_COLORS.townsfolk;
            const sel = demonBluffRoleIds.includes(role.id);
            const disabled = !sel && demonBluffRoleIds.length >= 3;
            return (
              <button
                key={role.id}
                onClick={() => {
                  if (sel) setDemonBluffRoleIds(prev => prev.filter(x => x !== role.id));
                  else if (!disabled) setDemonBluffRoleIds(prev => [...prev, role.id]);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left transition-all ${
                  sel ? `bg-stone-800/70 ring-red-700/60 ${tc.text}`
                  : disabled ? "bg-stone-950 ring-stone-800 text-stone-600 cursor-not-allowed"
                  : "bg-stone-900 ring-stone-800 text-stone-300 hover:ring-stone-600"
                }`}
              >
                <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center text-[10px] font-bold transition-all ${
                  sel ? "bg-red-800 border-transparent text-stone-100" : "border-stone-600 bg-transparent"
                }`}>
                  {sel && "✓"}
                </div>
                <RoleIcon roleId={role.id} size={28} className="flex-shrink-0" />
                <div>
                  <div className="text-sm italic">{role.name}</div>
                  <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">{role.ability}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const prev = selectedRoleIds.includes("lunatic") ? "lunatic-bluffs"
                : selectedRoleIds.includes("drunk") ? "drunk" : "roles";
              setStep(prev);
              setDemonBluffRoleIds([]);
            }}
            className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm"
          >
            ← Retour
          </button>
          <button
            onClick={() => launchGame(selectedRoleIds, drunkFakeRoleId, lunaticFakeDemonId, lunaticBluffRoleIds, demonBluffRoleIds)}
            disabled={demonBluffRoleIds.length !== 3}
            className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all"
          >
            {demonBluffRoleIds.length === 3 ? "Confirmer et lancer" : `${3 - demonBluffRoleIds.length} bluff(s) manquant(s)`}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
