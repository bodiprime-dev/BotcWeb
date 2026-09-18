import Pusher from "pusher";

export const channelName = (code: string) => `game-${code}`;

// Le client Pusher est instancié paresseusement : `new Pusher()` lève une
// exception si une variable d'environnement manque. Au niveau module, cette
// exception se produisait à l'import et transformait *toute* requête vers
// /api/game/join et /api/game/action en 500 opaque, même quand la partie
// elle-même était parfaitement saine.
let cached: Pusher | null = null;
let cachedFailed = false;

export function getPusherServer(): Pusher | null {
  if (cached) return cached;
  if (cachedFailed) return null;

  const { PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, PUSHER_SECRET, NEXT_PUBLIC_PUSHER_CLUSTER } = process.env;
  if (!PUSHER_APP_ID || !NEXT_PUBLIC_PUSHER_KEY || !PUSHER_SECRET || !NEXT_PUBLIC_PUSHER_CLUSTER) {
    cachedFailed = true;
    console.warn("[pusher] variables d'environnement manquantes — temps réel désactivé");
    return null;
  }

  try {
    cached = new Pusher({
      appId: PUSHER_APP_ID,
      key: NEXT_PUBLIC_PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    });
    return cached;
  } catch (e) {
    cachedFailed = true;
    console.error("[pusher] initialisation impossible", e);
    return null;
  }
}

// Notifie les clients qu'une partie a changé.
//
// Volontairement non bloquant : l'état est déjà persisté quand on arrive ici.
// Si Pusher est indisponible (quota, panne, config absente), l'action reste
// valide — les clients se resynchronisent au focus/visibilitychange. Faire
// échouer la requête ici donnait l'illusion que l'action n'était pas passée
// alors qu'elle l'était.
export async function notifyGame(code: string): Promise<boolean> {
  const pusher = getPusherServer();
  if (!pusher) return false;
  try {
    await pusher.trigger(channelName(code), "state-changed", { at: Date.now() });
    return true;
  } catch (e) {
    console.error("[pusher] trigger échoué pour", code, e);
    return false;
  }
}
