"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Moon, Sun, Eye, EyeOff, Skull, BookOpen, Users, ArrowLeft,
  Sparkles, UserPlus, Crown, FlaskConical, Gavel, X, ChevronDown, ChevronUp,
  PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";

function RoleIcon({ roleId, size = 40, className = "" }: { roleId: string; size?: number; className?: string }) {
  const [state, setState] = useState<"loading" | "ok" | "failed">("loading");
  return (
    <>
      {state !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://raw.githubusercontent.com/bra1n/townsquare/main/src/assets/icons/${roleId}.png`}
          alt=""
          width={size}
          height={size}
          className={`object-contain ${state === "loading" ? "opacity-0 absolute" : ""} ${className}`}
          onLoad={() => setState("ok")}
          onError={() => setState("failed")}
        />
      )}
    </>
  );
}
import { getPusherClient, channelName } from "@/lib/pusher-client";
import type { GameState, GameAction } from "@/lib/types";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(`bot:${code}`) : null;
    if (stored) setPlayerId(stored);
  }, [code]);

  useEffect(() => {
    let mounted = true;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName(code));
    channel.bind("state-update", (data: { state: GameState }) => {
      if (mounted) setGame(data.state);
    });
    fetch(`/api/game/${code}`)
      .then(res => {
        if (res.status === 404) throw new Error("Partie introuvable");
        return res.json();
      })
      .then(data => { if (mounted && data.state) setGame(data.state); })
      .catch(e => { if (mounted) setError(e.message); });
    return () => {
      mounted = false;
      channel.unbind_all();
      pusher.unsubscribe(channelName(code));
    };
  }, [code]);

  async function handleJoin() {
    if (!name.trim()) return;
    setJoining(true); setError(null);
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      localStorage.setItem(`bot:${code}`, data.playerId);
      setPlayerId(data.playerId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }

  async function dispatch(action: GameAction) {
    await fetch("/api/game/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, action }),
    });
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="text-stone-300 underline">Retour</button>
        </div>
      </div>
    );
  }

  if (!game) {
    return <div className="min-h-screen flex items-center justify-center text-stone-500">Chargement...</div>;
  }

  const me = playerId ? game.players.find(p => p.id === playerId) ?? null : null;

  if (!me) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <button onClick={() => router.push("/")} className="text-stone-400 text-sm mb-6 hover:text-stone-200">
          ← Quitter
        </button>
        <div className="text-center mb-6">
          <div className="text-xs tracking-[0.3em] uppercase text-stone-500 mb-2">Partie</div>
          <div className="text-4xl tracking-[0.4em] text-stone-100">{code}</div>
        </div>
        <div className="w-full max-w-sm">
          <label className="text-stone-400 text-xs tracking-[0.2em] uppercase mb-2 block">Ton nom</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="Aldric"
            className="w-full px-4 py-3 bg-stone-900 ring-1 ring-stone-700 text-stone-100 placeholder:text-stone-600 mb-3 focus:outline-none focus:ring-amber-700/60"
          />
          <button
            onClick={handleJoin}
            disabled={joining || !name.trim()}
            className="w-full p-3 bg-stone-700 hover:bg-stone-600 disabled:bg-stone-800 text-stone-100 ring-1 ring-stone-600 tracking-[0.2em] uppercase text-sm flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> {joining ? "..." : "Rejoindre"}
          </button>
          {game.players.length > 0 && (
            <div className="mt-6">
              <div className="text-stone-500 text-xs uppercase tracking-wider mb-2">Déjà à la table</div>
              <div className="flex flex-wrap gap-2">
                {game.players.map(p => (
                  <span key={p.id} className="text-xs bg-stone-900 ring-1 ring-stone-700 px-3 py-1 text-stone-300">{p.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (game.phase === "lobby")
    return <Lobby game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />;
  if (me.isStoryteller)
    return <StorytellerView game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />;
  return <PlayerView game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />;
}

function ScriptReference({ scriptId, onClose }: { scriptId: string; onClose: () => void }) {
  const script = SCRIPTS[scriptId];
  const [expanded, setExpanded] = useState<string | null>(null);
  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon"];
  const teamLabels: Record<Team, string> = {
    townsfolk: "Townsfolk", outsider: "Outsiders", minion: "Minions", demon: "Démon",
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
              <div className={`text-xs uppercase tracking-[0.3em] mb-3 ${tc.text} opacity-80`}>{teamLabels[team]}</div>
              <div className="space-y-2">
                {roles.map(([id, role]) => {
                  const open = expanded === id;
                  // ─── PATCH : quand un rôle est sélectionné, on ne bascule plus
                  // sur `tc.bg` (qui était `bg-stone-100` = blanc pétant pour
                  // les Bons). On garde un fond sombre, et on signale la
                  // sélection par un fond stone-800 + le ring d'équipe.
                  return (
                    <div key={id}
                      className={`ring-1 transition-all cursor-pointer ${open ? `bg-stone-800/70 ${tc.ring}` : "bg-stone-900 ring-stone-800"}`}
                      onClick={() => setExpanded(open ? null : id)}>
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <RoleIcon roleId={id} size={32} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm italic ${open ? tc.text : "text-stone-200"}`}>{role.name}</span>
                          {!open && <p className="text-xs text-stone-500 mt-0.5 leading-relaxed line-clamp-1">{role.ability}</p>}
                        </div>
                        {open
                          ? <ChevronUp className="w-3 h-3 text-stone-500 flex-shrink-0" />
                          : <ChevronDown className="w-3 h-3 text-stone-500 flex-shrink-0" />}
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

function Lobby({ game, me, dispatch, onLeave }: any) {
  const script = SCRIPTS[game.scriptId];
  const isStoryteller = game.players[0]?.id === me.id;
  const playableCount = game.players.length - 1;
  const canStart = playableCount >= 5 && isStoryteller;

  const [step, setStep] = useState<"players" | "roles" | "drunk" | "lunatic" | "bluffs">("players");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [drunkFakeRoleId, setDrunkFakeRoleId] = useState<string | null>(null);
  const [lunaticFakeDemonId, setLunaticFakeDemonId] = useState<string | null>(null);
  const [demonBluffRoleIds, setDemonBluffRoleIds] = useState<string[]>([]);
  const [prefillRoleInfo, setPrefillRoleInfo] = useState(false);

  const needed = playableCount;
  const selectedCount = selectedRoleIds.length;

  const toggleRole = (id: string) => {
    setSelectedRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon"];
  const teamLabels: Record<Team, string> = {
    townsfolk: "Townsfolk", outsider: "Outsiders", minion: "Minions", demon: "Démon",
  };

  const hasDemonInRoles = (roleIds: string[]) =>
    roleIds.some(id => script.roles[id]?.team === "demon");

  const launchGame = (roleIds: string[], fakeRoleId: string | null, lunaticDemonId: string | null, bluffIds: string[]) => {
    dispatch({
      type: "START_GAME",
      storytellerId: me.id,
      selectedRoleIds: roleIds,
      drunkFakeRoleId: fakeRoleId,
      lunaticFakeDemonId: lunaticDemonId,
      demonBluffRoleIds: bluffIds.length === 3 ? [bluffIds[0], bluffIds[1], bluffIds[2]] : null,
      prefillRoleInfo,
    });
  };

  const launch = (roleIds: string[]) => {
    if (roleIds.includes("drunk")) {
      const opts = Object.keys(script.roles).filter(
        id => script.roles[id].team === "townsfolk" && !roleIds.includes(id)
      );
      if (opts.length > 0) {
        setStep("drunk");
        return;
      }
    }
    if (roleIds.includes("lunatic") && hasDemonInRoles(roleIds)) {
      setStep("lunatic");
      return;
    }
    if (hasDemonInRoles(roleIds)) {
      setStep("bluffs");
      return;
    }
    launchGame(roleIds, null, null, []);
  };

  const bluffCandidates = Object.entries(script.roles)
    .filter(([id, r]) => r.team === "townsfolk" && !selectedRoleIds.includes(id))
    .map(([id, r]) => ({ id, ...r }));

  const fakeRoleOptions = Object.entries(script.roles)
    .filter(([id, r]) => r.team === "townsfolk" && !selectedRoleIds.includes(id))
    .map(([id, r]) => ({ id, ...r }));

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onLeave} className="flex items-center gap-2 text-stone-400 hover:text-stone-200 mb-6">
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Quitter</span>
        </button>

        <div className="text-center mb-8">
          <div className="text-xs tracking-[0.3em] uppercase text-stone-500 mb-2">Code de partie</div>
          <div className="text-5xl tracking-[0.4em] text-stone-100 mb-4">{game.code}</div>
          <div className="text-stone-400 text-sm italic">{script.name}</div>
          <p className="text-stone-600 text-xs mt-2">Partage ce code avec les autres joueurs</p>
        </div>

        <div className="bg-stone-900 ring-1 ring-stone-700 p-4 mb-6">
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" /> Joueurs ({game.players.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {game.players.map((p: any, i: number) => (
              <div key={p.id}
                className={`inline-flex items-center gap-2 px-3 py-1 ring-1 ${p.id === me.id ? "bg-amber-900/30 ring-amber-700/50 text-amber-100" : "bg-stone-800 ring-stone-700 text-stone-200"}`}>
                {i === 0 && <Crown className="w-3 h-3 text-amber-400" />}
                <span className="text-sm">{p.name}</span>
                {i === 0 && <span className="text-[10px] text-amber-400 uppercase tracking-wider">GM</span>}
                {p.id === me.id && <span className="text-xs text-amber-300">(toi)</span>}
              </div>
            ))}
          </div>
          <p className="text-stone-600 text-xs mt-3 italic">
            Le 1er joueur est le Conteur (GM) et ne joue pas. Min. 5 autres joueurs.
          </p>
        </div>

        {isStoryteller && canStart && step === "players" && (
          <>
            <div className="bg-amber-950/30 ring-1 ring-amber-800/40 p-3 mb-4 text-xs text-amber-200/80 leading-relaxed rounded">
              <span className="text-amber-400 font-medium">👑 Tu es le Game Master.</span> Tu ne joues pas — tu gères la partie. {needed} rôles seront distribués aux autres joueurs.
            </div>
            <button
              onClick={() => setPrefillRoleInfo(v => !v)}
              className={`w-full flex items-center gap-3 p-3 mb-4 ring-1 text-left transition-all ${
                prefillRoleInfo
                  ? "bg-stone-800 ring-indigo-700/60 text-indigo-200"
                  : "bg-stone-900 ring-stone-700 text-stone-400 hover:ring-stone-600"
              }`}
            >
              <div className={`w-4 h-4 flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                prefillRoleInfo ? "bg-indigo-700 border-indigo-600" : "border-stone-600"
              }`}>
                {prefillRoleInfo && <span className="text-[10px] font-bold text-white leading-none">✓</span>}
              </div>
              <div>
                <div className="text-sm">Pré-remplir les infos de rôle</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Génère automatiquement bluffs, lavandière, grand-mère… au lancement
                </div>
              </div>
            </button>
            <button onClick={() => setStep("roles")}
              className="w-full p-4 bg-stone-800 hover:bg-stone-700 text-stone-100 ring-1 ring-stone-600 tracking-[0.2em] uppercase text-sm mb-3 flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" /> Configurer les rôles
            </button>
            <button onClick={() => launch([])}
              className="w-full p-4 bg-red-900/60 hover:bg-red-900 text-stone-300 hover:text-stone-100 ring-1 ring-red-900/50 tracking-[0.2em] uppercase text-xs transition-all">
              Lancer avec rôles aléatoires
            </button>
          </>
        )}

        {isStoryteller && step === "roles" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-stone-400 text-xs tracking-[0.2em] uppercase flex items-center gap-2">
                <BookOpen className="w-3 h-3" /> Choix des rôles
              </div>
              <div className={`text-sm font-medium ${selectedCount === needed ? "text-amber-400" : selectedCount > needed ? "text-red-400" : "text-stone-400"}`}>
                {selectedCount}/{needed}
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
                        <button key={id} onClick={() => toggleRole(id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 ring-1 transition-all text-left ${
                            checked ? `bg-stone-800/70 ${tc.ring} ${tc.text}` : "bg-stone-900 ring-stone-800 text-stone-400 hover:ring-stone-600"
                          }`}>
                          <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center text-[10px] font-bold transition-all ${
                            checked ? `${tc.accent} border-transparent text-stone-100` : "border-stone-600 bg-transparent"
                          }`}>
                            {checked && "✓"}
                          </div>
                          <RoleIcon roleId={id} size={28} className="flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm italic ${checked ? tc.text : "text-stone-300"}`}>{role.name}</div>
                            <div className="text-xs text-stone-500 leading-tight mt-0.5 line-clamp-1">{role.ability}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setStep("players"); setSelectedRoleIds([]); }}
                className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm">
                ← Annuler
              </button>
              <button onClick={() => launch(selectedRoleIds)} disabled={selectedCount !== needed}
                className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all">
                {selectedCount === needed ? "Lancer la partie" : `${needed - selectedCount} rôle(s) manquant(s)`}
              </button>
            </div>
          </div>
        )}

        {isStoryteller && step === "drunk" && (
          <div className="mb-4">
            <div className="bg-amber-950/40 ring-1 ring-amber-800/40 p-4 mb-6 rounded">
              <div className="text-amber-400 font-medium text-sm mb-2">🍺 Drunk est en jeu</div>
              <p className="text-stone-300 text-sm leading-relaxed">
                Le Drunk pense être un Townsfolk. Choisis le rôle qu’il <em>croit</em> avoir — il verra cette capacité, mais ses informations seront fausses.
              </p>
            </div>
            <div className="text-stone-400 text-xs uppercase tracking-[0.2em] mb-3">Le Drunk pense être…</div>
            <div className="space-y-2 mb-6">
              {fakeRoleOptions.map(role => {
                const tc = TEAM_COLORS.townsfolk;
                const sel = drunkFakeRoleId === role.id;
                return (
                  <button key={role.id} onClick={() => setDrunkFakeRoleId(role.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left transition-all ${
                      sel ? `bg-stone-800/70 ring-amber-700/60 ${tc.text}` : "bg-stone-900 ring-stone-800 text-stone-300 hover:ring-stone-600"
                    }`}>
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                      sel ? "border-amber-700 bg-amber-700" : "border-stone-600"
                    }`}>
                      {sel && <div className="w-1.5 h-1.5 rounded-full bg-stone-100" />}
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
              <button onClick={() => { setStep("roles"); setDrunkFakeRoleId(null); }}
                className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm">
                ← Retour
              </button>
              <button
                onClick={() => {
                  if (selectedRoleIds.includes("lunatic") && hasDemonInRoles(selectedRoleIds)) {
                    setStep("lunatic");
                  } else if (hasDemonInRoles(selectedRoleIds)) {
                    setStep("bluffs");
                  } else {
                    launchGame(selectedRoleIds, drunkFakeRoleId, null, []);
                  }
                }}
                disabled={!drunkFakeRoleId}
                className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all">
                {(selectedRoleIds.includes("lunatic") && hasDemonInRoles(selectedRoleIds)) || hasDemonInRoles(selectedRoleIds) ? "Suivant →" : "Confirmer et lancer"}
              </button>
            </div>
          </div>
        )}

        {isStoryteller && step === "lunatic" && (() => {
          const demonOptions = selectedRoleIds
            .filter(id => script.roles[id]?.team === "demon")
            .map(id => ({ id, ...script.roles[id] }));
          return (
            <div className="mb-4">
              <div className="bg-rose-950/40 ring-1 ring-rose-800/40 p-4 mb-6 rounded">
                <div className="text-rose-400 font-medium text-sm mb-2">🌙 Lunatique est en jeu</div>
                <p className="text-stone-300 text-sm leading-relaxed">
                  Le Lunatique croit être le Démon. Choisis quel Démon il pense être.
                </p>
              </div>
              <div className="text-stone-400 text-xs uppercase tracking-[0.2em] mb-3">Le Lunatique pense être…</div>
              <div className="space-y-2 mb-6">
                {demonOptions.map(role => {
                  const sel = lunaticFakeDemonId === role.id;
                  return (
                    <button key={role.id} onClick={() => setLunaticFakeDemonId(role.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left transition-all ${
                        sel ? "bg-stone-800/70 ring-rose-700/60 text-rose-200" : "bg-stone-900 ring-stone-800 text-stone-300 hover:ring-stone-600"
                      }`}>
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                        sel ? "border-rose-700 bg-rose-700" : "border-stone-600"
                      }`}>
                        {sel && <div className="w-1.5 h-1.5 rounded-full bg-stone-100" />}
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
                <button onClick={() => { setStep(selectedRoleIds.includes("drunk") ? "drunk" : "roles"); setLunaticFakeDemonId(null); }}
                  className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm">
                  ← Retour
                </button>
                <button
                  onClick={() => {
                    if (hasDemonInRoles(selectedRoleIds)) { setStep("bluffs"); }
                    else { launchGame(selectedRoleIds, drunkFakeRoleId, lunaticFakeDemonId, []); }
                  }}
                  disabled={!lunaticFakeDemonId}
                  className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all">
                  {hasDemonInRoles(selectedRoleIds) ? "Suivant →" : "Confirmer et lancer"}
                </button>
              </div>
            </div>
          );
        })()}

        {isStoryteller && step === "bluffs" && (
          <div className="mb-4">
            <div className="bg-red-950/40 ring-1 ring-red-800/40 p-4 mb-6 rounded">
              <div className="text-red-400 font-medium text-sm mb-2">😈 Bluffs du Démon</div>
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
                      if (sel) {
                        setDemonBluffRoleIds(prev => prev.filter(x => x !== role.id));
                      } else if (!disabled) {
                        setDemonBluffRoleIds(prev => [...prev, role.id]);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left transition-all ${
                      sel
                        ? `bg-stone-800/70 ring-red-700/60 ${tc.text}`
                        : disabled
                        ? "bg-stone-950 ring-stone-800 text-stone-600 cursor-not-allowed"
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
                  const prev = selectedRoleIds.includes("lunatic") ? "lunatic"
                    : selectedRoleIds.includes("drunk") ? "drunk" : "roles";
                  setStep(prev);
                  setDemonBluffRoleIds([]);
                }}
                className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm">
                ← Retour
              </button>
              <button
                onClick={() => launchGame(selectedRoleIds, drunkFakeRoleId, lunaticFakeDemonId, demonBluffRoleIds)}
                disabled={demonBluffRoleIds.length !== 3}
                className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all">
                {demonBluffRoleIds.length === 3 ? "Confirmer et lancer" : `${3 - demonBluffRoleIds.length} bluff(s) manquant(s)`}
              </button>
            </div>
          </div>
        )}

        {!isStoryteller && (
          <div className="text-center text-stone-500 text-sm italic">En attente du Conteur…</div>
        )}
        {isStoryteller && !canStart && step === "players" && (
          <div className="text-center text-stone-500 text-sm italic">
            En attente de joueurs ({Math.max(0, 5 - needed)} manquants, min. 5 hors GM)…
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  RoleInfoEditor — Permet au GM d'ajouter/supprimer des entrées RoleInfo
//  sur un joueur sélectionné dans le panneau latéral.
// ═══════════════════════════════════════════════════════════════════════
function RoleInfoEditor({ player, allPlayers, scriptId, onSave }: {
  player: any;
  allPlayers: any[];
  scriptId: string;
  onSave: (info: any[]) => void;
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

  const nonSt = allPlayers.filter((p: any) => !p.isStoryteller && p.id !== player.id);
  const roleInfo: any[] = player.roleInfo ?? [];

  const resetForm = () => {
    setTextContent(""); setCountLabel(""); setCountValue(0);
    setPlayerAId(""); setPlayerBId(""); setRoleId(""); setPickedRoleIds([]);
    setFortuneResult(true); setKind("text"); setEditing(false);
  };

  const addEntry = () => {
    let entry: any;
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
      default: return;
    }
    onSave([...roleInfo, entry]);
    resetForm();
  };

  const getPlayerName = (id: string) => allPlayers.find((p: any) => p.id === id)?.name ?? "?";

  return (
    <div className="mt-3 pt-3 border-t border-stone-700">
      {roleInfo.length > 0 && (
        <div className="mb-3">
          <div className="text-xs uppercase text-stone-400 tracking-wider mb-2">Infos du joueur</div>
          <div className="space-y-1.5">
            {roleInfo.map((entry: any, i: number) => (
              <div key={i} className="flex items-start gap-2 bg-stone-800 ring-1 ring-stone-700 p-2 text-xs">
                <div className="flex-1 text-stone-300 min-w-0">
                  {entry.kind === "bluffs" && (
                    <div className="flex gap-1 items-center flex-wrap">
                      <span className="text-stone-500 mr-1">Bluffs:</span>
                      {(entry.roleIds as string[]).map((id: string) => (
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
                    <span>{getPlayerName(entry.playerAId)} / {getPlayerName(entry.playerBId)} → <strong>{entry.result ? "OUI" : "NON"}</strong> (Devin)</span>
                  )}
                  {entry.kind === "two_players_one_role" && entry.result === undefined && (
                    <span>{getPlayerName(entry.playerAId)} / {getPlayerName(entry.playerBId)} → {script.roles[entry.roleId]?.name ?? entry.roleId}</span>
                  )}
                  {entry.kind === "player_and_role" && (
                    <span>{getPlayerName(entry.playerId)} → {entry.label ?? (script.roles[entry.roleId]?.name ?? entry.roleId)}</span>
                  )}
                  {entry.kind === "role_list" && (
                    <span>Rôles: {(entry.roleIds as string[]).map((id: string) => script.roles[id]?.name ?? id).join(", ") || "aucun"}</span>
                  )}
                </div>
                <button onClick={() => onSave(roleInfo.filter((_: any, idx: number) => idx !== i))}
                  className="text-stone-500 hover:text-red-400 p-0.5 flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!editing ? (
        <button onClick={() => setEditing(true)}
          className="w-full p-2 text-xs uppercase tracking-wider bg-stone-800 ring-1 ring-stone-700 text-stone-400 hover:text-stone-200 hover:ring-stone-500 transition-all">
          + Ajouter une info
        </button>
      ) : (
        <div className="bg-stone-800 ring-1 ring-stone-700 p-3 space-y-2">
          <div className="text-xs uppercase text-stone-400 tracking-wider">Type d'info</div>
          <select value={kind} onChange={e => setKind(e.target.value)}
            className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs">
            <option value="bluffs">Bluffs Démon (3 rôles)</option>
            <option value="two_players_one_role">2 joueurs + 1 rôle</option>
            <option value="fortune_result">Devin — 2 joueurs + OUI/NON</option>
            <option value="player_and_role">1 joueur + 1 rôle</option>
            <option value="role_list">Liste de rôles</option>
            <option value="count">Nombre</option>
            <option value="text">Note libre</option>
          </select>

          {kind === "text" && (
            <input value={textContent} onChange={e => setTextContent(e.target.value)}
              placeholder="Note…"
              className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs" />
          )}
          {kind === "count" && (
            <div className="flex gap-2">
              <input value={countLabel} onChange={e => setCountLabel(e.target.value)}
                placeholder="Étiquette (ex: Paires maléfiques)"
                className="flex-1 px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs" />
              <input type="number" value={countValue} onChange={e => setCountValue(parseInt(e.target.value) || 0)}
                className="w-16 px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs text-center" />
            </div>
          )}
          {(kind === "two_players_one_role" || kind === "player_and_role" || kind === "fortune_result") && (
            <>
              <select value={playerAId} onChange={e => setPlayerAId(e.target.value)}
                className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs">
                <option value="">Joueur A…</option>
                {nonSt.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {(kind === "two_players_one_role" || kind === "fortune_result") && (
                <select value={playerBId} onChange={e => setPlayerBId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs">
                  <option value="">Joueur B…</option>
                  {nonSt.filter((p: any) => p.id !== playerAId).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {kind === "fortune_result" && (
                <div className="flex gap-2">
                  <button onClick={() => setFortuneResult(true)}
                    className={`flex-1 p-1.5 text-xs ring-1 ${fortuneResult ? "bg-green-900 ring-green-700 text-green-100" : "bg-stone-900 ring-stone-700 text-stone-400"}`}>
                    OUI
                  </button>
                  <button onClick={() => setFortuneResult(false)}
                    className={`flex-1 p-1.5 text-xs ring-1 ${!fortuneResult ? "bg-red-900 ring-red-700 text-red-100" : "bg-stone-900 ring-stone-700 text-stone-400"}`}>
                    NON
                  </button>
                </div>
              )}
              {kind === "two_players_one_role" && (
                <select value={roleId} onChange={e => setRoleId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs">
                  <option value="">Rôle…</option>
                  {Object.entries(script.roles).map(([id, r]) => <option key={id} value={id}>{r.name}</option>)}
                </select>
              )}
              {kind === "player_and_role" && (
                <select value={roleId} onChange={e => setRoleId(e.target.value)}
                  className="w-full px-2 py-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-200 text-xs">
                  <option value="">Rôle…</option>
                  {Object.entries(script.roles).map(([id, r]) => <option key={id} value={id}>{r.name}</option>)}
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
                    <button key={id}
                      onClick={() => {
                        if (checked) setPickedRoleIds(prev => prev.filter(x => x !== id));
                        else if (pickedRoleIds.length < limit) setPickedRoleIds(prev => [...prev, id]);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1 text-xs text-left ring-1 transition-all ${
                        checked ? "bg-stone-700 ring-stone-500 text-stone-100" : "bg-stone-900 ring-stone-800 text-stone-400"
                      }`}>
                      <span className={`w-3 h-3 flex-shrink-0 border ${checked ? "bg-amber-700 border-transparent" : "border-stone-600"}`} />
                      {r.name}
                    </button>
                  );
                })}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={resetForm}
              className="flex-1 p-1.5 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-xs">
              Annuler
            </button>
            <button onClick={addEntry}
              className="flex-1 p-1.5 bg-amber-900/60 ring-1 ring-amber-700/50 text-amber-100 text-xs hover:bg-amber-900 transition-all">
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  StorytellerView : table + drawer rétractable
//
//  Refonte ergo :
//    - Le Grimoire (cercle) prend par défaut TOUTE la largeur (max-w-7xl)
//    - La sidebar devient un `drawer` à droite, masqué par défaut
//    - On ouvre le drawer :
//        (a) automatiquement quand on tape un joueur
//        (b) manuellement via le bouton `Panneau` du header
//        (c) automatiquement en phase `night` pour voir l'ordre nocturne
//          (mais on peut le fermer)
//    - Quand le drawer est fermé, le rayon du cercle est plus grand
//      (`Math.min(320, …)`) → vraie sensation de "vue d'ensemble"
//    - Quand le drawer est ouvert, le rayon est réduit (`Math.min(220, …)`)
//      pour laisser physiquement la place au panneau (lg+)
//
//  L'ouverture auto en phase nuit est utile car le Conteur veut voir l'ordre
//  ET le cercle en même temps. Mais l'utilisateur peut fermer pour gagner
//  de l'espace, c'est juste un défaut.
// ═══════════════════════════════════════════════════════════════════════
function StorytellerView({ game, me, dispatch, onLeave }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [vw, setVw] = useState(800);
  const [vh, setVh] = useState(600);
  useEffect(() => {
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const selected = game.players.find((p: any) => p.id === selectedId);

  const playablePlayers = game.players.filter((p: any) => !p.isStoryteller);

  const isFirstNight = game.day === 1;
  const nightOrder = playablePlayers
    .filter((p: any) => p.alive && p.role)
    .map((p: any) => {
      const realRoleId = p.role;
      const displayRoleId = p.displayRole || p.role;
      const orderRoleId = (realRoleId === "drunk" || realRoleId === "lunatic") ? displayRoleId : realRoleId;
      const orderRole = ROLES[orderRoleId];
      if (!orderRole) return null;
      const order = isFirstNight ? orderRole.firstNight : orderRole.otherNight;
      if (order == null) return null;
      return { player: p, realRole: ROLES[realRoleId], order };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => a.order - b.order);

  // Ouverture auto quand on sélectionne un joueur (pour révéler les actions)
  useEffect(() => {
    if (selectedId) setPanelOpen(true);
  }, [selectedId]);

  // Ouverture auto au passage en phase nuit (utile pour l'ordre nocturne)
  useEffect(() => {
    if (game.phase === "night") setPanelOpen(true);
  }, [game.phase]);

  const availW = panelOpen ? Math.max(vw - 360, 200) : vw - 32;
  const availH = vh - 200;
  const screenMax = Math.min(availW, availH) * 0.42;
  const radius = Math.max(90, Math.min(playablePlayers.length * 16, screenMax));
  const iconBox = Math.max(60, Math.min(88, Math.round(radius * 0.42 + 22)));
  const iconSize = Math.round(iconBox * 0.65);
  const center = radius + iconBox / 2 + 24;
  const size = center * 2;

  const closePanel = () => {
    setSelectedId(null);
    setPanelOpen(false);
  };

  return (
    <div className="min-h-[100dvh] px-2 sm:px-4 pb-6 pt-3 flex flex-col">
      {showScript && <ScriptReference scriptId={game.scriptId} onClose={() => setShowScript(false)} />}

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-4 max-w-7xl w-full mx-auto gap-2">
        <button onClick={onLeave} className="flex items-center gap-2 text-stone-400 hover:text-stone-200">
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm hidden sm:inline">Quitter</span>
        </button>
        <div className="text-stone-500 text-xs tracking-[0.2em] uppercase hidden md:block">
          Conteur · {game.code}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowScript(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider">
            <BookOpen className="w-3 h-3" /> <span className="hidden sm:inline">Rôles</span>
          </button>
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase hidden sm:block">
            {game.phase === "day" ? "Jour" : "Nuit"} {game.day}
          </div>
          <button onClick={() => dispatch({ type: "TOGGLE_PHASE", storytellerId: me.id })}
            className={`flex items-center gap-2 px-4 py-2 ring-1 ${
              game.phase === "day" ? "bg-amber-900/30 ring-amber-700/50 text-amber-100" : "bg-indigo-950 ring-indigo-800 text-indigo-100"
            }`}>
            {game.phase === "day" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm">{game.phase === "day" ? "Jour" : "Nuit"}</span>
          </button>
          {/* ─── Toggle drawer ─── */}
          <button
            onClick={() => setPanelOpen(o => !o)}
            aria-label={panelOpen ? "Fermer le panneau" : "Ouvrir le panneau"}
            className={`flex items-center justify-center w-10 h-10 ring-1 transition-all ${
              panelOpen
                ? "bg-amber-950/40 ring-amber-700/50 text-amber-200"
                : "bg-stone-900 ring-stone-700 text-stone-400 hover:text-stone-200"
            }`}>
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── Grimoire pleine largeur, centré verticalement ─── */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 text-stone-400 text-xs tracking-[0.3em] uppercase">
            <BookOpen className="w-3 h-3" /> Grimoire
          </div>
        </div>
        <div className="relative" style={{ width: size, height: size, maxWidth: "100%" }}>
          <div className="absolute rounded-full ring-1 ring-stone-700/40" style={{ inset: Math.round(size * 0.1) }} />
          <div className="absolute rounded-full ring-1 ring-stone-800/40" style={{ inset: Math.round(size * 0.18) }} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Skull className="w-10 h-10 text-stone-700" strokeWidth={1.2} />
          </div>
          {playablePlayers.map((p: any, i: number) => {
            const angle = (i / playablePlayers.length) * 2 * Math.PI - Math.PI / 2;
            const half = iconBox / 2;
            const x = center + radius * Math.cos(angle) - half;
            const y = center + radius * Math.sin(angle) - half;
            const role = ROLES[p.role!];
            const team = TEAM_COLORS[role.team as Team];
            const isNominee = game.nominee === p.id;
            const isDrunk = p.role === "drunk";
            return (
              <button key={p.id} onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                className="absolute" style={{ left: x, top: y }}>
                <div className={`rounded-full ${team.bg} ring-2 flex flex-col items-center justify-center transition-all relative ${
                  selectedId === p.id ? "scale-110 ring-amber-400"
                  : isNominee ? "ring-orange-400"
                  : team.ring
                } ${!p.alive ? "opacity-40 grayscale" : ""}`} style={{ width: iconBox, height: iconBox }}>
                  <RoleIcon roleId={p.role!} size={iconSize} />
                  <div className={`text-[8px] font-medium ${team.text} px-1 text-center leading-tight`}>
                    {role.name}{isDrunk ? " 🍺" : ""}
                  </div>
                  {!p.alive && (
                    <div className="absolute inset-0 rounded-full bg-stone-900/70 flex items-center justify-center">
                      <Skull className="w-6 h-6 text-stone-500" />
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
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Backdrop : tape à côté du drawer pour le fermer ─── */}
      {panelOpen && (
        <div
          onClick={closePanel}
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-[2px] transition-opacity"
          aria-hidden
        />
      )}

      {/* ─── Drawer rétractable ─── */}
      <aside
        aria-hidden={!panelOpen}
        className={`fixed inset-y-0 right-0 w-full sm:max-w-sm z-30 bg-stone-950/95 backdrop-blur-md ring-1 ring-stone-800 overflow-y-auto transition-transform duration-300 ease-out ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-stone-800 sticky top-0 bg-stone-950/95 backdrop-blur-md z-10"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
        >
          <div className="text-stone-400 text-xs uppercase tracking-[0.2em]">Panneau</div>
          <button
            onClick={closePanel}
            aria-label="Fermer le panneau"
            className="text-stone-300 hover:text-stone-100 p-2 -mr-1 ring-1 ring-stone-700 hover:ring-stone-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          {selected ? (
            // ─── Card joueur sélectionné (PATCH : fond sombre, plus de blanc) ─
            <div className="bg-stone-900 text-stone-100 p-4 ring-1 ring-amber-900/40">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs uppercase text-stone-400">Joueur</div>
                  <div className="text-2xl text-stone-100">{selected.name}</div>
                  {selected.role === "drunk" && (
                    <div className="text-xs text-amber-300 mt-0.5">
                      🍺 Drunk — pense être {ROLES[selected.displayRole!]?.name}
                    </div>
                  )}
                </div>
                <button onClick={() => setSelectedId(null)} className="text-stone-400 hover:text-stone-100 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="border-t border-stone-700 pt-3 mb-3">
                <div className="flex items-start gap-3">
                  <RoleIcon roleId={selected.role!} size={56} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-2 h-2 rounded-full ${TEAM_COLORS[ROLES[selected.role!].team as Team].accent}`} />
                      <span className="text-xs uppercase text-stone-300">
                        {TEAM_COLORS[ROLES[selected.role!].team as Team].label}
                      </span>
                    </div>
                    <div className={`text-lg italic mb-1 ${TEAM_COLORS[ROLES[selected.role!].team as Team].text}`}>{ROLES[selected.role!].name}</div>
                    <p className="text-xs text-stone-400 leading-relaxed">{ROLES[selected.role!].ability}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => dispatch({ type: "TOGGLE_ALIVE", playerId: selected.id, storytellerId: me.id })}
                  className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide transition-all ${
                    !selected.alive ? "bg-stone-800 ring-stone-600 text-stone-300" : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-stone-700"
                  }`}>
                  {selected.alive
                    ? <Sparkles className="w-4 h-4 text-amber-400" />
                    : <Skull className="w-4 h-4 text-stone-400" />}
                  {selected.alive ? "Tuer" : "Vivant"}
                </button>
                <button onClick={() => selected.alive && dispatch({ type: "TOGGLE_POISON", playerId: selected.id, storytellerId: me.id })}
                  disabled={!selected.alive}
                  className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide transition-all disabled:opacity-40 ${
                    selected.poisoned ? "bg-purple-900 ring-purple-700 text-purple-200" : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-purple-900/40"
                  }`}>
                  <FlaskConical className="w-4 h-4" />
                  {selected.poisoned ? "Empoisonné" : "Empoisonner"}
                </button>
                <button onClick={() => selected.alive && dispatch({
                    type: "SET_NOMINEE",
                    playerId: game.nominee === selected.id ? null : selected.id,
                    storytellerId: me.id,
                  })}
                  disabled={!selected.alive}
                  className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide transition-all disabled:opacity-40 ${
                    game.nominee === selected.id ? "bg-orange-900 ring-orange-700 text-orange-200" : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-orange-900/40"
                  }`}>
                  <Gavel className="w-4 h-4" />
                  {game.nominee === selected.id ? "Nominé" : "Nominer"}
                </button>
              </div>
              <RoleInfoEditor
                player={selected}
                allPlayers={game.players}
                scriptId={game.scriptId}
                onSave={(roleInfo) => dispatch({
                  type: "SET_ROLE_INFO",
                  storytellerId: me.id,
                  playerId: selected.id,
                  roleInfo,
                })}
              />
            </div>
          ) : (
            // ─── Placeholder (PATCH : fond sombre cohérent) ──────────────────
            <div className="bg-stone-900 text-stone-300 p-4 ring-1 ring-stone-700 text-center">
              <BookOpen className="w-7 h-7 mx-auto mb-2 text-stone-500" />
              <p className="text-sm italic text-stone-500">Touche un joueur pour le gérer</p>
            </div>
          )}

          {game.nominee && (
            <div className="bg-orange-950/50 ring-1 ring-orange-800 p-3">
              <div className="text-orange-300 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Gavel className="w-3 h-3" /> Nomination en cours
              </div>
              <div className="text-stone-100 font-medium">
                {game.players.find((p: any) => p.id === game.nominee)?.name}
              </div>
              <button onClick={() => dispatch({ type: "CLEAR_NOMINATION", storytellerId: me.id })}
                className="text-orange-400 text-xs underline mt-1">Annuler</button>
            </div>
          )}

          {game.phase === "night" && (
            // ─── Ordre de la nuit (PATCH : couleurs lisibles grâce au nouveau
            // tc.text qui n'est plus `text-amber-950`/presque-noir) ──────────
            <div className="bg-indigo-950/60 ring-1 ring-indigo-900 p-4">
              <div className="text-indigo-300 text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <Moon className="w-3 h-3" /> Ordre de la nuit {game.day}
              </div>
              {nightOrder.length === 0 ? (
                <p className="text-stone-500 text-xs italic">Aucune action cette nuit.</p>
              ) : (
                <ol className="space-y-2">
                  {nightOrder.map(({ player, realRole }: any, i: number) => {
                    const tc = TEAM_COLORS[realRole.team as Team];
                    const isDrunk = player.role === "drunk";
                    return (
                      <li key={player.id} className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full ${tc.accent} text-stone-50 text-[10px] font-bold flex items-center justify-center flex-shrink-0`}>
                          {i + 1}
                        </span>
                        <RoleIcon roleId={player.role!} size={24} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium ${tc.text}`}>
                            {realRole.name}{isDrunk ? " 🍺" : ""}
                          </div>
                          <div className="text-stone-400 text-xs">{player.name}</div>
                        </div>
                        {(player.poisoned || isDrunk) && (
                          <FlaskConical className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  RoleInfoDisplay — Affiche les informations de rôle reçues (bluffs,
//  infos lavandière, grand-mère, etc.) dans la vue joueur.
// ═══════════════════════════════════════════════════════════════════════
function RoleInfoDisplay({ roleInfo, players, scriptId }: {
  roleInfo: any[];
  players: any[];
  scriptId: string;
}) {
  const script = SCRIPTS[scriptId];
  if (!roleInfo || roleInfo.length === 0) return null;

  const getPlayerName = (id: string) => players.find((p: any) => p.id === id)?.name ?? "?";

  return (
    <div className="max-w-md mx-auto mt-4 bg-indigo-950/40 ring-1 ring-indigo-800/40 p-4 text-left">
      <div className="text-xs uppercase text-indigo-400/70 tracking-wider mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" /> Informations reçues
      </div>
      <div className="space-y-3">
        {roleInfo.map((entry: any, i: number) => {
          switch (entry.kind) {
            case "bluffs":
              return (
                <div key={i}>
                  <div className="text-xs text-stone-400 mb-1.5">Tu peux prétendre être :</div>
                  <div className="flex gap-4 items-end">
                    {(entry.roleIds as string[]).map((roleId: string) => (
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
                    {(entry.roleIds as string[]).length === 0
                      ? <span className="text-sm text-stone-500 italic">Aucun</span>
                      : (entry.roleIds as string[]).map((roleId: string) => (
                        <div key={roleId} className="flex items-center gap-1">
                          <RoleIcon roleId={roleId} size={20} />
                          <span className="text-xs text-stone-300 italic">{script.roles[roleId]?.name ?? roleId}</span>
                        </div>
                      ))
                    }
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

function PlayerView({ game, me, dispatch, onLeave }: any) {
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const others = game.players.filter((p: any) => p.id !== me.id && !p.isStoryteller);
  const [revealed, setRevealed] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const displayRoleId = me.displayRole || me.role;
  const myRole = ROLES[displayRoleId!];
  // ─── PATCH : on récupère encore `team` pour le label uniquement,
  //   mais on n'utilise plus `team.accent` comme fond du badge — sinon
  //   le badge serait rouge vif pour un Démon, ce qui trahit l'équipe
  //   d'un coup d'œil à la vue d'un voisin.
  const team = TEAM_COLORS[myRole.team as Team];

  return (
    <div className="min-h-screen p-6">
      {showScript && <ScriptReference scriptId={game.scriptId} onClose={() => setShowScript(false)} />}

      <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <button onClick={onLeave} className="flex items-center gap-2 text-stone-400 hover:text-stone-200">
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Quitter</span>
        </button>
        <div className="flex items-center gap-2 text-stone-500 text-xs uppercase">
          {game.phase === "day" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          {game.phase === "day" ? "Jour" : "Nuit"} {game.day}
        </div>
        <div className="text-stone-500 text-xs tracking-[0.3em]">{game.code}</div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* ─── Card du rôle (PATCH : fond sombre parchemin) ─────────────── */}
        <div className="bg-stone-900/90 text-stone-100 p-8 ring-1 ring-amber-900/40 mb-4">
          <div className="text-center">
            <div className="text-xs uppercase text-stone-400 mb-1">
              Bonjour {me.name}, ton rôle est
            </div>
            {revealed ? (
              <>
                <div className="my-4">
                  {/* ─── Badge équipe NEUTRALISÉ : même style sépia pour
                      Townsfolk / Outsider / Minion / Démon. Seul le `label`
                      (texte) discrimine — il faut être proche pour le lire. */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/60 ring-1 ring-amber-800/40 text-amber-200/80 text-[10px] uppercase tracking-[0.3em]">
                    <span className="w-1 h-1 bg-amber-500/70 rounded-full" />{team.label}
                  </div>
                </div>
                <div className="flex justify-center mb-3">
                  <RoleIcon roleId={displayRoleId!} size={96} />
                </div>
                <h2 className="text-5xl mb-4 italic text-amber-100">{myRole.name}</h2>
                <div className="text-left max-w-md mx-auto bg-stone-950/60 ring-1 ring-stone-700 p-4 mb-4">
                  <div className="text-xs uppercase text-amber-500/70 tracking-wider mb-2">Capacité</div>
                  <p className="text-stone-200 leading-relaxed text-sm">{myRole.ability}</p>
                </div>
                {(myRole.firstNight || myRole.otherNight) && (
                  <div className="max-w-md mx-auto text-xs text-stone-500 flex gap-4 justify-center mb-4">
                    {myRole.firstNight && <span>1ère nuit : #{myRole.firstNight}</span>}
                    {myRole.otherNight && <span>Autres nuits : #{myRole.otherNight}</span>}
                  </div>
                )}
                <RoleInfoDisplay
                  roleInfo={me.roleInfo ?? []}
                  players={game.players}
                  scriptId={game.scriptId}
                />
                <button onClick={() => setRevealed(false)}
                  className="mt-4 text-xs uppercase text-stone-400 hover:text-stone-100 inline-flex items-center gap-2">
                  <EyeOff className="w-3 h-3" /> Cacher
                </button>
              </>
            ) : (
              <button onClick={() => setRevealed(true)} className="my-12">
                <div className="w-32 h-32 mx-auto bg-stone-800 ring-2 ring-stone-600 flex items-center justify-center hover:bg-stone-700 transition-all">
                  <Eye className="w-12 h-12 text-stone-300" strokeWidth={1.2} />
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.3em] text-stone-400">Toucher pour révéler</div>
              </button>
            )}
          </div>
        </div>

        <button onClick={() => setShowScript(true)}
          className="w-full flex items-center justify-center gap-2 p-3 mb-6 bg-stone-900 ring-1 ring-stone-700 text-stone-400 hover:text-stone-200 hover:ring-stone-500 text-xs uppercase tracking-[0.2em] transition-all">
          <BookOpen className="w-3 h-3" /> Voir tous les rôles du script
        </button>

        <div className="mb-6">
          <h3 className="text-stone-400 text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" /> La place du village
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {others.map((p: any) => (
              <button key={p.id}
                onClick={() => game.phase === "day" && p.alive && dispatch({ type: "NOMINATE", nominatorId: me.id, nomineeId: p.id })}
                disabled={!p.alive || game.phase !== "day"}
                className={`p-3 ring-1 transition-all ${
                  p.alive ? "bg-stone-900 ring-stone-700 hover:ring-stone-500" : "bg-stone-950 ring-stone-800 opacity-40"
                } ${game.nominee === p.id ? "ring-orange-500 bg-orange-950/40" : ""}`}>
                <div className="aspect-square rounded-full bg-stone-800 ring-1 ring-stone-700 flex items-center justify-center mb-2 mx-auto"
                  style={{ width: 48, height: 48 }}>
                  {p.alive
                    ? <span className="text-stone-300 text-lg">{p.name[0]}</span>
                    : <Skull className="w-5 h-5 text-stone-600" />}
                </div>
                <div className="text-center text-xs text-stone-300">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {game.nominee && (
          <div className="bg-orange-950/40 ring-1 ring-orange-800 p-4 text-center">
            <Gavel className="w-4 h-4 inline mr-2 text-orange-300" />
            <span className="text-stone-200 text-sm">
              Nomination :{" "}
              <span className="text-orange-300 font-bold">
                {game.players.find((p: any) => p.id === game.nominee)?.name}
              </span>
            </span>
          </div>
        )}
        {game.phase === "night" && !game.nominee && (
          <div className="bg-indigo-950/40 ring-1 ring-indigo-800/40 p-4 text-center text-indigo-100/80 text-sm italic">
            La nuit tombe. Ferme les yeux et attends le Conteur…
          </div>
        )}
      </div>
    </div>
  );
}
