"use client";
import { Crown, Skull } from "lucide-react";
import type { GameState } from "@/lib/types";

export function VictoryBanner({ game }: { game: GameState }) {
  if (!game.winner) return null;
  const isGood = game.winner === "good";
  return (
    <div
      className={`max-w-3xl mx-auto mb-4 p-5 ring-2 text-center ${
        isGood
          ? "bg-amber-950/50 ring-amber-600/60 text-amber-100"
          : "bg-red-950/60 ring-red-700/70 text-red-100"
      }`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        {isGood ? <Crown className="w-5 h-5" /> : <Skull className="w-5 h-5" />}
        <span className="text-xs uppercase tracking-[0.3em] opacity-80">Fin de partie</span>
      </div>
      <div className={`text-3xl tracking-wide italic font-display ${isGood ? "text-amber-200" : "text-red-200"}`}>
        {isGood ? "Les Bons l'emportent" : "Les Maléfiques l'emportent"}
      </div>
      {game.winReason && (
        <div className="text-sm opacity-80 mt-2">{game.winReason}</div>
      )}
    </div>
  );
}
