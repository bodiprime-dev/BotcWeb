"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, Users, X } from "lucide-react";
import type { GameState, GameAction, Player } from "@/lib/types";

export function ChatPanel({
  game,
  me,
  dispatch,
}: {
  game: GameState;
  me: Player;
  dispatch: (action: GameAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string | "all">("all");
  const [text, setText] = useState("");
  // Timestamp du dernier marquage "lu" persistant (localStorage), par partie + joueur.
  // Initialisé à 0 côté SSR — corrigé après hydratation pour éviter les mismatches.
  const [lastReadAt, setLastReadAt] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const storageKey = `bot:${game.code}:chatRead:${me.id}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) setLastReadAt(parseInt(stored, 10) || 0);
  }, [storageKey]);

  // Messages que je suis autorisé à voir.
  const relevantMessages = useMemo(() => {
    if (me.isStoryteller) return game.chat;
    return game.chat.filter(m =>
      m.toId === "all" || m.fromId === me.id || m.toId === me.id
    );
  }, [game.chat, me.id, me.isStoryteller]);

  // Messages affichés dans l'onglet courant.
  const filtered = useMemo(() => {
    if (target === "all") return game.chat.filter(m => m.toId === "all");
    return game.chat.filter(m =>
      (m.fromId === me.id && m.toId === target) ||
      (m.fromId === target && m.toId === me.id)
    );
  }, [game.chat, me.id, target]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, filtered.length]);

  // Tant que le panneau est ouvert, marquer comme lu chaque fois qu'un nouveau
  // message arrive (évite de garder le compteur à 0 à la fermeture si des messages
  // sont arrivés pendant la lecture).
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const now = Date.now();
    setLastReadAt(now);
    window.localStorage.setItem(storageKey, String(now));
  }, [open, game.chat.length, storageKey]);

  const totalUnread = useMemo(
    () => relevantMessages.filter(m => m.at > lastReadAt && m.fromId !== me.id).length,
    [relevantMessages, lastReadAt, me.id]
  );

  // Le chat est désactivé tant que le GM ne l'a pas activé.
  // (Hooks déclarés avant ce return pour respecter les règles React.)
  if (!game.chatEnabled) return null;

  const players = game.players.filter(p => p.id !== me.id);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    dispatch({ type: "SEND_CHAT", fromId: me.id, toId: target, text: t });
    setText("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 w-12 h-12 rounded-full bg-stone-900 ring-1 ring-stone-700 hover:ring-stone-500 text-stone-200 flex items-center justify-center shadow-xl"
        aria-label="Ouvrir le chat"
      >
        <MessageCircle className="w-5 h-5" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 bg-amber-700 text-amber-50 text-[10px] rounded-full px-1.5 py-px ring-1 ring-amber-900">
            {Math.min(totalUnread, 99)}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-end p-2 sm:p-6">
          <div className="bg-stone-950 ring-1 ring-stone-700 w-full sm:max-w-md h-[80vh] sm:h-[600px] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-stone-800">
              <div className="flex items-center gap-2 text-stone-300 text-sm">
                <MessageCircle className="w-4 h-4" /> Chat
              </div>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 p-2 border-b border-stone-800 overflow-x-auto flex-shrink-0">
              <button
                onClick={() => setTarget("all")}
                className={`flex-shrink-0 px-3 py-1 ring-1 text-xs uppercase tracking-wide flex items-center gap-1 ${
                  target === "all"
                    ? "bg-amber-900 ring-amber-700 text-amber-100"
                    : "bg-stone-900 ring-stone-700 text-stone-400 hover:ring-stone-500"
                }`}
              >
                <Users className="w-3 h-3" /> Public
              </button>
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => setTarget(p.id)}
                  className={`flex-shrink-0 px-3 py-1 ring-1 text-xs ${
                    target === p.id
                      ? "bg-indigo-900 ring-indigo-700 text-indigo-100"
                      : "bg-stone-900 ring-stone-700 text-stone-400 hover:ring-stone-500"
                  } ${!p.alive ? "opacity-50" : ""}`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {filtered.length === 0 && (
                <p className="text-xs text-stone-500 italic text-center py-8">
                  {target === "all"
                    ? "Aucun message public pour l'instant."
                    : "Aucun chuchotement avec ce joueur."}
                </p>
              )}
              {filtered.map(m => {
                const from = game.players.find(p => p.id === m.fromId);
                const isMe = m.fromId === me.id;
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-3 py-2 ring-1 ${
                      isMe
                        ? "bg-amber-950/50 ring-amber-800/50 text-amber-100"
                        : "bg-stone-900 ring-stone-700 text-stone-200"
                    }`}>
                      <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">
                        {from?.name ?? "?"}{m.toId !== "all" && ` → ${game.players.find(p => p.id === m.toId)?.name ?? "?"}`}
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2 border-t border-stone-800 flex gap-1 flex-shrink-0">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder={target === "all" ? "Message public…" : "Chuchoter…"}
                className="flex-1 px-3 py-2 bg-stone-900 ring-1 ring-stone-700 text-stone-100 placeholder:text-stone-600 text-sm focus:outline-none focus:ring-stone-500"
              />
              <button
                onClick={send}
                disabled={!text.trim()}
                className="px-3 ring-1 bg-stone-800 hover:bg-stone-700 ring-stone-700 disabled:opacity-40 text-stone-100"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
