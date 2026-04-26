"use client";
/**
 * Mode SIMULATION (prod)
 *
 * Cette page utilise le MEME reducer (`applyAction`) et les MEMES types que la
 * partie reelle, mais sans backend : tout l’etat reste local en useState.
 * Cela permet de tester les workflows en bout-en-bout (lobby -> drunk -> nuit
 * -> nominations) sans Pusher ni Vercel KV.
 *
 * Utilisation : /simulator
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Moon, Sun, Eye, EyeOff, Skull, BookOpen, Users, Sparkles,
  Crown, FlaskConical, Gavel, X, ChevronDown, ChevronUp, RotateCcw, Plus,
  PanelRightOpen, PanelRightClose,
} from "lucide-react";
import { SCRIPTS, TEAM_COLORS, type Team, getScriptList } from "@/data/scripts";
import { applyAction, createNewGame } from "@/lib/game";
import type { GameState, GameAction } from "@/lib/types";

const BEER = "🍺";
const CROWN_EMOJI = "👑";
const FLASK_EMOJI = "🧪";

const SAMPLE_NAMES = ["Alice", "Bruno", "Clara", "David", "Elise", "Fabien", "Gaëlle", "Hugo"];

export default function SimulatorPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [scriptId, setScriptId] = useState("trouble-brewing");
  const [viewerId, setViewerId] = useState<string | null>(null);

  const dispatch = (action: GameAction) =>
    setGame(prev => prev ? applyAction(prev, action) : prev);

  const startNewSimulation = () => {
    let g = createNewGame(scriptId);
    g = applyAction(g, { type: "ADD_PLAYER", name: "GM-Simu" });
    SAMPLE_NAMES.slice(0, 5).forEach(n => {
      g = applyAction(g, { type: "ADD_PLAYER", name: n });
    });
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
          <h1 className="text-3xl tracking-wider text-stone-100 mb-2">Tester l’application</h1>
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
            onClick={startNewSimulation}
            className="w-full p-4 bg-amber-800 hover:bg-amber-700 text-stone-50 ring-1 ring-amber-600 tracking-[0.2em] uppercase text-sm"
          >
            🧪 Démarrer la simulation
          </button>
          <p className="text-stone-600 text-xs mt-3 text-center">
            La partie s’initialise avec un GM + 5 joueurs. Ajoutables dans le lobby.
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
          <SimLobby game={game} me={me} dispatch={dispatch} />
        ) : isGmView ? (
          <SimStorytellerView game={game} me={me} dispatch={dispatch} />
        ) : (
          <SimPlayerView game={game} me={me} dispatch={dispatch} />
        )}
      </div>
    </div>
  );
}

function PerspectiveBar({ game, viewerId, onSelect }: any) {
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
          {CROWN_EMOJI} GM
        </button>
        {game.players.map((p: any) => {
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
              {p.name}
              {p.role === "drunk" ? " 🍺" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScriptReference({ scriptId, onClose }: any) {
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
                  return (
                    <div key={id}
                      className={`ring-1 transition-all cursor-pointer ${open ? `bg-stone-800/70 ${tc.ring}` : "bg-stone-900 ring-stone-800"}`}
                      onClick={() => setExpanded(open ? null : id)}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tc.accent}`} />
                        <div className="flex-1">
                          <span className={`text-sm italic ${open ? tc.text : "text-stone-200"}`}>{role.name}</span>
                          {!open && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{role.ability}</p>}
                        </div>
                        {open ? <ChevronUp className="w-3 h-3 text-stone-500" /> : <ChevronDown className="w-3 h-3 text-stone-500" />}
                      </div>
                      {open && (
                        <div className="px-4 pb-4">
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

function SimLobby({ game, me, dispatch }: any) {
  const script = SCRIPTS[game.scriptId];
  const isStoryteller = game.players[0]?.id === me.id;
  const playableCount = game.players.length - 1;
  const canStart = playableCount >= 5 && isStoryteller;

  const [step, setStep] = useState<"players" | "roles" | "drunk">("players");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [drunkFakeRoleId, setDrunkFakeRoleId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const teamOrder: Team[] = ["townsfolk", "outsider", "minion", "demon"];

  const launch = (roleIds: string[]) => {
    if (roleIds.includes("drunk")) {
      const opts = roleIds.filter(id => id !== "drunk" && script.roles[id]?.team === "townsfolk");
      if (opts.length > 0) {
        setStep("drunk");
        return;
      }
    }
    dispatch({
      type: "START_GAME",
      storytellerId: game.players[0].id,
      selectedRoleIds: roleIds,
      drunkFakeRoleId: null,
    });
  };

  const fakeRoleOptions = selectedRoleIds
    .filter(id => id !== "drunk" && script.roles[id]?.team === "townsfolk")
    .map(id => ({ id, ...script.roles[id] }));

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="text-xs tracking-[0.3em] uppercase text-stone-500 mb-2">Lobby</div>
        <div className="text-5xl tracking-[0.4em] text-stone-100 mb-4">{game.code}</div>
        <div className="text-stone-400 text-sm italic">{script.name}</div>
      </div>

      <div className="bg-stone-900 ring-1 ring-stone-700 p-4 mb-6">
        <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mb-3 flex items-center gap-2">
          <Users className="w-3 h-3" /> Joueurs ({game.players.length})
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {game.players.map((p: any, i: number) => (
            <div key={p.id}
              className={`inline-flex items-center gap-2 px-3 py-1 ring-1 ${
                p.id === me.id ? "bg-amber-900/30 ring-amber-700/50 text-amber-100" : "bg-stone-800 ring-stone-700 text-stone-200"
              }`}>
              {i === 0 && <Crown className="w-3 h-3 text-amber-400" />}
              <span className="text-sm">{p.name}</span>
              {i === 0 && <span className="text-[10px] text-amber-400 uppercase">GM</span>}
              {i !== 0 && (
                <button onClick={() => dispatch({ type: "REMOVE_PLAYER", playerId: p.id })}
                  className="text-stone-500 hover:text-red-400 ml-1">
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
          <button onClick={() => setStep("roles")}
            className="w-full p-4 bg-stone-800 hover:bg-stone-700 text-stone-100 ring-1 ring-stone-600 tracking-[0.2em] uppercase text-sm mb-3 flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" /> Configurer les rôles
          </button>
          <button onClick={() => launch([])}
            className="w-full p-4 bg-red-900/60 hover:bg-red-900 text-stone-300 hover:text-stone-100 ring-1 ring-red-900/50 tracking-[0.2em] uppercase text-xs">
            Lancer avec rôles aléatoires
          </button>
        </>
      )}

      {step === "roles" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-stone-400 text-xs tracking-[0.2em] uppercase">Choix des rôles</div>
            <div className={`text-sm ${selectedRoleIds.length === playableCount ? "text-amber-400" : "text-stone-400"}`}>
              {selectedRoleIds.length}/{playableCount}
            </div>
          </div>
          {teamOrder.map(team => {
            const roles = Object.entries(script.roles).filter(([, r]) => r.team === team);
            if (!roles.length) return null;
            const tc = TEAM_COLORS[team];
            return (
              <div key={team} className="mb-4">
                <div className={`text-xs uppercase tracking-[0.3em] mb-2 ${tc.text} opacity-70`}>{tc.label}</div>
                <div className="space-y-1">
                  {roles.map(([id, role]) => {
                    const checked = selectedRoleIds.includes(id);
                    return (
                      <button key={id}
                        onClick={() => setSelectedRoleIds(prev =>
                          prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
                        )}
                        className={`w-full flex items-center gap-3 px-3 py-2 ring-1 text-left ${
                          checked ? `bg-stone-800/70 ${tc.ring} ${tc.text}` : "bg-stone-900 ring-stone-800 text-stone-400 hover:ring-stone-600"
                        }`}>
                        <div className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                          checked ? `${tc.accent} border-transparent text-stone-100` : "border-stone-600"
                        }`}>{checked && "✓"}</div>
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
            <button onClick={() => { setStep("players"); setSelectedRoleIds([]); }}
              className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm">← Annuler</button>
            <button onClick={() => launch(selectedRoleIds)}
              disabled={selectedRoleIds.length !== playableCount}
              className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 tracking-[0.2em] uppercase text-sm">
              {selectedRoleIds.length === playableCount ? "Lancer" : `${playableCount - selectedRoleIds.length} manquant(s)`}
            </button>
          </div>
        </div>
      )}

      {step === "drunk" && (
        <div>
          <div className="bg-amber-950/40 ring-1 ring-amber-800/40 p-4 mb-6">
            <div className="text-amber-400 text-sm font-medium mb-2">🍺 Drunk est en jeu</div>
            <p className="text-stone-300 text-sm">Choisis le rôle qu’il croit avoir.</p>
          </div>
          <div className="space-y-2 mb-6">
            {fakeRoleOptions.map(role => {
              const sel = drunkFakeRoleId === role.id;
              return (
                <button key={role.id} onClick={() => setDrunkFakeRoleId(role.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 ring-1 text-left ${
                    sel ? "bg-stone-800/70 ring-amber-700/60 text-amber-200" : "bg-stone-900 ring-stone-800 text-stone-300 hover:ring-stone-600"
                  }`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    sel ? "border-amber-700 bg-amber-700" : "border-stone-600"
                  }`}>{sel && <div className="w-1.5 h-1.5 rounded-full bg-stone-100" />}</div>
                  <div>
                    <div className="text-sm italic">{role.name}</div>
                    <div className="text-xs opacity-60 line-clamp-1 mt-0.5">{role.ability}</div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setStep("roles"); setDrunkFakeRoleId(null); }}
              className="flex-1 p-3 bg-stone-900 ring-1 ring-stone-700 text-stone-400 text-sm">← Retour</button>
            <button onClick={() => dispatch({
                type: "START_GAME",
                storytellerId: game.players[0].id,
                selectedRoleIds,
                drunkFakeRoleId,
              })}
              disabled={!drunkFakeRoleId}
              className="flex-grow-[2] p-3 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-red-700/50 tracking-[0.2em] uppercase text-sm">
              Confirmer et lancer
            </button>
          </div>
        </div>
      )}

      {!canStart && step === "players" && (
        <div className="text-center text-stone-500 text-sm italic">
          Ajoute au moins {Math.max(0, 5 - playableCount)} joueur(s) supplémentaire(s).
        </div>
      )}
    </div>
  );
}

function SimStorytellerView({ game, me, dispatch }: any) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const selected = game.players.find((p: any) => p.id === selectedId);
  const playable = game.players.filter((p: any) => !p.isStoryteller);

  const isFirstNight = game.day === 1;
  const nightOrder = playable
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

  // Ouverture auto du panneau quand on sélectionne un joueur
  useEffect(() => { if (selectedId) setPanelOpen(true); }, [selectedId]);
  // Ouverture auto en phase nuit (utile pour voir l'ordre nocturne)
  useEffect(() => { if (game.phase === "night") setPanelOpen(true); }, [game.phase]);

  // Rayon adaptatif : croissance basée sur le nombre de joueurs, plafond
  // qui dépend de l'état du drawer (drawer fermé → plus de place dispo).
  const radius = panelOpen
    ? Math.min(280, 110 + playable.length * 22)
    : Math.min(400, 140 + playable.length * 28);
  const center = radius + 60;
  const size = center * 2;

  const closePanel = () => { setSelectedId(null); setPanelOpen(false); };

  return (
    <div className="min-h-[100dvh] px-2 sm:px-4 pb-6 pt-3 flex flex-col">
      {showScript && <ScriptReference scriptId={game.scriptId} onClose={() => setShowScript(false)} />}

      <div className="flex items-center justify-between mb-4 max-w-7xl w-full mx-auto gap-2">
        <div className="text-stone-500 text-xs tracking-[0.2em] uppercase hidden md:block">
          Conteur · {game.code}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setShowScript(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 ring-1 ring-stone-700 bg-stone-900 hover:bg-stone-800 text-stone-400 text-xs uppercase tracking-wider">
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
          <button onClick={() => setPanelOpen(o => !o)}
            aria-label={panelOpen ? "Fermer le panneau" : "Ouvrir le panneau"}
            className={`flex items-center justify-center w-10 h-10 ring-1 transition-all ${
              panelOpen ? "bg-amber-950/40 ring-amber-700/50 text-amber-200" : "bg-stone-900 ring-stone-700 text-stone-400 hover:text-stone-200"
            }`}>
            {panelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col items-center justify-center">
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-2 text-stone-400 text-xs tracking-[0.3em] uppercase">
            <BookOpen className="w-3 h-3" /> Grimoire
          </div>
        </div>
        <div className="relative" style={{ width: size, height: size, maxWidth: "100%" }}>
          <div className="absolute inset-12 rounded-full ring-1 ring-stone-700/40" />
          <div className="absolute inset-20 rounded-full ring-1 ring-stone-800/40" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Skull className="w-10 h-10 text-stone-700" strokeWidth={1.2} />
          </div>
          {playable.map((p: any, i: number) => {
            const angle = (i / playable.length) * 2 * Math.PI - Math.PI / 2;
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
                  selectedId === p.id ? "scale-110 ring-amber-400" : isNominee ? "ring-orange-400" : team.ring
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
                  <span className="text-xs uppercase text-stone-300">{TEAM_COLORS[ROLES[selected.role!].team as Team].label}</span>
                </div>
                <div className={`text-lg italic mb-1 ${TEAM_COLORS[ROLES[selected.role!].team as Team].text}`}>{ROLES[selected.role!].name}</div>
                <p className="text-xs text-stone-400">{ROLES[selected.role!].ability}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => dispatch({ type: "TOGGLE_ALIVE", playerId: selected.id, storytellerId: me.id })}
                  className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide ${
                    !selected.alive ? "bg-stone-800 ring-stone-600 text-stone-300" : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-stone-700"
                  }`}>
                  {selected.alive ? <Sparkles className="w-4 h-4 text-amber-400" /> : <Skull className="w-4 h-4 text-stone-400" />}
                  {selected.alive ? "Tuer" : "Vivant"}
                </button>
                <button onClick={() => selected.alive && dispatch({ type: "TOGGLE_POISON", playerId: selected.id, storytellerId: me.id })}
                  disabled={!selected.alive}
                  className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide disabled:opacity-40 ${
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
                  className={`flex flex-col items-center gap-1 p-2 ring-1 text-xs uppercase tracking-wide disabled:opacity-40 ${
                    game.nominee === selected.id ? "bg-orange-900 ring-orange-700 text-orange-200" : "bg-stone-800 ring-stone-700 text-stone-200 hover:bg-orange-900/40"
                  }`}>
                  <Gavel className="w-4 h-4" />
                  {game.nominee === selected.id ? "Nominé" : "Nominer"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-stone-900 text-stone-300 p-4 ring-1 ring-stone-700 text-center">
              <BookOpen className="w-7 h-7 mx-auto mb-2 text-stone-500" />
              <p className="text-sm italic text-stone-500">Touche un joueur</p>
            </div>
          )}

          {game.nominee && (
            <div className="bg-orange-950/50 ring-1 ring-orange-800 p-3">
              <div className="text-orange-300 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Gavel className="w-3 h-3" /> Nomination
              </div>
              <div className="text-stone-100 font-medium">
                {game.players.find((p: any) => p.id === game.nominee)?.name}
              </div>
              <button onClick={() => dispatch({ type: "CLEAR_NOMINATION", storytellerId: me.id })}
                className="text-orange-400 text-xs underline mt-1">Annuler</button>
            </div>
          )}

          {game.phase === "night" && (
            <div className="bg-indigo-950/60 ring-1 ring-indigo-900 p-4">
              <div className="text-indigo-300 text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <Moon className="w-3 h-3" /> Ordre de la nuit {game.day}
              </div>
              {nightOrder.length === 0 ? (
                <p className="text-stone-500 text-xs italic">Aucune action.</p>
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

function SimPlayerView({ game, me, dispatch }: any) {
  const script = SCRIPTS[game.scriptId];
  const ROLES = script.roles;
  const others = game.players.filter((p: any) => p.id !== me.id && !p.isStoryteller);
  const [revealed, setRevealed] = useState(false);
  const [showScript, setShowScript] = useState(false);

  const displayRoleId = me.displayRole || me.role;
  const myRole = ROLES[displayRoleId!];
  const team = TEAM_COLORS[myRole.team as Team];

  return (
    <div className="p-6">
      {showScript && <ScriptReference scriptId={game.scriptId} onClose={() => setShowScript(false)} />}

      <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <div className="text-stone-500 text-xs tracking-[0.3em]">{game.code}</div>
        <div className="flex items-center gap-2 text-stone-500 text-xs uppercase">
          {game.phase === "day" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
          {game.phase === "day" ? "Jour" : "Nuit"} {game.day}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-stone-900/90 text-stone-100 p-8 ring-1 ring-amber-900/40 mb-4">
          <div className="text-center">
            <div className="text-xs uppercase text-stone-400 mb-1">
              Bonjour {me.name}, ton rôle est
            </div>
            {revealed ? (
              <>
                <div className="my-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/60 ring-1 ring-amber-800/40 text-amber-200/80 text-[10px] uppercase tracking-[0.3em]">
                    <span className="w-1 h-1 bg-amber-500/70 rounded-full" />{team.label}
                  </div>
                </div>
                <h2 className="text-5xl mb-4 italic text-amber-100">{myRole.name}</h2>
                <div className="text-left max-w-md mx-auto bg-stone-950/60 ring-1 ring-stone-700 p-4 mb-4">
                  <div className="text-xs uppercase text-amber-500/70 tracking-wider mb-2">Capacité</div>
                  <p className="text-stone-200 text-sm">{myRole.ability}</p>
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
                <div className="w-32 h-32 mx-auto bg-stone-800 ring-2 ring-stone-600 flex items-center justify-center">
                  <Eye className="w-12 h-12 text-stone-300" strokeWidth={1.2} />
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.3em] text-stone-400">Révéler</div>
              </button>
            )}
          </div>
        </div>

        <button onClick={() => setShowScript(true)}
          className="w-full flex items-center justify-center gap-2 p-3 mb-6 bg-stone-900 ring-1 ring-stone-700 text-stone-400 hover:text-stone-200 text-xs uppercase tracking-[0.2em]">
          <BookOpen className="w-3 h-3" /> Tous les rôles
        </button>

        <div className="mb-6">
          <h3 className="text-stone-400 text-xs uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" /> Le village
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {others.map((p: any) => (
              <button key={p.id}
                onClick={() => game.phase === "day" && p.alive && dispatch({ type: "NOMINATE", nominatorId: me.id, nomineeId: p.id })}
                disabled={!p.alive || game.phase !== "day"}
                className={`p-3 ring-1 ${
                  p.alive ? "bg-stone-900 ring-stone-700 hover:ring-stone-500" : "bg-stone-950 ring-stone-800 opacity-40"
                } ${game.nominee === p.id ? "ring-orange-500 bg-orange-950/40" : ""}`}>
                <div className="aspect-square rounded-full bg-stone-800 ring-1 ring-stone-700 flex items-center justify-center mb-2 mx-auto"
                  style={{ width: 48, height: 48 }}>
                  {p.alive ? <span className="text-stone-300 text-lg">{p.name[0]}</span> : <Skull className="w-5 h-5 text-stone-600" />}
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
            La nuit tombe. Ferme les yeux…
          </div>
        )}
      </div>
    </div>
  );
}
