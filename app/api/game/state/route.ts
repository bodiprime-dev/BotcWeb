import { NextRequest, NextResponse } from "next/server";
import { getGame } from "@/lib/store";
import { getPlayerView } from "@/lib/game";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const playerId = searchParams.get("playerId");
  if (!code || !playerId) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const game = await getGame(code);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const view = getPlayerView(game, playerId);
  if (!view) return NextResponse.json({ error: "Player not in game" }, { status: 403 });

  return NextResponse.json(view);
}
