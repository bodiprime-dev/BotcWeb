import { NextRequest, NextResponse } from "next/server";
import { applyAction } from "@/lib/game";
import { getGame, saveGame } from "@/lib/store";
import { notifyGame } from "@/lib/pusher-server";
import { normalizeCode, readJson, withApiErrors } from "@/lib/api";

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    const body = await readJson<{ code?: string; name?: string }>(req);
    const code = normalizeCode(body?.code);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!code || !name) return NextResponse.json({ error: "Code et nom requis" }, { status: 400 });

    const game = await getGame(code);
    if (!game) return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });

    const before = game.players.length;
    const updated = applyAction(game, { type: "ADD_PLAYER", name });
    if (updated.players.length === before) {
      return NextResponse.json({ error: "Impossible de rejoindre (partie lancée ou nom déjà pris)" }, { status: 400 });
    }

    const newPlayer = updated.players[updated.players.length - 1];
    const secret = updated.secrets[newPlayer.id];
    await saveGame(updated);
    // Best-effort : un échec Pusher ne doit pas annuler une arrivée déjà persistée.
    const realtime = await notifyGame(code);

    return NextResponse.json({ playerId: newPlayer.id, secret, realtime });
  });
}
