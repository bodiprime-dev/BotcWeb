import { NextRequest, NextResponse } from "next/server";
import { getGame } from "@/lib/store";
import { getPlayerView } from "@/lib/game";
import { normalizeCode, withApiErrors } from "@/lib/api";

export async function GET(req: NextRequest) {
  return withApiErrors(async () => {
    const { searchParams } = new URL(req.url);
    const code = normalizeCode(searchParams.get("code"));
    const playerId = searchParams.get("playerId");
    if (!code || !playerId) return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });

    const game = await getGame(code);
    if (!game) return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });

    const view = getPlayerView(game, playerId);
    if (!view) return NextResponse.json({ error: "Joueur absent de cette partie" }, { status: 403 });

    return NextResponse.json(view);
  });
}
