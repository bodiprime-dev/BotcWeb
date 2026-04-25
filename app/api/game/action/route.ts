import { NextRequest, NextResponse } from "next/server";
import { applyAction } from "@/lib/game";
import { getGame, saveGame } from "@/lib/store";
import { pusherServer, channelName } from "@/lib/pusher-server";
import type { GameAction } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { code, action } = (await req.json()) as { code: string; action: GameAction };
  if (!code || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const game = await getGame(code);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const updated = applyAction(game, action);
  await saveGame(updated);
  await pusherServer.trigger(channelName(code), "state-update", { state: updated });

  return NextResponse.json({ ok: true });
}
