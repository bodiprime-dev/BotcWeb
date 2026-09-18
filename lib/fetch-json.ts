// Lecture de réponse partagée par les pages client.
//
// L'ancien code faisait `await res.json()` *avant* de tester `res.ok`. Dès que
// le serveur répondait autre chose que du JSON (page d'erreur HTML de Next,
// 502 d'un proxy, réponse vide), le parse levait et l'utilisateur recevait
// "Unexpected token '<'" au lieu du vrai motif.
export async function readJsonResponse<T>(res: Response): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  const raw = await res.text();
  let data: T | null = null;
  if (raw) {
    try { data = JSON.parse(raw) as T; } catch { data = null; }
  }

  if (res.ok) return { ok: true, data, error: null };

  const fromBody = (data as { error?: unknown } | null)?.error;
  const error = typeof fromBody === "string" && fromBody
    ? fromBody
    : `Erreur serveur (${res.status})`;
  return { ok: false, data, error };
}

// Message lisible pour une panne réseau (hors ligne, DNS, requête avortée).
export function networkErrorMessage(e: unknown): string {
  if (e instanceof Error && e.name === "AbortError") return "Requête interrompue";
  return "Connexion au serveur impossible — vérifie ta connexion.";
}
