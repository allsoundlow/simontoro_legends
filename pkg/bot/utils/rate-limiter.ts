import {RateLimitError} from "../errors";

type RateLimitEntry = {count: number; resetAt: number};

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  async checkLimit(key: string, maxRequests: number, windowSeconds: number): Promise<void> {
    const now = Date.now();
    const entry = this.limits.get(key);

    // Clean up expired entry
    if (entry && entry.resetAt < now) {
      this.limits.delete(key);
    }

    const current = this.limits.get(key);

    if (!current) {
      // First request in window
      this.limits.set(key, {count: 1, resetAt: now + windowSeconds * 1000});
      return;
    }

    if (current.count >= maxRequests) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      throw new RateLimitError("Rate limit exceeded", retryAfter);
    }

    // Increment count
    current.count++;
  }

  // Cleanup method to prevent memory leaks
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetAt < now) {
        this.limits.delete(key);
      }
    }
  }
}
