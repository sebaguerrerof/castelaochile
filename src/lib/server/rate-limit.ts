import { createHash } from "node:crypto";

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type RateLimiter = {
  check: (key: string) => Promise<RateLimitDecision>;
};

export type RateLimitOptions = {
  maxRequests: number;
  windowSeconds: number;
};

export function hashRateLimitKey(value: string) {
  return createHash("sha256").update(`castelao-contact:${value}`).digest("hex");
}

/** Development-only limiter for local previews. Production uses Upstash below. */
export class DevelopmentRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();
  private readonly options: RateLimitOptions;
  private readonly now: () => number;

  constructor(options: RateLimitOptions, now: () => number = Date.now) {
    this.options = options;
    this.now = now;
  }

  async check(key: string): Promise<RateLimitDecision> {
    const now = this.now();
    const hashedKey = hashRateLimitKey(key);
    const entry = this.entries.get(hashedKey);

    if (!entry || entry.expiresAt <= now) {
      this.entries.set(hashedKey, {
        count: 1,
        expiresAt: now + this.options.windowSeconds * 1000,
      });
      return { allowed: true };
    }

    if (entry.count >= this.options.maxRequests) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)),
      };
    }

    entry.count += 1;
    return { allowed: true };
  }
}

type UpstashResponse = Array<{ result?: number | string; error?: string }>;

/**
 * A shared Redis limiter for production/serverless instances. It is only used
 * after the environment gate verifies both Upstash credentials.
 */
export class UpstashRateLimiter implements RateLimiter {
  private readonly url: string;
  private readonly token: string;
  private readonly options: RateLimitOptions;
  private readonly fetcher: typeof fetch;

  constructor(
    url: string,
    token: string,
    options: RateLimitOptions,
    fetcher: typeof fetch = fetch,
  ) {
    this.url = url;
    this.token = token;
    this.options = options;
    this.fetcher = fetcher;
  }

  async check(key: string): Promise<RateLimitDecision> {
    const response = await this.fetcher(`${this.url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", hashRateLimitKey(key)],
        ["EXPIRE", hashRateLimitKey(key), this.options.windowSeconds, "NX"],
      ]),
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Rate limit provider rejected the request.");
    const payload = (await response.json()) as UpstashResponse;
    if (!Array.isArray(payload) || payload.some((item) => item.error)) {
      throw new Error("Rate limit provider returned an error.");
    }
    const count = Number(payload[0]?.result);
    if (!Number.isFinite(count)) throw new Error("Rate limit provider returned an invalid response.");

    return count <= this.options.maxRequests
      ? { allowed: true }
      : { allowed: false, retryAfterSeconds: this.options.windowSeconds };
  }
}
