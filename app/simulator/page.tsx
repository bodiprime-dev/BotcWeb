"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronUp, Crown, MessageCircle, Plus, RotateCcw, Users, X } from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team, getScriptList } from "@/data/scripts";
import { applyAction, createNewGame } from "@/lib/game";
import type { GameState, GameAction } from "@/lib/types";
import { StorytellerView } from "@/components/StorytellerView";
import { PlayerView } from "@/components/PlayerView";
import { LobbyRoleSteps, type LobbyStep } from "@/components/LobbyRoleSteps";

const SAMPLE_NAMES = ["Alice", "Bruno", "Clara", "David", "Elise", "Fabien", "Gaëlle", "Hugo"];

export default function SimulatorPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [scriptId, setScriptId] = useState("trouble-brewing");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [prefillRoleInfo, setPrefillRoleInfo] = useState(false);

  const dispatch = (action: GameAction) =>
    setGame(prev => prev ? applyAction(prev, action) : prev);

  const startNewSimulation = () => {
    let g = createNewGame(scriptId);
    g = applyAction(g, { type: "ADD_PLAYER", name: "GM-Simu" });
    SAMPLE_NAMES.slice(0, 5).forEach(n => { g = applyAction(g, { type: "ADD_PLAYER", name: n }); });
    setGame(g);
    setViewerId(null);
  };

  if (!game) {
    const scripts = getScriptList();
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <Link href="/" className="absolute top-6 left-6 text-stone-400 text-sm hover:text-stone-200">
          ← Accueil
        </Link>
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 ring-1 ring-amber-700/40 bg-amber-950/30 text-amber-200 text-xs uppercase tracking-[0.2em]">
            🧪 Mode simulation
          </div>
          <h1 className="text-3xl tracking-wider text-stone-100 mb-2 font-display">Tester l'application</h1>
          <p className="text-stone-500 text-sm max-w-md text-center">
            Une partie locale (sans serveur, sans Pusher) pour valider les workflows :
            choix des rôles, Drunk, ordre nocturne, nominations…
          </p>
        </div>
        <div className="w-full max-w-md">
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mb-2">Scénario</div>
          <div className="space-y-2 mb-6">
            {scripts.map(s => (
              <button
                key={s.id}
                onClick={() => setScriptId(s.id)}
                className={`w-full text-left p-4 ring-1 transition-all ${
                  scriptId === s.id ? "bg-stone-800 ring-amber-600/60" : "bg-stone-900 ring-stone-700 hover:ring-stone-600"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-stone-100">{s.name}</div>
                  <div className="text-stone-500 text-xs">{s.roleCount} rôles</div>
                </div>
                <div className="text-stone-500 text-xs italic mt-1">{s.description}</div>
              </button>
            ))}
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
          <button
            onClick={startNewSimulation}
            className="w-full p-4 bg-amber-800 hover:bg-amber-700 text-stone-50 ring-1 ring-amber-600 tracking-[0.2em] uppercase text-sm"
          >
            🧪 Démarrer la simulation
          </button>
          <p className="text-stone-600 text-xs mt-3 text-center">
            La partie s'initialise avec un GM + 5 joueurs. Ajoutables dans le lobby.
          </p>
        </div>
      </div>
    );
  }

  const me = viewerId ? game.players.find(p => p.id === viewerId) ?? null : game.players[0];
  if (!me) return null;

  const isGmView = viewerId === null || (me.isStoryteller && game.phase !== "lobby");

  return (
    <div className="min-h-screen pb-20">
      <div className="bg-amber-950/40 border-b border-amber-800/40 px-4 py-2 flex items-center justify-between sticky top-0 z-40 backdrop-blur">
        <div className="flex items-center gap-2 text-amber-300 text-xs uppercase tracking-[0.2em]">
          🧪 Simulation
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setGame(null); setViewerId(null); }}
            className="flex items-center gap-1.5 px-3 py-1 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <Link href="/" className="px-3 py-1 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider">
            Accueil
          </Link>
        </div>
      </div>

      <PerspectiveBar game={game} viewerId={viewerId} onSelect={setViewerId} />

      <div className="pt-2">
        {game.phase === "lobby" ? (
          <SimLobby game={game} me={me} dispatch={dispatch} prefillRoleInfo={prefillRoleInfo} />
        ) : isGmView ? (
          <StorytellerView game={game} me={me} dispatch={dispatch} />
        ) : (
          <PlayerView game={game} me={me} dispatch={dispatch} />
        )}
      </div>
    </div>
  );
}

function PerspectiveBar({ game, viewerId, onSelect }: {
  game: GameState;
  viewerId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="bg-stone-950/80 border-b border-stone-800 px-4 py-2 overflow-x-auto">
      <div className="flex gap-1.5 items-center min-w-fit">
        <span className="text-stone-500 text-[10px] uppercase tracking-wider mr-1 flex-shrink-0">Voir comme :</span>
        <button
          onClick={() => onSelect(null)}
          className={`flex-shrink-0 px-3 py-1 text-xs ring-1 transition-all ${
            viewerId === null
              ? "bg-amber-900/40 ring-amber-700 text-amber-200"
              : "bg-stone-900 ring-stone-700 text-stone-400 hover:ring-stone-500"
          }`}
        >
          👑 GM
        </button>
        {game.players.map(p => {
          if (p.isStoryteller && game.phase !== "lobby") return null;
          const role = p.role && SCRIPTS[game.scriptId]?.roles[p.displayRole || p.role];
          const team = role ? TEAM_COLORS[role.team as Team] : null;
          const isSelected = viewerId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`flex-shrink-0 px-3 py-1 text-xs ring-1 transition-all ${
                isSelected
                  ? `${team?.bg ?? "bg-stone-700"} ${team?.ring ?? "ring-stone-500"} ${team?.text ?? "text-stone-100"}`
                  : "bg-stone-900 ring-stone-700 text-stone-400 hover:ring-stone-500"
              } ${!p.alive && game.phase !== "lobby" ? "line-through opacity-50" : ""}`}
            >
              {p.name}{p.role === "drunk" ? " 🍺" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SimLobby({ game, me, dispatch, prefillRoleInfo }: {
  game: GameState;
  me: { id: string };
  dispatch: (action: GameAction) => void;
  prefillRoleInfo: boolean;
}) {
  const script = SCRIPTS[game.scriptId];
  const playableCount = game.players.length - 1;
  const canStart = playableCount >= 5;
  const [step, setStep] = useState<LobbyStep>("players");
  const [newName, setNewName] = useState("");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-xs tracking-[0.3em] uppercase text-stone-500 mb-2">Lobby</div>
        <div className="text-5xl tracking-[0.4em] text-stone-100 mb-4 font-display">{game.code}</div>
        <div className="text-stone-300 text-base italic">{script.name}</div>
      </div>

      <div className="bg-stone-900 ring-1 ring-stone-700 p-4 mb-6">
        <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
          <Users className="w-3 h-3" /> Joueurs ({game.players.length})
        </div>
        <div className="flex flex-col gap-1 mb-3">
          {game.players.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-1.5 ring-1 ${
                p.id === me.id ? "bg-amber-900/30 ring-amber-700/50 text-amber-100" : "bg-stone-800 ring-stone-700 text-stone-200"
              }`}
            >
              {i === 0 ? (
                <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
              ) : (
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
              )}
              <span className="text-sm flex-1">{p.name}</span>
              {i === 0 && <span className="text-[10px] text-amber-400 uppercase">GM</span>}
              {i !== 0 && (
                <button
                  onClick={() => dispatch({ type: "REMOVE_PLAYER", playerId: p.id })}
                  className="text-stone-500 hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && newName.trim()) {
                dispatch({ type: "ADD_PLAYER", name: newName.trim() });
                setNewName("");
              }
            }}
            placeholder="Ajouter un joueur..."
            className="flex-1 bg-stone-950 ring-1 ring-stone-700 px-3 py-1.5 text-sm text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-amber-700/60"
          />
          <button
            onClick={() => {
              if (newName.trim()) {
                dispatch({ type: "ADD_PLAYER", name: newName.trim() });
                setNewName("");
              }
            }}
            className="px-3 py-1.5 bg-stone-800 ring-1 ring-stone-600 hover:bg-stone-700 text-stone-300"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-stone-600 text-xs mt-3 italic">
          Le 1er joueur est le Conteur (GM). Min. 5 autres joueurs.
        </p>
      </div>

      {canStart && step === "players" && (
        <>
          <button
            onClick={() => dispatch({ type: "SET_CHAT_ENABLED", storytellerId: game.players[0].id, enabled: !game.chatEnabled })}
            className={`w-full flex items-center gap-3 p-3 mb-3 ring-1 text-left transition-all ${
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
            onClick={() => dispatch({ type: "START_GAME", storytellerId: game.players[0].id, selectedRoleIds: [], prefillRoleInfo })}
            className="w-full p-4 bg-red-900/60 hover:bg-red-900 text-stone-300 hover:text-stone-100 ring-1 ring-red-900/50 tracking-[0.2em] uppercase text-xs"
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
        storytellerId={game.players[0].id}
        dispatch={dispatch}
      />

      {!canStart && step === "players" && (
        <div className="text-center text-stone-500 text-sm italic">
          Ajoute au moins {Math.max(0, 5 - playableCount)} joueur(s) supplémentaire(s).
        </div>
      )}
    </div>
  );
}
