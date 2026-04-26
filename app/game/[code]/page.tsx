"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Moon, Sun, Eye, EyeOff, Skull, BookOpen, Users, ArrowLeft,
  Sparkles, UserPlus, Crown, FlaskConical, Gavel, X, ChevronDown, ChevronUp,
  PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team } from "@/data/scripts";
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
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tc.accent}`} />
                        <div className="flex-1">
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

  const [step, setStep] = useState<"players" | "roles" | "drunk">("players");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [drunkFakeRoleId, setDrunkFakeRoleId] = useState<string | null>(null);

  const needed = playableCount;
  const selectedCount = selectedRoleIds.length;

  const toggleRole = (id: string) => {
    setSelectedRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon"];
  const teamLabels: Record<Team, string> = {
    townsfolk: "Townsfolk", outsider: "Outsiders", minion: "Minions", demon: "Démon",
  };

  const launch = (roleIds: string[]) => {
    if (roleIds.includes("drunk")) {
      const opts = roleIds.filter(id => id !== "drunk" && script.roles[id]?.team === "townsfolk");
      if (opts.length > 0) {
        setStep("drunk");
        return;
      }
    }
    dispatch({ type: "START_GAME", storytellerId: me.id, selectedRoleIds: roleIds, drunkFakeRoleId: null });
  };

  const fakeRoleOptions = selectedRoleIds
    .filter(id => id !== "drunk" && script.roles[id]?.team === "townsfolk")
    .map(id => ({ id, ...script.roles[id] }));

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
                onClick={() => dispatch({ type: "START_GAME", storytellerId: me.id, selectedRoleIds, drunkFakeRoleId })}
                disabled={!drunkFakeRoleId}
                className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all">
                Confirmer et lancer
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
      const orderRoleId = realRoleId === "drunk" ? displayRoleId : realRoleId;
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

  // Rayon du cercle adaptatif : plus grand quand le drawer est fermé
  const baseExtent = 80 + playablePlayers.length * 16;
  const radius = Math.min(panelOpen ? 220 : 320, baseExtent);
  const center = radius + 60;
  const size = center * 2;

  const closePanel = () => {
    setSelectedId(null);
    setPanelOpen(false);
  };

  return (
    <div className="min-h-[100dvh] px-2 sm:px-4 pb-6 pt-3">
      {showScript && <ScriptReference scriptId={game.scriptId} onClose={() => setShowScript(false)} />}

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-4 max-w-7xl mx-auto gap-2">
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

      {/* ─── Grimoire pleine largeur ─── */}
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-2">
          <div className="inline-flex items-center gap-2 text-stone-400 text-xs tracking-[0.3em] uppercase">
            <BookOpen className="w-3 h-3" /> Grimoire
          </div>
        </div>
        <div className="relative mx-auto" style={{ width: size, height: size, maxWidth: "100%" }}>
          <div className="absolute inset-12 rounded-full ring-1 ring-stone-700/40" />
          <div className="absolute inset-20 rounded-full ring-1 ring-stone-800/40" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Skull className="w-10 h-10 text-stone-700" strokeWidth={1.2} />
          </div>
          {playablePlayers.map((p: any, i: number) => {
            const angle = (i / playablePlayers.length) * 2 * Math.PI - Math.PI / 2;
            const x = center + radius * Math.cos(angle) - 36;
            const y = center + radius * Math.sin(angle) - 36;
            const role = ROLES[p.role!];
            const team = TEAM_COLORS[role.team as Team];
            const isNominee = game.nominee === p.id;
            const isDrunk = p.role === "drunk";
            return (
              <button key={p.id} onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                className="absolute" style={{ left: x, top: y }}>
                <div className={`w-[72px] h-[72px] rounded-full ${team.bg} ring-2 flex flex-col items-center justify-center transition-all relative ${
                  selectedId === p.id ? "scale-110 ring-amber-400"
                  : isNominee ? "ring-orange-400"
                  : team.ring
                } ${!p.alive ? "opacity-40 grayscale" : ""}`}>
                  <div className={`text-[10px] font-bold ${team.text} px-1 text-center leading-tight`}>
                    {role.name}{isDrunk ? " 🍺" : ""}
                  </div>
                  {!p.alive && <Skull className="w-4 h-4 text-stone-700 absolute" />}
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

      {/* ─── Drawer rétractable ─── */}
      <aside
        aria-hidden={!panelOpen}
        className={`fixed inset-y-0 right-0 w-full sm:max-w-sm z-30 bg-stone-950/95 backdrop-blur-md ring-1 ring-stone-800 overflow-y-auto transition-transform duration-300 ease-out ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 sticky top-0 bg-stone-950/95 backdrop-blur-md">
          <div className="text-stone-400 text-xs uppercase tracking-[0.2em]">Panneau</div>
          <button onClick={closePanel} className="text-stone-400 hover:text-stone-100 p-1">
            <X className="w-4 h-4" />
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
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${TEAM_COLORS[ROLES[selected.role!].team as Team].accent}`} />
                  <span className="text-xs uppercase text-stone-300">
                    {TEAM_COLORS[ROLES[selected.role!].team as Team].label}
                  </span>
                </div>
                <div className={`text-lg italic mb-1 ${TEAM_COLORS[ROLES[selected.role!].team as Team].text}`}>{ROLES[selected.role!].name}</div>
                <p className="text-xs text-stone-400 leading-relaxed">{ROLES[selected.role!].ability}</p>
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
                <button onClick={() => setRevealed(false)}
                  className="text-xs uppercase text-stone-400 hover:text-stone-100 inline-flex items-center gap-2">
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
