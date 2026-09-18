"use client";
import PusherClient from "pusher-js";

export const channelName = (code: string) => `game-${code}`;

let client: PusherClient | null = null;
let unavailable = false;

// Les variables NEXT_PUBLIC_* sont inlinées au moment du build. Si les clés
// Pusher manquent (build fait avant leur configuration, déploiement de test…),
// `new PusherClient(undefined)` lève "You must pass your app key when you
// instantiate Pusher" — l'exception remontait dans le rendu de la page de jeu
// et la faisait planter en boucle : partie créée, puis écran mort.
//
// On renvoie désormais `null` : la page bascule sur son sondage périodique.
export function getPusherClient(): PusherClient | null {
  if (client) return client;
  if (unavailable) return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) {
    unavailable = true;
    console.warn("[pusher] clés absentes — synchronisation par sondage");
    return null;
  }

  try {
    client = new PusherClient(key, { cluster });
    return client;
  } catch (e) {
    unavailable = true;
    console.error("[pusher] initialisation impossible", e);
    return null;
  }
}

export function isRealtimeAvailable(): boolean {
  return getPusherClient() !== null;
}
