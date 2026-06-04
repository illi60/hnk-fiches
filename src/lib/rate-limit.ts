// ============================================================
// Rate limiting in-memory (Map). Suffisant tant qu'on tourne
// sur un seul process (Vercel free = lambda froide à chaque
// invocation, donc surtout efficace pour ralentir un attaquant
// rapide sur la même lambda chaude). Swap Upstash Redis si on
// passe multi-instance / multi-région.
// ============================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// GC simple : à chaque appel, on nettoie quelques entrées expirées.
function gc(now: number) {
  let scanned = 0;
  for (const [k, b] of buckets) {
    if (++scanned > 50) break;
    if (b.resetAt < now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * @param key      identifiant unique (ex: `login:1.2.3.4` ou `xp:<userId>`)
 * @param max      nombre d'appels autorisés dans la fenêtre
 * @param windowMs taille de la fenêtre en ms
 */
export function rateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  gc(now);
  const cur = buckets.get(key);
  if (!cur || cur.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetIn: windowMs };
  }
  cur.count++;
  const remaining = max - cur.count;
  return { ok: remaining >= 0, remaining: Math.max(0, remaining), resetIn: cur.resetAt - now };
}

// Construit une clé stable à partir de la requête (IP best-effort).
export function clientKey(req: Request, scope: string): string {
  const fwd =
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const ip = fwd.split(",")[0]?.trim() || "unknown";
  return `${scope}:${ip}`;
}
