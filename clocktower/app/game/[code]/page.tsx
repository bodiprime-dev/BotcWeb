"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Moon, Sun, Eye, EyeOff, Skull, BookOpen, Users, Vote, ArrowLeft, Sparkles, UserPlus, X, Crown } from "lucide-react";
import { SCRIPTS, TEAM_COLORS } from "@/data/scripts";
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

  // Restaure le playerId depuis localStorage si déjà joint
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(`bot:${code}`) : null;
    if (stored) setPlayerId(stored);
  }, [code]);

  // Charge l'état initial + s'abonne au canal Pusher
  useEffect(() => {
    let mounted = true;

    // S'abonne au canal pour recevoir l'état à chaque mise à jour
    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName(code));
    channel.bind("state-update", (data: { state: GameState }) => {
      if (mounted) setGame(data.state);
    });

    // Fetch initial de l'état brut
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

  // ─── Rendus ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="text-stone-300 underline">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  if (!game) {
    return <div className="min-h-screen flex items-center justify-center text-stone-500">Chargement…</div>;
  }

  const me = playerId ? game.players.find(p => p.id === playerId) ?? null : null;

  // Pas encore inscrit → écran "rejoindre avec ton nom"
  if (!me) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <button onClick={() => router.push("/")} className="text-stone-400 text-sm mb-6 hover:text-stone-200">← Quitter</button>
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
          <button onClick={handleJoin} disabled={joining || !name.trim()} className="w-full p-3 bg-stone-700 hover:bg-stone-600 disabled:bg-stone-800 text-stone-100 ring-1 ring-stone-600 tracking-[0.2em] uppercase text-sm flex items-center justify-center gap-2">
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

  if (game.phase === "lobby") return <Lobby game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />;

  if (me.isStoryteller) return <StorytellerView game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />;
  return <PlayerView game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />;
}

// ─── Composants ─────────────────────────────────────────────────────────

function Lobby({ game, me, dispatch, onLeave }: any) {
  const script = SCRIPTS[game.scriptId];
  const isFirstPlayer = game.players[0]?.id === me.id;
  const canStart = game.players.length >= 5 && isFirstPlayer;

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
            {game.players.map((p: any) => (
              <div key={p.id} className={`inline-flex items-center gap-2 px-3 py-1 ring-1 ${p.id === me.id ? "bg-amber-900/30 ring-amber-700/50 text-amber-100" : "bg-stone-800 ring-stone-700 text-stone-200"}`}>
                {p.id === game.players[0]?.id && <Crown className="w-3 h-3 text-amber-400" />}
                <span className="text-sm">{p.name}</span>
                {p.id === me.id && <span className="text-xs text-amber-300">(toi)</span>}
              </div>
            ))}
          </div>
          <p className="text-stone-600 text-xs mt-3 italic">Le 1er joueur (👑) sera le Conteur. Min. 5 joueurs.</p>
        </div>

        {isFirstPlayer && (
          <button
            onClick={() => dispatch({ type: "START_GAME", storytellerId: me.id })}
            disabled={!canStart}
            className="w-full p-4 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 disabled:ring-stone-700 tracking-[0.2em] uppercase text-sm transition-all"
          >
            Lancer la partie
          </button>
        )}
        {!isFirstPlayer && (
          <div className="text-center text-stone-500 text-sm italic">En attente du Conteur…</div>
        )}
      </div>
    </div>
  );
}

function StorytellerView({ game, me, dispatch, onLeave }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const selected = game.players.find((p: any) => p.id === selectedId);

  const radius = Math.min(180, 60 + game.players.length * 12);
  const center = radius + 60;
  const size = center * 2;

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
        <button onClick={onLeave} className="flex items-center gap-2 text-stone-400 hover:text-stone-200">
          <ArrowLeft className="w-4 h-4" /> <span className="text-sm">Quitter</span>
        </button>
        <div className="text-stone-500 text-xs tracking-[0.2em] uppercase hidden sm:block">{script.name} · {game.code}</div>
        <div className="flex items-center gap-3">
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase">Jour {game.day}</div>
          <button onClick={() => dispatch({ type: "TOGGLE_PHASE", storytellerId: me.id })} className={`flex items-center gap-2 px-4 py-2 ring-1 ${game.phase === "day" ? "bg-amber-900/30 ring-amber-700/50 text-amber-100" : "bg-indigo-950 ring-indigo-800 text-indigo-100"}`}>
            {game.phase === "day" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm">{game.phase === "day" ? "Jour" : "Nuit"}</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="relative">
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
            {game.players.map((p: any, i: number) => {
              const angle = (i / game.players.length) * 2 * Math.PI - Math.PI / 2;
              const x = center + radius * Math.cos(angle) - 36;
              const y = center + radius * Math.sin(angle) - 36;
              const role = ROLES[p.role!];
              const team = TEAM_COLORS[role.team];
              return (
                <button key={p.id} onClick={() => setSelectedId(p.id)} className="absolute" style={{ left: x, top: y }}>
                  <div className={`w-[72px] h-[72px] rounded-full ${team.bg} ring-2 ${team.ring} flex flex-col items-center justify-center transition-all relative ${selectedId === p.id ? "scale-110 ring-amber-400" : ""} ${!p.alive ? "opacity-40 grayscale" : ""}`}>
                    <div className={`text-[10px] font-bold ${team.text} px-1 text-center leading-tight`}>{role.name}</div>
                    {!p.alive && <Skull className="w-4 h-4 text-stone-700 absolute" />}
                  </div>
                  <div className="text-center mt-1 text-stone-200 text-xs">{p.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <div className="bg-stone-100 text-stone-900 p-5 ring-1 ring-stone-400">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs uppercase text-stone-600">Joueur</div>
                  <div className="text-2xl">{selected.name}</div>
                </div>
                <button onClick={() => dispatch({ type: "TOGGLE_ALIVE", playerId: selected.id, storytellerId: me.id })} className="p-2 hover:bg-stone-300/60">
                  {selected.alive ? <Sparkles className="w-5 h-5 text-amber-700" /> : <Skull className="w-5 h-5 text-stone-700" />}
                </button>
              </div>
              <div className="border-t border-stone-300 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${TEAM_COLORS[ROLES[selected.role!].team].accent}`} />
                  <span className="text-xs uppercase text-stone-700">{TEAM_COLORS[ROLES[selected.role!].team].label}</span>
                </div>
                <div className="text-xl mb-2 italic">{ROLES[selected.role!].name}</div>
                <p className="text-sm leading-relaxed">{ROLES[selected.role!].ability}</p>
              </div>
            </div>
          ) : (
            <div className="bg-stone-100 text-stone-900 p-5 ring-1 ring-stone-400 text-center">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-stone-600" />
              <p className="text-sm italic">Touche un joueur pour voir son rôle</p>
            </div>
          )}

          {game.nominee && (
            <div className="bg-red-950/50 ring-1 ring-red-800 p-4">
              <div className="text-red-300 text-xs uppercase mb-1">Nomination en cours</div>
              <div className="text-stone-100">{game.players.find((p: any) => p.id === game.nominee)?.name}</div>
              <button onClick={() => dispatch({ type: "CLEAR_NOMINATION", storytellerId: me.id })} className="text-red-300 text-xs underline mt-2">Annuler</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function PlayerView({ game, me, dispatch, onLeave }: any) {
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const others = game.players.filter((p: any) => p.id !== me.id);
  const [revealed, setRevealed] = useState(false);
  const myRole = ROLES[me.role!];
  const team = TEAM_COLORS[myRole.team];

  return (
    <div className="min-h-screen p-6">
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
        <div className="bg-stone-100 text-stone-900 p-8 ring-1 ring-stone-400 mb-8">
          <div className="text-center">
            <div className="text-xs uppercase text-stone-600 mb-1">Bonjour {me.name}, ton rôle est</div>
            {revealed ? (
              <>
                <div className="my-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 ${team.accent} text-stone-50 text-[10px] uppercase tracking-[0.3em]`}>
                    <span className="w-1 h-1 bg-stone-200 rounded-full" />{team.label}
                  </div>
                </div>
                <h2 className="text-5xl mb-4 italic">{myRole.name}</h2>
                <p className="max-w-md mx-auto text-stone-800 leading-relaxed">{myRole.ability}</p>
                <button onClick={() => setRevealed(false)} className="mt-6 text-xs uppercase text-stone-600 hover:text-stone-900 inline-flex items-center gap-2">
                  <EyeOff className="w-3 h-3" /> Cacher
                </button>
              </>
            ) : (
              <button onClick={() => setRevealed(true)} className="my-12">
                <div className="w-32 h-32 mx-auto bg-stone-800 ring-2 ring-stone-600 flex items-center justify-center hover:bg-stone-700 transition-all">
                  <Eye className="w-12 h-12 text-stone-300" strokeWidth={1.2} />
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.3em] text-stone-600">Toucher pour révéler</div>
              </button>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-stone-400 text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" /> La place du village
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {others.map((p: any) => (
              <button
                key={p.id}
                onClick={() => game.phase === "day" && p.alive && dispatch({ type: "NOMINATE", nominatorId: me.id, nomineeId: p.id })}
                disabled={!p.alive || game.phase !== "day"}
                className={`p-3 ring-1 transition-all ${p.alive ? "bg-stone-900 ring-stone-700 hover:ring-stone-500" : "bg-stone-950 ring-stone-800 opacity-40"} ${game.nominee === p.id ? "ring-red-500 bg-red-950/40" : ""}`}
              >
                <div className="aspect-square rounded-full bg-stone-800 ring-1 ring-stone-700 flex items-center justify-center mb-2 mx-auto" style={{ width: 48, height: 48 }}>
                  {p.alive ? <span className="text-stone-300 text-lg">{p.name[0]}</span> : <Skull className="w-5 h-5 text-stone-600" />}
                </div>
                <div className="text-center text-xs text-stone-300">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {game.nominee && (
          <div className="bg-red-950/40 ring-1 ring-red-800 p-4 text-center">
            <Vote className="w-4 h-4 inline mr-2 text-red-300" />
            <span className="text-stone-200 text-sm">
              Nomination : <span className="text-red-300 font-bold">{game.players.find((p: any) => p.id === game.nominee)?.name}</span>
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
