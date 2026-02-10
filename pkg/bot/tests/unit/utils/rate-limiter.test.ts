import assert from "node:assert";
import {beforeEach,describe, it} from "node:test";

import {RateLimitError} from "../../../errors";
import {RateLimiter} from "../../../utils/rate-limiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  describe("checkLimit", () => {
    it("should allow first request in window", async () => {
      await assert.doesNotReject(async () => {
        await limiter.checkLimit("test:user:1", 5, 60);
      });
    });

    it("should allow requests within limit", async () => {
      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit("test:user:2", 5, 60);
      }
      // All should succeed without throwing
    });

    it("should throw RateLimitError when limit exceeded", async () => {
      // Use up all 3 requests
      for (let i = 0; i < 3; i++) {
        await limiter.checkLimit("test:user:3", 3, 60);
      }

      // 4th request should throw
      await assert.rejects(
        async () => limiter.checkLimit("test:user:3", 3, 60),
        (err: Error) => {
          assert.ok(err instanceof RateLimitError);
          assert.strictEqual(err.name, "RateLimitError");
          assert.strictEqual(err.statusCode, 429);
          return true;
        },
      );
    });

    it("should include correct retryAfter in RateLimitError", async () => {
      // Use up all requests with a 10 second window
      for (let i = 0; i < 2; i++) {
        await limiter.checkLimit("test:user:4", 2, 10);
      }

      try {
        await limiter.checkLimit("test:user:4", 2, 10);
        assert.fail("Should have thrown RateLimitError");
      } catch (err) {
        assert.ok(err instanceof RateLimitError);
        // retryAfter should be between 1 and 10 seconds
        assert.ok(err.retryAfter > 0);
        assert.ok(err.retryAfter <= 10);
      }
    });

    it("should track different keys independently", async () => {
      // Use up limit for user:1
      for (let i = 0; i < 2; i++) {
        await limiter.checkLimit("test:user:5", 2, 60);
      }

      // user:1 should be rate limited
      await assert.rejects(
        async () => limiter.checkLimit("test:user:5", 2, 60),
        RateLimitError,
      );

      // But user:6 should still work
      await assert.doesNotReject(async () => {
        await limiter.checkLimit("test:user:6", 2, 60);
      });
    });

    it("should reset window after expiry", async () => {
      // Use up all requests with a very short window (1 second)
      for (let i = 0; i < 2; i++) {
        await limiter.checkLimit("test:reset", 2, 1);
      }

      // Should be rate limited
      await assert.rejects(
        async () => limiter.checkLimit("test:reset", 2, 1),
        RateLimitError,
      );

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should succeed now (window reset)
      await assert.doesNotReject(async () => {
        await limiter.checkLimit("test:reset", 2, 60);
      });
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries", async () => {
      // Create an entry with a short window
      await limiter.checkLimit("test:cleanup", 5, 1);

      // Wait for expiry
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Run cleanup
      limiter.cleanup();

      // Entry should be gone, so we can make a fresh request
      // and it should be counted as the first request (count: 1)
      await limiter.checkLimit("test:cleanup", 5, 60);
      await limiter.checkLimit("test:cleanup", 5, 60);
      await limiter.checkLimit("test:cleanup", 5, 60);
      await limiter.checkLimit("test:cleanup", 5, 60);
      await limiter.checkLimit("test:cleanup", 5, 60);

      // 6th request should fail (proves cleanup worked and counter reset)
      await assert.rejects(
        async () => limiter.checkLimit("test:cleanup", 5, 60),
        RateLimitError,
      );
    });

    it("should not remove non-expired entries", async () => {
      // Create an entry with a long window
      await limiter.checkLimit("test:keep", 2, 3600);

      // Run cleanup immediately
      limiter.cleanup();

      // Entry should still exist, so second request should work
      await limiter.checkLimit("test:keep", 2, 3600);

      // Third request should fail (entry was kept)
      await assert.rejects(
        async () => limiter.checkLimit("test:keep", 2, 3600),
        RateLimitError,
      );
    });
  });
});
