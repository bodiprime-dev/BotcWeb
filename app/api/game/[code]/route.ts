import { NextRequest, NextResponse } from "next/server";
import { getGame } from "@/lib/store";
import { redactStateFor } from "@/lib/game";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  const game = await getGame(code);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  return NextResponse.json({ state: redactStateFor(game, playerId) });
}
