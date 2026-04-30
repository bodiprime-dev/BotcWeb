"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Eye, Minimize2, Moon, SkipForward } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
import { getNightTemplate, type NightTemplate } from "@/data/nightTemplates";
import type { GameAction, GameState, Player, RoleInfoEntry } from "@/lib/types";
import { useNightOrder, type NightOrderEntry } from "@/hooks/useNightOrder";
import { RoleIcon } from "./RoleIcon";

// Le walkthrough construit, pour chaque entrée d'ordre de nuit ayant un template,
// un écran plein écran qui guide le Conteur étape par étape.

interface WalkthroughStep {
  entry: NightOrderEntry;
  template: NightTemplate;
  // Le rôle utilisé pour l'ordre/le template (= displayRole pour Drunk/Lunatic).
  orderRoleId: string;
}

function buildSteps(game: GameState, entries: NightOrderEntry[]): WalkthroughStep[] {
  const isFirstNight = game.day === 1;
  const steps: WalkthroughStep[] = [];
  for (const e of entries) {
    const realRoleId = e.player.role!;
    const displayRoleId = e.player.displayRole || realRoleId;
    const orderRoleId = (realRoleId === "drunk" || realRoleId === "lunatic") ? displayRoleId : realRoleId;
    const tpl = getNightTemplate(orderRoleId, isFirstNight);
    if (!tpl) continue;
    steps.push({ entry: e, template: tpl, orderRoleId });
  }
  return steps;
}

export function NightWalkthrough({
  game,
  storytellerId,
  dispatch,
  visible,
  onMinimize,
  onFinished,
}: {
  game: GameState;
  storytellerId: string;
  dispatch: (action: GameAction) => void;
  visible: boolean;
  onMinimize: () => void;
  onFinished: () => void;
}) {
  const order = useNightOrder(game);
  const steps = useMemo(() => buildSteps(game, order), [game, order]);
  const [index, setIndex] = useState(0);
  const [revealMode, setRevealMode] = useState<"off" | "picking" | "showing">("off");
  const [revealRoleId, setRevealRoleId] = useState<string | null>(null);
  const script = SCRIPTS[game.scriptId];

  if (steps.length === 0) {
    return (
      <Shell visible={visible} onMinimize={onMinimize}>
        <div className="text-stone-300 text-center p-8">
          Aucun rôle n'a d'action à mener cette nuit.
          <div className="mt-4">
            <button
              onClick={onFinished}
              className="px-4 py-2 ring-1 ring-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs uppercase tracking-wide"
            >
              Fermer
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const step = steps[Math.min(index, steps.length - 1)];
  const total = steps.length;
  const role = script.roles[step.orderRoleId];
  const realRole = step.entry.realRole;
  const player = game.players.find(p => p.id === step.entry.player.id) ?? step.entry.player;
  const impaired =
    player.poisoned ||
    player.reminders.includes("poisoned") ||
    player.reminders.includes("drunk") ||
    player.role === "drunk" ||
    player.role === "lunatic";

  const next = () => setIndex(i => Math.min(i + 1, steps.length - 1));
  const prev = () => setIndex(i => Math.max(i - 1, 0));
  const last = index === steps.length - 1;

  const finishNight = () => {
    dispatch({ type: "TOGGLE_PHASE", storytellerId });
    onFinished();
  };

  if (revealMode === "picking") {
    return (
      <Shell visible={visible} onMinimize={onMinimize}>
        <RolePickerScreen
          scriptId={game.scriptId}
          onPick={(roleId) => { setRevealRoleId(roleId); setRevealMode("showing"); }}
          onCancel={() => setRevealMode("off")}
        />
      </Shell>
    );
  }
  if (revealMode === "showing" && revealRoleId) {
    return (
      <Shell visible={visible} onMinimize={onMinimize}>
        <RevealScreen
          scriptId={game.scriptId}
          roleId={revealRoleId}
          onBack={() => setRevealMode("off")}
        />
      </Shell>
    );
  }

  return (
    <Shell visible={visible} onMinimize={onMinimize}>
      <div className="px-4 pt-3 pb-2 border-b border-stone-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-indigo-300 text-xs uppercase tracking-[0.3em] flex items-center gap-2">
            <Moon className="w-3 h-3" /> Nuit {game.day} — étape {index + 1}/{total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRevealMode("picking")}
              title="Révéler un rôle au joueur"
              className="flex items-center gap-1 px-2 py-1 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 text-[11px] uppercase tracking-wide"
            >
              <Eye className="w-3 h-3" /> Révéler
            </button>
            <button onClick={onMinimize} className="text-stone-400 hover:text-stone-200" aria-label="Réduire">
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-stone-800 overflow-hidden">
          <div
            className="h-full bg-indigo-700 transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <header className="flex items-start gap-3">
          <RoleIcon roleId={step.orderRoleId} size={64} />
          <div className="flex-1 min-w-0">
            <div className="text-stone-500 text-xs uppercase tracking-wider">{player.name}</div>
            <h2 className="text-xl text-amber-100 italic">{role.name}</h2>
            {realRole.name !== role.name && (
              <div className="text-xs text-stone-500">
                (vrai rôle : <span className="text-stone-300">{realRole.name}</span>)
              </div>
            )}
            <p className="text-stone-400 text-sm mt-1 leading-snug">{role.ability}</p>
          </div>
        </header>

        {impaired && (
          <div className="bg-amber-950/40 ring-1 ring-amber-800/60 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-amber-200 text-xs leading-snug">
              Ce joueur est ivre, empoisonné ou Lunatique. Son pouvoir échoue : à toi de saisir
              les fausses informations qu'il croira recevoir, et de ne pas appliquer d'effet réel.
            </div>
          </div>
        )}

        <div className="bg-stone-900 ring-1 ring-stone-700 p-3">
          <div className="text-xs uppercase text-stone-500 tracking-wider mb-1">À faire</div>
          <p className="text-stone-200 text-sm">{step.template.prompt}</p>
        </div>

        <StepForm
          key={`${step.entry.player.id}-${step.orderRoleId}-${index}`}
          game={game}
          player={player}
          template={step.template}
          impaired={impaired}
          storytellerId={storytellerId}
          dispatch={dispatch}
          onValidated={() => (last ? null : next())}
        />
      </div>

      <footer className="border-t border-stone-800 p-3 flex items-center gap-2">
        <button
          onClick={prev}
          disabled={index === 0}
          className="flex items-center gap-1 px-3 py-2 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs uppercase tracking-wide disabled:opacity-30"
        >
          <ArrowLeft className="w-3 h-3" /> Préc.
        </button>
        <button
          onClick={() => (last ? finishNight() : next())}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 ring-1 ring-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs uppercase tracking-wide"
        >
          <SkipForward className="w-3 h-3" /> Passer
        </button>
        {last ? (
          <button
            onClick={finishNight}
            className="flex items-center gap-1 px-3 py-2 ring-1 ring-emerald-700 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs uppercase tracking-wide"
          >
            Aube <Check className="w-3 h-3" />
          </button>
        ) : (
          <button
            onClick={next}
            className="flex items-center gap-1 px-3 py-2 ring-1 ring-indigo-700 bg-indigo-900 hover:bg-indigo-800 text-indigo-100 text-xs uppercase tracking-wide"
          >
            Suiv. <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </footer>
    </Shell>
  );
}

function Shell({
  children,
  visible,
  onMinimize,
}: {
  children: React.ReactNode;
  visible: boolean;
  onMinimize: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 ${visible ? "" : "hidden"}`}
      onClick={onMinimize}
    >
      <div
        className="bg-stone-950 ring-1 ring-stone-800 max-w-2xl w-full max-h-[100dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ height: "min(100dvh, 800px)" }}
      >
        {children}
      </div>
    </div>
  );
}

function RolePickerScreen({
  scriptId,
  onPick,
  onCancel,
}: {
  scriptId: string;
  onPick: (roleId: string) => void;
  onCancel: () => void;
}) {
  const script = SCRIPTS[scriptId];
  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon"];
  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <button onClick={onCancel} className="text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider">
          ← Retour au guide
        </button>
        <div className="text-stone-400 text-xs uppercase tracking-[0.2em]">Choisir un rôle à révéler</div>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    onClick={() => onPick(id)}
                    className="flex items-center gap-2 p-2 bg-stone-900 ring-1 ring-stone-700 hover:ring-stone-500 text-left"
                  >
                    <RoleIcon roleId={id} size={32} />
                    <span className="text-sm text-stone-200">{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function RevealScreen({
  scriptId,
  roleId,
  onBack,
}: {
  scriptId: string;
  roleId: string;
  onBack: () => void;
}) {
  const script = SCRIPTS[scriptId];
  const role = script.roles[roleId];
  const tc = role ? TEAM_COLORS[role.team as Team] : null;
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 relative">
      <button
        onClick={onBack}
        className="absolute top-3 left-3 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider"
      >
        ← Retour
      </button>
      <RoleIcon roleId={roleId} size={160} />
      <div className={`mt-4 text-4xl font-light italic ${tc?.text ?? "text-stone-100"}`}>{role?.name}</div>
      {tc && (
        <div className={`mt-2 text-xs uppercase tracking-[0.2em] px-3 py-1 ring-1 ${tc.accent} opacity-80`}>
          {tc.label}
        </div>
      )}
      {role && (
        <p className="mt-4 text-stone-400 text-sm max-w-sm leading-relaxed">{role.ability}</p>
      )}
    </div>
  );
}

// ─── Form per action kind ────────────────────────────────────────────────────

function StepForm({
  game,
  player,
  template,
  impaired,
  storytellerId,
  dispatch,
  onValidated,
}: {
  game: GameState;
  player: Player;
  template: NightTemplate;
  impaired: boolean;
  storytellerId: string;
  dispatch: (action: GameAction) => void;
  onValidated: () => void;
}) {
  const action = template.action;
  const appendInfo = (entry: RoleInfoEntry) => {
    dispatch({
      type: "SET_ROLE_INFO",
      storytellerId,
      playerId: player.id,
      roleInfo: [...(player.roleInfo ?? []), entry],
    });
  };

  switch (action.kind) {
    case "info_two_players_one_role":
      return (
        <TwoPlayersOneRoleForm
          game={game}
          self={player}
          restrictTeam={action.restrictTeam}
          allowNone={action.allowNone}
          onSubmit={(playerAId, playerBId, roleId) => {
            appendInfo({ kind: "two_players_one_role", playerAId, playerBId, roleId });
            onValidated();
          }}
        />
      );
    case "info_fortune":
      return (
        <TwoPlayersOneRoleForm
          game={game}
          self={player}
          fortune
          onFortune={(playerAId, playerBId, result) => {
            appendInfo({ kind: "two_players_one_role", playerAId, playerBId, roleId: "", result });
            onValidated();
          }}
        />
      );
    case "info_player_and_role":
      return (
        <PlayerAndRoleForm
          game={game}
          self={player}
          restrictTeam={action.restrictTeam}
          onSubmit={(pid, roleId) => {
            appendInfo({ kind: "player_and_role", playerId: pid, roleId });
            onValidated();
          }}
        />
      );
    case "info_count":
      return (
        <CountForm
          label={action.label}
          existing={player.roleInfo?.find(e => e.kind === "count" && e.label === action.label)}
          onSubmit={value => {
            // Remplace l'éventuel compteur du même label, sinon append
            const without = (player.roleInfo ?? []).filter(
              e => !(e.kind === "count" && e.label === action.label)
            );
            dispatch({
              type: "SET_ROLE_INFO",
              storytellerId,
              playerId: player.id,
              roleInfo: [...without, { kind: "count", label: action.label, value }],
            });
            onValidated();
          }}
        />
      );
    case "info_role_list": {
      // Liste des rôles correspondant à l'équipe et présents en jeu
      const inPlay = new Set(
        game.players
          .filter(p => !p.isStoryteller && p.role)
          .map(p => p.role as string)
      );
      const script = SCRIPTS[game.scriptId];
      const roleIds = Object.entries(script.roles)
        .filter(([id, r]) => r.team === action.restrictTeam && (!action.fromInPlay || inPlay.has(id)))
        .map(([id]) => id);
      return (
        <div className="space-y-2">
          <div className="text-xs text-stone-400">
            Rôles à révéler ({roleIds.length})
          </div>
          <div className="bg-stone-900 ring-1 ring-stone-700 p-2 flex flex-wrap gap-2">
            {roleIds.length === 0 ? (
              <span className="text-stone-500 italic text-xs">Aucun</span>
            ) : (
              roleIds.map(id => (
                <span key={id} className="inline-flex items-center gap-1 text-xs text-stone-300 bg-stone-800 px-2 py-1 ring-1 ring-stone-700">
                  <RoleIcon roleId={id} size={16} />
                  {script.roles[id].name}
                </span>
              ))
            )}
          </div>
          <button
            onClick={() => {
              appendInfo({ kind: "role_list", roleIds });
              onValidated();
            }}
            className="w-full px-3 py-2 ring-1 ring-emerald-700 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs uppercase tracking-wide"
          >
            <Check className="w-3 h-3 inline mr-1" /> Transmettre
          </button>
        </div>
      );
    }
    case "pick_player":
      return (
        <PickPlayerForm
          game={game}
          self={player}
          label={action.label}
          count={action.count ?? 1}
          impaired={impaired}
          onSubmit={ids => {
            if (!impaired && action.effect) {
              for (const id of ids) {
                dispatch({ type: "ADD_REMINDER", storytellerId, playerId: id, token: action.effect });
              }
            }
            onValidated();
          }}
        />
      );
    case "manual":
      return (
        <div className="space-y-3">
          <div className="bg-stone-900 ring-1 ring-stone-700 p-3 text-stone-300 text-sm italic">
            {action.note}
          </div>
          <button
            onClick={onValidated}
            className="w-full px-3 py-2 ring-1 ring-emerald-700 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs uppercase tracking-wide"
          >
            <Check className="w-3 h-3 inline mr-1" /> Fait
          </button>
        </div>
      );
  }
}

// ─── Sub-forms ───────────────────────────────────────────────────────────────

function PlayerGrid({
  game,
  self,
  selected,
  onToggle,
  max,
}: {
  game: GameState;
  self: Player;
  selected: string[];
  onToggle: (id: string) => void;
  max: number;
}) {
  const script = SCRIPTS[game.scriptId];
  const targets = game.players.filter(p => !p.isStoryteller && p.id !== self.id);
  return (
    <div className="grid grid-cols-3 gap-2">
      {targets.map(p => {
        const sel = selected.includes(p.id);
        const full = !sel && selected.length >= max;
        const role = p.role ? script.roles[p.role] : null;
        return (
          <button
            key={p.id}
            disabled={!p.alive || full}
            onClick={() => onToggle(p.id)}
            className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs transition-all ${
              sel
                ? "bg-amber-900 ring-amber-600 text-amber-100"
                : "bg-stone-900 ring-stone-700 text-stone-300 hover:ring-stone-500"
            } ${!p.alive ? "opacity-40" : ""} ${full ? "opacity-30" : ""}`}
          >
            {p.role && <RoleIcon roleId={p.role} size={28} />}
            <div className="font-medium leading-none">{p.name}</div>
            {role && (
              <div className="text-[9px] text-stone-400 leading-none truncate w-full">
                {role.name}{p.role === "drunk" ? " 🍺" : ""}
              </div>
            )}
            {!p.alive && <div className="text-[9px] text-stone-500">mort</div>}
          </button>
        );
      })}
    </div>
  );
}

function RolePicker({
  scriptId,
  restrictTeam,
  allowNone,
  value,
  onChange,
}: {
  scriptId: string;
  restrictTeam?: import("@/data/scripts").Team;
  allowNone?: boolean;
  value: string;
  onChange: (id: string) => void;
}) {
  const script = SCRIPTS[scriptId];
  const roles = Object.entries(script.roles).filter(([, r]) =>
    restrictTeam ? r.team === restrictTeam : true
  );
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-2 py-2 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-sm"
    >
      <option value="">Choisir un rôle…</option>
      {allowNone && <option value="__none__">— Aucun —</option>}
      {roles.map(([id, r]) => (
        <option key={id} value={id}>
          {r.name}
        </option>
      ))}
    </select>
  );
}

function TwoPlayersOneRoleForm({
  game,
  self,
  restrictTeam,
  allowNone,
  fortune,
  onSubmit,
  onFortune,
}: {
  game: GameState;
  self: Player;
  restrictTeam?: import("@/data/scripts").Team;
  allowNone?: boolean;
  fortune?: boolean;
  onSubmit?: (a: string, b: string, roleId: string) => void;
  onFortune?: (a: string, b: string, result: boolean) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [roleId, setRoleId] = useState("");
  const [result, setResult] = useState<boolean | null>(null);

  const canSubmit = picked.length === 2 && (fortune ? result !== null : roleId !== "");

  return (
    <div className="space-y-2">
      <div className="text-xs text-stone-400">2 joueurs ({picked.length}/2)</div>
      <PlayerGrid
        game={game}
        self={self}
        selected={picked}
        onToggle={id =>
          setPicked(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 2 ? [...prev, id] : prev
          )
        }
        max={2}
      />
      {fortune ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setResult(true)}
            className={`p-2 ring-1 text-sm uppercase tracking-wide ${
              result === true
                ? "bg-emerald-900 ring-emerald-700 text-emerald-100"
                : "bg-stone-900 ring-stone-700 text-stone-400"
            }`}
          >
            OUI
          </button>
          <button
            onClick={() => setResult(false)}
            className={`p-2 ring-1 text-sm uppercase tracking-wide ${
              result === false
                ? "bg-red-900 ring-red-700 text-red-100"
                : "bg-stone-900 ring-stone-700 text-stone-400"
            }`}
          >
            NON
          </button>
        </div>
      ) : (
        <RolePicker
          scriptId={game.scriptId}
          restrictTeam={restrictTeam}
          allowNone={allowNone}
          value={roleId}
          onChange={setRoleId}
        />
      )}
      <button
        disabled={!canSubmit}
        onClick={() => {
          if (!canSubmit) return;
          if (fortune && onFortune) onFortune(picked[0], picked[1], result!);
          else if (onSubmit) onSubmit(picked[0], picked[1], roleId);
        }}
        className="w-full px-3 py-2 ring-1 ring-emerald-700 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs uppercase tracking-wide disabled:bg-stone-900 disabled:text-stone-600 disabled:ring-stone-800"
      >
        <Check className="w-3 h-3 inline mr-1" /> Transmettre
      </button>
    </div>
  );
}

function PlayerAndRoleForm({
  game,
  self,
  restrictTeam,
  onSubmit,
}: {
  game: GameState;
  self: Player;
  restrictTeam?: import("@/data/scripts").Team;
  onSubmit: (playerId: string, roleId: string) => void;
}) {
  const [pid, setPid] = useState<string>("");
  const [roleId, setRoleId] = useState("");
  return (
    <div className="space-y-2">
      <div className="text-xs text-stone-400">Joueur</div>
      <PlayerGrid
        game={game}
        self={self}
        selected={pid ? [pid] : []}
        onToggle={id => setPid(prev => (prev === id ? "" : id))}
        max={1}
      />
      <div className="text-xs text-stone-400 mt-2">Rôle révélé</div>
      <RolePicker scriptId={game.scriptId} restrictTeam={restrictTeam} value={roleId} onChange={setRoleId} />
      <button
        disabled={!pid || !roleId}
        onClick={() => onSubmit(pid, roleId)}
        className="w-full px-3 py-2 ring-1 ring-emerald-700 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs uppercase tracking-wide disabled:bg-stone-900 disabled:text-stone-600 disabled:ring-stone-800"
      >
        <Check className="w-3 h-3 inline mr-1" /> Transmettre
      </button>
    </div>
  );
}

function CountForm({
  label,
  existing,
  onSubmit,
}: {
  label: string;
  existing: RoleInfoEntry | undefined;
  onSubmit: (value: number) => void;
}) {
  const initial = existing && existing.kind === "count" ? existing.value : 0;
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-2">
      <div className="text-xs text-stone-400">{label}</div>
      <div className="flex items-center gap-2 justify-center">
        <button
          onClick={() => setValue(v => Math.max(0, v - 1))}
          className="w-12 h-12 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xl"
        >
          −
        </button>
        <div className="w-16 text-center text-3xl text-amber-200 font-mono">{value}</div>
        <button
          onClick={() => setValue(v => v + 1)}
          className="w-12 h-12 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xl"
        >
          +
        </button>
      </div>
      <button
        onClick={() => onSubmit(value)}
        className="w-full px-3 py-2 ring-1 ring-emerald-700 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs uppercase tracking-wide"
      >
        <Check className="w-3 h-3 inline mr-1" /> Transmettre
      </button>
    </div>
  );
}

function PickPlayerForm({
  game,
  self,
  label,
  count,
  impaired,
  onSubmit,
}: {
  game: GameState;
  self: Player;
  label: string;
  count: 1 | 2;
  impaired: boolean;
  onSubmit: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      <div className="text-xs text-stone-400">
        {label} ({picked.length}/{count})
      </div>
      <PlayerGrid
        game={game}
        self={self}
        selected={picked}
        onToggle={id =>
          setPicked(prev =>
            prev.includes(id)
              ? prev.filter(x => x !== id)
              : prev.length < count
              ? [...prev, id]
              : count === 1
              ? [id]
              : prev
          )
        }
        max={count}
      />
      {impaired && (
        <div className="text-amber-300 text-[11px] italic">
          Aucun effet ne sera appliqué automatiquement (pouvoir altéré).
        </div>
      )}
      <button
        disabled={picked.length !== count}
        onClick={() => onSubmit(picked)}
        className="w-full px-3 py-2 ring-1 ring-emerald-700 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 text-xs uppercase tracking-wide disabled:bg-stone-900 disabled:text-stone-600 disabled:ring-stone-800"
      >
        <Check className="w-3 h-3 inline mr-1" /> Valider
      </button>
    </div>
  );
}
