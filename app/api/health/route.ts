import { NextResponse } from "next/server";
import {
  configuredCredentialNames,
  isStoreConfigured,
  pingStore,
  relatedEnvNames,
  storeConfigIssue,
  storeTargetLabel,
} from "@/lib/store";

export const dynamic = "force-dynamic";

// Diagnostic de déploiement.
//
// Les pannes de prod observées viennent toutes de variables d'environnement
// manquantes ou mal nommées, invisibles depuis l'interface (l'utilisateur ne
// voyait qu'un message d'erreur générique au clic sur « Créer la partie »).
// Cette route répond toujours en JSON et n'expose que des booléens et des
// *noms* de variables — jamais une valeur, jamais un secret.
export async function GET() {
  const store = isStoreConfigured();
  const issue = storeConfigIssue();
  const ping = store ? await pingStore() : { ok: false, error: "non configuré", hint: issue ?? undefined };

  const realtimeServer = Boolean(
    process.env.PUSHER_APP_ID &&
      process.env.PUSHER_SECRET &&
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  );

  return NextResponse.json(
    {
      ok: ping.ok,
      store: {
        configured: store,
        // Ce qui bloque, formulé en clair (URL TCP au lieu de REST, token
        // orphelin, variable absente…). `null` quand la config est exploitable.
        issue,
        target: storeTargetLabel(),
        variables: configuredCredentialNames(),
        // Ce qui est présent dans l'environnement, valeurs exclues : la panne
        // est presque toujours « une URL TCP au lieu de la paire REST ».
        relatedVariables: relatedEnvNames(),
        reachable: ping.ok,
        error: ping.ok ? null : ping.error ?? null,
        hint: ping.ok ? null : ping.hint ?? null,
      },
      realtime: {
        // Les NEXT_PUBLIC_* sont figées au build : ajoutées après coup, elles
        // n'atteignent le navigateur qu'au redéploiement suivant.
        configured: realtimeServer,
        note: "Sans Pusher, les clients se synchronisent par sondage (4 s).",
      },
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      env: process.env.VERCEL_ENV ?? null,
    },
    { status: ping.ok ? 200 : 503 },
  );
}
