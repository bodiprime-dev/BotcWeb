"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Crown, MessageCircle, Users, UserPlus } from "lucide-react";
import { SCRIPTS } from "@/data/scripts";
import { getPusherClient, channelName } from "@/lib/pusher-client";
import type { GameState, GameAction } from "@/lib/types";
import { StorytellerView } from "@/components/StorytellerView";
import { PlayerView } from "@/components/PlayerView";
import { LobbyRoleSteps, type LobbyStep } from "@/components/LobbyRoleSteps";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string).toUpperCase();

  const [game, setGame] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = localStorage.getItem(`bot:${code}`);
    const storedSecret = localStorage.getItem(`bot:${code}:secret`);
    if (storedId) setPlayerId(storedId);
    if (storedSecret) setSecret(storedSecret);
  }, [code]);

  useEffect(() => {
    let mounted = true;
    const pusher = getPusherClient();
    const channel = pusher.subscribe(channelName(code));
    const refetch = () => {
      const url = playerId
        ? `/api/game/${code}?playerId=${encodeURIComponent(playerId)}`
        : `/api/game/${code}`;
      fetch(url, { cache: "no-store" })
        .then(res => {
          if (res.status === 404) throw new Error("Partie introuvable");
          return res.json();
        })
        .then(data => { if (mounted && data.state) setGame(data.state); })
        .catch(e => { if (mounted) setError(e.message); });
    };
    // Si Pusher manque un événement (déconnexion, mise en veille de l'onglet,
    // suspension mobile…), on resynchronise dès que l'onglet redevient actif
    // ou prend le focus. Évite d'avoir à faire F5 manuellement.
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    const onFocus = () => refetch();
    const onConnected = () => refetch();
    channel.bind("state-changed", refetch);
    pusher.connection.bind("connected", onConnected);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    refetch();
    return () => {
      mounted = false;
      channel.unbind_all();
      pusher.unsubscribe(channelName(code));
      pusher.connection.unbind("connected", onConnected);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [code, playerId]);

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
      if (data.secret) localStorage.setItem(`bot:${code}:secret`, data.secret);
      setPlayerId(data.playerId);
      if (data.secret) setSecret(data.secret);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setJoining(false);
    }
  }

  async function dispatch(action: GameAction) {
    if (!playerId || !secret) return;
    await fetch("/api/game/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, playerId, secret, action }),
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
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleJoin()}
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

function Lobby({ game, me, dispatch, onLeave }: {
  game: GameState;
  me: { id: string; isStoryteller?: boolean };
  dispatch: (action: GameAction) => void;
  onLeave: () => void;
}) {
  const script = SCRIPTS[game.scriptId];
  const isStoryteller = game.players[0]?.id === me.id;
  const playableCount = game.players.length - 1;
  const canStart = playableCount >= 5 && isStoryteller;
  const [step, setStep] = useState<LobbyStep>("players");
  const [prefillRoleInfo, setPrefillRoleInfo] = useState(false);

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
          <div className="flex flex-col gap-1">
            {game.players.map((p, i) => (
              <div
                key={p.id}
                className={`flex items-center gap-2 px-3 py-1.5 ring-1 ${
                  p.id === me.id ? "bg-amber-900/30 ring-amber-700/50 text-amber-100" : "bg-stone-800 ring-stone-700 text-stone-200"
                }`}
              >
                {i === 0 ? (
                  <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                ) : isStoryteller ? (
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => dispatch({ type: "REORDER_PLAYERS", playerId: p.id, direction: "up" })}
                      disabled={i <= 1}
                      className="text-stone-500 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => dispatch({ type: "REORDER_PLAYERS", playerId: p.id, direction: "down" })}
                      disabled={i >= game.players.length - 1}
                      className="text-stone-500 hover:text-stone-300 disabled:opacity-30 disabled:cursor-not-allowed leading-none"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-4 flex-shrink-0" />
                )}
                <span className="text-sm flex-1">{p.name}</span>
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
            <div className="bg-amber-950/30 ring-1 ring-amber-800/40 p-3 mb-4 text-xs text-amber-200/80 leading-relaxed">
              <span className="text-amber-400 font-medium">👑 Tu es le Game Master.</span> Tu ne joues pas — tu gères la partie.{" "}
              {playableCount} rôles seront distribués aux autres joueurs.
            </div>
            <button
              onClick={() => setPrefillRoleInfo(v => !v)}
              className={`w-full flex items-center gap-3 p-3 mb-3 ring-1 text-left transition-all ${
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
            <button
              onClick={() => dispatch({ type: "SET_CHAT_ENABLED", storytellerId: me.id, enabled: !game.chatEnabled })}
              className={`w-full flex items-center gap-3 p-3 mb-4 ring-1 text-left transition-all ${
                game.chatEnabled
                  ? "bg-stone-800 ring-emerald-700/60 text-emerald-200"
                  : "bg-stone-900 ring-stone-700 text-stone-400 hover:ring-stone-600"
              }`}
            >
              <div className={`w-4 h-4 flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                game.chatEnabled ? "bg-emerald-700 border-emerald-600" : "border-stone-600"
              }`}>
                {game.chatEnabled && <span className="text-[10px] font-bold text-white leading-none">✓</span>}
              </div>
              <MessageCircle className="w-4 h-4 flex-shrink-0 opacity-70" />
              <div>
                <div className="text-sm">Activer le chat en partie</div>
                <div className="text-xs text-stone-500 mt-0.5">
                  Désactivé par défaut. Quand activé, les joueurs peuvent chuchoter et discuter en public.
                </div>
              </div>
            </button>
            <button
              onClick={() => setStep("roles")}
              className="w-full p-4 bg-stone-800 hover:bg-stone-700 text-stone-100 ring-1 ring-stone-600 tracking-[0.2em] uppercase text-sm mb-3 flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Configurer les rôles
            </button>
            <button
              onClick={() => dispatch({ type: "START_GAME", storytellerId: me.id, selectedRoleIds: [], prefillRoleInfo })}
              className="w-full p-4 bg-red-900/60 hover:bg-red-900 text-stone-300 hover:text-stone-100 ring-1 ring-red-900/50 tracking-[0.2em] uppercase text-xs transition-all"
            >
              Lancer avec rôles aléatoires
            </button>
          </>
        )}

        <LobbyRoleSteps
          game={game}
          step={step}
          setStep={setStep}
          playableCount={playableCount}
          prefillRoleInfo={prefillRoleInfo}
          storytellerId={me.id}
          dispatch={dispatch}
        />

        {!isStoryteller && (
          <div className="text-center text-stone-500 text-sm italic">En attente du Conteur…</div>
        )}
        {isStoryteller && !canStart && step === "players" && (
          <div className="text-center text-stone-500 text-sm italic">
            En attente de joueurs ({Math.max(0, 5 - playableCount)} manquants, min. 5 hors GM)…
          </div>
        )}
      </div>
    </div>
  );
}
