"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Crown, MessageCircle, Users, UserPlus } from "lucide-react";
import { SCRIPTS } from "@/data/scripts";
import { getPusherClient, channelName } from "@/lib/pusher-client";
import type { GameState, GameAction } from "@/lib/types";
import { networkErrorMessage, readJsonResponse } from "@/lib/fetch-json";
import { describeServerFailure } from "@/lib/diagnostic";
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
  // `fatalError` bloque la page (partie inexistante) ; `notice` est un message
  // transitoire (action refusée, perte de réseau) qui n'empêche pas de jouer.
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Permet à dispatch() de resynchroniser sans attendre Pusher.
  const refetchRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedId = localStorage.getItem(`bot:${code}`);
    const storedSecret = localStorage.getItem(`bot:${code}:secret`);
    if (storedId) setPlayerId(storedId);
    if (storedSecret) setSecret(storedSecret);
  }, [code]);

  useEffect(() => {
    let mounted = true;
    // `null` quand les clés Pusher manquent : la page reste pleinement
    // fonctionnelle et se synchronise par sondage.
    const pusher = getPusherClient();
    const channel = pusher ? pusher.subscribe(channelName(code)) : null;
    const refetch = () => {
      const url = playerId
        ? `/api/game/${code}?playerId=${encodeURIComponent(playerId)}`
        : `/api/game/${code}`;
      fetch(url, { cache: "no-store" })
        .then(async res => {
          const { ok, data, error } = await readJsonResponse<{ state?: GameState }>(res);
          if (!mounted) return;
          if (res.status === 404) {
            // Seul cas réellement fatal : la partie n'existe pas / a expiré.
            setFatalError("Partie introuvable — elle a peut-être expiré (24 h).");
            return;
          }
          if (!ok || !data?.state) {
            // Erreur serveur transitoire : on garde l'état déjà affiché et on
            // se contente d'un bandeau. Auparavant la page se figeait sur un
            // écran d'erreur définitif, sans aucune reprise possible.
            setNotice(error ?? "Synchronisation impossible");
            return;
          }
          setGame(data.state);
          setNotice(null);
        })
        .catch(e => {
          // Coupure réseau, onglet réveillé hors ligne… non fatal : la prochaine
          // reprise de focus relancera la synchronisation.
          if (mounted) setNotice(networkErrorMessage(e));
        });
    };
    refetchRef.current = refetch;
    // Si Pusher manque un événement (déconnexion, mise en veille de l'onglet,
    // suspension mobile…), on resynchronise dès que l'onglet redevient actif
    // ou prend le focus. Évite d'avoir à faire F5 manuellement.
    const onVisible = () => { if (document.visibilityState === "visible") refetch(); };
    const onFocus = () => refetch();
    const onConnected = () => refetch();
    channel?.bind("state-changed", refetch);
    pusher?.connection.bind("connected", onConnected);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    refetch();
    // Filet de sécurité : si le temps réel est indisponible (clés Pusher
    // absentes, quota atteint, websocket bloqué par un réseau d'entreprise),
    // un sondage garde la table synchronisée au lieu de la figer. On sonde
    // plus souvent quand Pusher est totalement absent.
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") refetch();
    }, pusher ? 15000 : 4000);
    return () => {
      mounted = false;
      clearInterval(poll);
      channel?.unbind_all();
      pusher?.unsubscribe(channelName(code));
      pusher?.connection.unbind("connected", onConnected);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [code, playerId]);

  async function handleJoin() {
    if (!name.trim()) return;
    setJoining(true); setNotice(null);
    try {
      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name: name.trim() }),
      });
      const { ok, data, error } = await readJsonResponse<{ playerId?: string; secret?: string }>(res);
      if (!ok || !data?.playerId) {
        // Le diagnostic serveur, quand il existe, est plus parlant que le motif
        // générique renvoyé par la route.
        const cause = await describeServerFailure();
        setNotice(cause ?? error ?? "Impossible de rejoindre la partie");
        return;
      }
      localStorage.setItem(`bot:${code}`, data.playerId);
      if (data.secret) localStorage.setItem(`bot:${code}:secret`, data.secret);
      setPlayerId(data.playerId);
      if (data.secret) setSecret(data.secret);
    } catch (e: unknown) {
      setNotice(networkErrorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  // Envoie une action au serveur.
  //
  // L'ancienne version ignorait totalement la réponse : une action refusée
  // (session invalide, droits GM, partie expirée) ou une panne réseau ne
  // produisait aucun retour — l'interface semblait simplement figée. On
  // remonte désormais l'erreur, et on resynchronise systématiquement pour ne
  // pas dépendre uniquement de l'événement Pusher.
  const dispatch = useCallback(async (action: GameAction) => {
    if (!playerId || !secret) {
      setNotice("Session inconnue — rejoins à nouveau la partie.");
      return;
    }
    try {
      const res = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, playerId, secret, action }),
      });
      const { ok, error } = await readJsonResponse<{ ok?: boolean }>(res);
      if (!ok) {
        setNotice(error ?? "Action refusée");
        refetchRef.current();
        return;
      }
      setNotice(null);
      refetchRef.current();
    } catch (e: unknown) {
      setNotice(networkErrorMessage(e));
    }
  }, [code, playerId, secret]);

  if (fatalError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{fatalError}</p>
          <button onClick={() => router.push("/")} className="text-stone-300 underline">Retour</button>
        </div>
      </div>
    );
  }

  // Bandeau non bloquant : l'utilisateur garde la main sur la partie.
  const noticeBanner = notice ? (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] px-4 py-2 bg-red-950/90 ring-1 ring-red-800 text-red-200 text-xs backdrop-blur flex items-center gap-3">
      <span>{notice}</span>
      <button onClick={() => { setNotice(null); refetchRef.current(); }} className="underline uppercase tracking-wider">
        Réessayer
      </button>
    </div>
  ) : null;

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        Chargement...
        {noticeBanner}
      </div>
    );
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
          <div className="text-4xl tracking-[0.4em] text-stone-100 font-display">{code}</div>
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
        {noticeBanner}
      </div>
    );
  }

  return (
    <>
      {game.phase === "lobby" ? (
        <Lobby game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />
      ) : me.isStoryteller ? (
        <StorytellerView game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />
      ) : (
        <PlayerView game={game} me={me} dispatch={dispatch} onLeave={() => router.push("/")} />
      )}
      {noticeBanner}
    </>
  );
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
          <div className="text-5xl tracking-[0.4em] text-stone-100 mb-4 font-display">{game.code}</div>
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
              onClick={() => setStep("random-bluffs")}
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
