"use client";
import { readJsonResponse } from "./fetch-json";

type Health = {
  ok?: boolean;
  store?: { configured?: boolean; reachable?: boolean; error?: string | null; variables?: string[] };
  commit?: string | null;
  env?: string | null;
};

// Traduit un échec d'appel API en cause concrète, en interrogeant /api/health.
//
// Sans cela, l'utilisateur d'un déploiement mal configuré n'a qu'un message
// générique : il ne peut pas distinguer « pas de base reliée » d'une panne
// passagère, et le diagnostic passe forcément par les logs Vercel.
// Retourne `null` quand le serveur est sain (la panne est alors ailleurs).
export async function describeServerFailure(): Promise<string | null> {
  let health: Health | null = null;
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    health = (await readJsonResponse<Health>(res)).data;
  } catch {
    return "Serveur injoignable depuis ce navigateur (réseau, VPN ou bloqueur de contenu).";
  }

  // /api/health absent ou non-JSON : le build servi est antérieur à son ajout.
  if (!health || typeof health.ok !== "boolean") {
    return "Ce déploiement date d'avant le diagnostic /api/health — redéploie la dernière version de main.";
  }

  const store = health.store ?? {};
  if (store.configured === false) {
    return "Aucune base KV/Upstash n'est reliée à ce déploiement : relie-la au projet dans Vercel (onglet Storage), puis redéploie.";
  }
  if (store.reachable === false) {
    return `Base reliée mais injoignable (${store.error ?? "raison inconnue"}) — vérifie que le token REST est toujours valide.`;
  }
  return null;
}
