import { NextRequest, NextResponse } from "next/server";
import { applyAction } from "@/lib/game";
import { getGame, saveGame } from "@/lib/store";
import { pusherServer, channelName } from "@/lib/pusher-server";
import type { GameAction, GameState } from "@/lib/types";

// L'action est-elle légitime venant de `callerId` ?
// Les rôles privilégiés (GM) sont :
//   - state.storytellerId une fois la partie lancée
//   - state.players[0].id (le 1er joueur ajouté) tant qu'on est en lobby
function isAuthorized(state: GameState, action: GameAction, callerId: string): boolean {
  const gmId = state.storytellerId ?? state.players[0]?.id ?? null;
  const isGM = gmId !== null && callerId === gmId;

  switch (action.type) {
    case "ADD_PLAYER":
      // Réservé à l'endpoint /join
      return false;
    case "REMOVE_PLAYER":
    case "REORDER_PLAYERS":
      return isGM;
    case "START_GAME":
      return isGM && action.storytellerId === callerId;
    case "TOGGLE_ALIVE":
    case "TOGGLE_POISON":
    case "SET_NOMINEE":
    case "TOGGLE_PHASE":
    case "CLEAR_NOMINATION":
    case "RESOLVE_NOMINATION":
    case "SET_ROLE_INFO":
    case "SET_PLAYER_ROLE":
    case "ADD_REMINDER":
    case "REMOVE_REMINDER":
    case "TOGGLE_NIGHT_DONE":
      return isGM && action.storytellerId === callerId;
    case "NOMINATE":
      return action.nominatorId === callerId;
    case "VOTE":
      return action.voterId === callerId;
    case "SLAYER_SHOOT":
      return action.shooterId === callerId;
    case "SEND_CHAT":
      return action.fromId === callerId;
    case "EXILE_TRAVELER":
      return isGM && action.storytellerId === callerId;
    default:
      return false;
  }
}

export async function POST(req: NextRequest) {
  const { code, playerId, secret, action } = (await req.json()) as {
    code: string;
    playerId: string;
    secret: string;
    action: GameAction;
  };
  if (!code || !playerId || !secret || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const game = await getGame(code);
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  const expected = game.secrets[playerId];
  if (!expected || expected !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAuthorized(game, action, playerId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = applyAction(game, action);
  await saveGame(updated);
  await pusherServer.trigger(channelName(code), "state-changed", { at: Date.now() });

  return NextResponse.json({ ok: true });
}
