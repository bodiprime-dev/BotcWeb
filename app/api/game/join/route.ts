import { NextRequest, NextResponse } from "next/server";
import { applyAction } from "@/lib/game";
import { getGame, saveGame } from "@/lib/store";
import { pusherServer, channelName } from "@/lib/pusher-server";

export async function POST(req: NextRequest) {
  const { code, name } = await req.json();
  if (!code || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const game = await getGame(code);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const before = game.players.length;
  const updated = applyAction(game, { type: "ADD_PLAYER", name });
  if (updated.players.length === before) {
    return NextResponse.json({ error: "Cannot add player (lobby closed or duplicate name)" }, { status: 400 });
  }

  const newPlayer = updated.players[updated.players.length - 1];
  await saveGame(updated);
  await pusherServer.trigger(channelName(code), "state-update", { state: updated });

  return NextResponse.json({ playerId: newPlayer.id });
}
