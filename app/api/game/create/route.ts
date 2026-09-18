import { NextRequest, NextResponse } from "next/server";
import { createNewGame } from "@/lib/game";
import { saveGame } from "@/lib/store";
import { readJson, withApiErrors } from "@/lib/api";
import { SCRIPTS } from "@/data/scripts";

export async function POST(req: NextRequest) {
  return withApiErrors(async () => {
    const body = await readJson<{ scriptId?: string }>(req);
    const scriptId = body?.scriptId;
    if (!scriptId || !SCRIPTS[scriptId]) {
      return NextResponse.json({ error: "Scénario inconnu" }, { status: 400 });
    }
    const game = createNewGame(scriptId);
    await saveGame(game);
    return NextResponse.json({ code: game.code });
  });
}
