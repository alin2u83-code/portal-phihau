// api/_rateLimit.ts
// Rate limiting in-memory pentru API handlers Vercel.
// In-memory = se resetează la cold start (serverless). Acceptabil pentru acest use case.
// Pentru trafic mare: înlocuiește Map cu Upstash Redis.

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Curăță intrările expirate periodic
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
    windowMs?: number;
    maxRequests?: number;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

export function checkRateLimit(
    identifier: string,
    options: RateLimitOptions = {}
): RateLimitResult {
    const { windowMs = 60_000, maxRequests = 60 } = options;
    const now = Date.now();

    const entry = store.get(identifier);

    if (!entry || now > entry.resetAt) {
        store.set(identifier, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
    }

    entry.count++;
    const allowed = entry.count <= maxRequests;
    return { allowed, remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt };
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined> }): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (Array.isArray(forwarded)) return forwarded[0];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return 'unknown';
}
