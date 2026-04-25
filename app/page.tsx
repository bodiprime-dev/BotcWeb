"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Skull, Crown, Users, LogIn, ScrollText } from "lucide-react";
import { getScriptList } from "@/data/scripts";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"home" | "create" | "join">("home");
  const [scriptId, setScriptId] = useState("trouble-brewing");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scripts = getScriptList();

  async function handleCreate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      // Le créateur sera le 1er à rejoindre, et deviendra Conteur
      router.push(`/game/${data.code}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleJoin() {
    if (!code.trim()) return;
    router.push(`/game/${code.trim().toUpperCase()}`);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="text-center mb-14">
        <Skull className="w-16 h-16 text-stone-300 mx-auto mb-6" strokeWidth={1.2} />
        <h1 className="text-4xl md:text-6xl tracking-wider text-stone-100 mb-2 font-semibold">Blood on the</h1>
        <h1 className="text-4xl md:text-6xl tracking-wider text-red-500 italic font-semibold">Clocktower</h1>
        <p className="mt-5 text-stone-500 tracking-[0.3em] text-xs uppercase">— Table Virtuelle —</p>
      </div>

      {mode === "home" && (
        <div className="w-full max-w-md space-y-3">
          <button onClick={() => setMode("create")} className="w-full p-5 bg-stone-900 hover:bg-stone-800 ring-1 ring-stone-700 transition-all">
            <div className="flex items-center gap-4">
              <Crown className="w-7 h-7 text-amber-300" />
              <div className="text-left">
                <div className="text-stone-100 text-lg tracking-wide">Créer une partie</div>
                <div className="text-stone-500 text-xs">Tu seras le Conteur</div>
              </div>
            </div>
          </button>

          <button onClick={() => setMode("join")} className="w-full p-5 bg-stone-900 hover:bg-stone-800 ring-1 ring-stone-700 transition-all">
            <div className="flex items-center gap-4">
              <Users className="w-7 h-7 text-stone-300" />
              <div className="text-left">
                <div className="text-stone-100 text-lg tracking-wide">Rejoindre une partie</div>
                <div className="text-stone-500 text-xs">Avec un code à 4 lettres</div>
              </div>
            </div>
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="w-full max-w-md">
          <button onClick={() => setMode("home")} className="text-stone-400 text-sm mb-4 hover:text-stone-200">← Retour</button>
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mb-2 flex items-center gap-2">
            <ScrollText className="w-3 h-3" /> Choisir un scénario
          </div>
          <div className="space-y-2 mb-6">
            {scripts.map(s => (
              <button
                key={s.id}
                onClick={() => setScriptId(s.id)}
                className={`w-full text-left p-4 ring-1 transition-all ${scriptId === s.id ? "bg-stone-800 ring-amber-600/60" : "bg-stone-900 ring-stone-700 hover:ring-stone-600"}`}
              >
                <div className="flex items-baseline justify-between">
                  <div className="text-stone-100">{s.name}</div>
                  <div className="text-stone-500 text-xs">{s.roleCount} rôles</div>
                </div>
                <div className="text-stone-500 text-xs italic mt-1">{s.description}</div>
              </button>
            ))}
          </div>
          <button onClick={handleCreate} disabled={loading} className="w-full p-4 bg-red-900 hover:bg-red-800 disabled:bg-stone-800 text-stone-100 ring-1 ring-red-700/50 tracking-[0.2em] uppercase text-sm">
            {loading ? "Création..." : "Créer la partie"}
          </button>
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      )}

      {mode === "join" && (
        <div className="w-full max-w-md">
          <button onClick={() => setMode("home")} className="text-stone-400 text-sm mb-4 hover:text-stone-200">← Retour</button>
          <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mb-2">Code de partie</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD"
            maxLength={4}
            className="w-full px-4 py-4 bg-stone-900 ring-1 ring-stone-700 text-stone-100 placeholder:text-stone-600 tracking-[0.4em] text-center text-2xl uppercase focus:outline-none focus:ring-amber-700/60 mb-4"
          />
          <button onClick={handleJoin} disabled={code.length !== 4} className="w-full p-4 bg-stone-700 hover:bg-stone-600 disabled:bg-stone-800 disabled:text-stone-600 text-stone-100 ring-1 ring-stone-600 tracking-[0.2em] uppercase text-sm flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Rejoindre
          </button>
        </div>
      )}
    </div>
  );
}
