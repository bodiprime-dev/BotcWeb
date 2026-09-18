import { NextRequest, NextResponse } from "next/server";
import { getGame } from "@/lib/store";
import { redactStateFor } from "@/lib/game";
import { normalizeCode, withApiErrors } from "@/lib/api";

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  return withApiErrors(async () => {
    const code = normalizeCode(params.code);
    if (!code) return NextResponse.json({ error: "Code manquant" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");

    const game = await getGame(code);
    if (!game) return NextResponse.json({ error: "Partie introuvable" }, { status: 404 });

    return NextResponse.json({ state: redactStateFor(game, playerId) });
  });
}
