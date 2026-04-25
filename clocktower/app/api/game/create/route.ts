import { NextRequest, NextResponse } from "next/server";
import { createNewGame } from "@/lib/game";
import { saveGame } from "@/lib/store";
import { SCRIPTS } from "@/data/scripts";

export async function POST(req: NextRequest) {
  const { scriptId } = await req.json();
  if (!scriptId || !SCRIPTS[scriptId]) {
    return NextResponse.json({ error: "Invalid script" }, { status: 400 });
  }
  const game = createNewGame(scriptId);
  await saveGame(game);
  return NextResponse.json({ code: game.code });
}
