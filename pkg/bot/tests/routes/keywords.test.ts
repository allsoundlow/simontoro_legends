import {after, before, describe, it} from "node:test";
import assert from "node:assert";
import {FastifyInstance} from "fastify";

import {build} from "../helper";

describe("Keyword API Routes", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await build();
  });

  after(async () => {
    await app.close();
  });

  describe("POST /api/v1/groups/:groupId/keywords", () => {
    it("should create a keyword with all fields and return 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/1/keywords",
        payload: {
          pattern: "test-keyword",
          pattern_type: "exact",
          case_sensitive: true,
          cooldown_seconds: 60,
        },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = response.json();
      assert.ok(body.data);
      assert.strictEqual(body.data.pattern, "test-keyword");
      assert.strictEqual(body.data.pattern_type, "exact");
      assert.strictEqual(body.data.case_sensitive, true);
      assert.strictEqual(body.data.cooldown_seconds, 60);
      assert.strictEqual(body.data.group_id, 1);
      assert.ok(body.data.id);
      assert.ok(body.data.created_at);
      assert.ok(body.data.updated_at);
    });

    it("should create a keyword with defaults and return 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/1/keywords",
        payload: {
          pattern: "default-keyword",
        },
      });

      assert.strictEqual(response.statusCode, 201);
      const body = response.json();
      assert.strictEqual(body.data.pattern, "default-keyword");
      assert.strictEqual(body.data.pattern_type, "exact");
      assert.strictEqual(body.data.case_sensitive, false);
      assert.strictEqual(body.data.cooldown_seconds, 0);
    });

    it("should return 409 for duplicate keyword", async () => {
      // Create first keyword
      await app.inject({
        method: "POST",
        url: "/api/v1/groups/2/keywords",
        payload: {pattern: "duplicate-test"},
      });

      // Try to create duplicate
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/2/keywords",
        payload: {pattern: "duplicate-test"},
      });

      assert.strictEqual(response.statusCode, 409);
      const body = response.json();
      assert.ok(body.error);
      assert.strictEqual(body.error.code, "CONFLICT");
      assert.ok(body.error.message);
      assert.ok(body.error.request_id);
    });

    it("should return 400 for invalid request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/1/keywords",
        payload: {
          pattern: "", // Empty pattern is invalid (min 1)
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = response.json();
      assert.ok(body.error);
      assert.strictEqual(body.error.code, "VALIDATION_ERROR");
      assert.ok(body.error.request_id);
    });
  });

  describe("GET /api/v1/groups/:groupId/keywords", () => {
    it("should list keywords for a group and return 200", async () => {
      // Create a keyword first
      await app.inject({
        method: "POST",
        url: "/api/v1/groups/3/keywords",
        payload: {pattern: "list-test-1"},
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/groups/3/keywords",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = response.json();
      assert.ok(Array.isArray(body.data));
      assert.ok(body.pagination);
      assert.ok(body.data.length >= 1);
    });

    it("should return empty array for group with no keywords", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/groups/999/keywords",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = response.json();
      assert.deepStrictEqual(body.data, []);
      assert.strictEqual(body.pagination.total, 0);
    });

    it("should support pagination parameters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/groups/1/keywords?limit=10&offset=0",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = response.json();
      assert.strictEqual(body.pagination.limit, 10);
      assert.strictEqual(body.pagination.offset, 0);
    });

    it("should filter by pattern_type", async () => {
      // Create keywords with different pattern types
      await app.inject({
        method: "POST",
        url: "/api/v1/groups/4/keywords",
        payload: {pattern: "filter-exact", pattern_type: "exact"},
      });
      await app.inject({
        method: "POST",
        url: "/api/v1/groups/4/keywords",
        payload: {pattern: "filter-phrase", pattern_type: "phrase"},
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/groups/4/keywords?pattern_type=exact",
      });

      assert.strictEqual(response.statusCode, 200);
      const body = response.json();
      assert.ok(body.data.every((k: {pattern_type: string}) => k.pattern_type === "exact"));
    });
  });

  describe("GET /api/v1/groups/:groupId/keywords/:keywordId", () => {
    it("should get a single keyword and return 200", async () => {
      // Create a keyword first
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/groups/5/keywords",
        payload: {pattern: "get-single-test"},
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/api/v1/groups/5/keywords/${created.data.id}`,
      });

      assert.strictEqual(response.statusCode, 200);
      const body = response.json();
      assert.strictEqual(body.data.id, created.data.id);
      assert.strictEqual(body.data.pattern, "get-single-test");
    });

    it("should return 404 for non-existent keyword", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/groups/1/keywords/99999",
      });

      assert.strictEqual(response.statusCode, 404);
      const body = response.json();
      assert.ok(body.error);
      assert.strictEqual(body.error.code, "NOT_FOUND");
      assert.ok(body.error.request_id);
    });

    it("should return 404 for keyword in different group (group isolation)", async () => {
      // Create keyword in group 6
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/groups/6/keywords",
        payload: {pattern: "isolation-test"},
      });
      const created = createResponse.json();

      // Try to access from group 7
      const response = await app.inject({
        method: "GET",
        url: `/api/v1/groups/7/keywords/${created.data.id}`,
      });

      assert.strictEqual(response.statusCode, 404);
    });
  });

  describe("PATCH /api/v1/groups/:groupId/keywords/:keywordId", () => {
    it("should update a keyword and return 200", async () => {
      // Create a keyword first
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/groups/8/keywords",
        payload: {pattern: "update-test"},
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/groups/8/keywords/${created.data.id}`,
        payload: {
          pattern: "updated-pattern",
          case_sensitive: true,
        },
      });

      assert.strictEqual(response.statusCode, 200);
      const body = response.json();
      assert.strictEqual(body.data.pattern, "updated-pattern");
      assert.strictEqual(body.data.case_sensitive, true);
    });

    it("should support partial updates (unchanged fields preserved)", async () => {
      // Create a keyword with specific values
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/groups/9/keywords",
        payload: {
          pattern: "partial-update",
          case_sensitive: true,
          cooldown_seconds: 120,
        },
      });
      const created = createResponse.json();

      // Update only pattern
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/groups/9/keywords/${created.data.id}`,
        payload: {pattern: "new-pattern"},
      });

      assert.strictEqual(response.statusCode, 200);
      const body = response.json();
      assert.strictEqual(body.data.pattern, "new-pattern");
      assert.strictEqual(body.data.case_sensitive, true); // Preserved
      assert.strictEqual(body.data.cooldown_seconds, 120); // Preserved
    });

    it("should return 404 for non-existent keyword", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/v1/groups/1/keywords/99999",
        payload: {pattern: "new-pattern"},
      });

      assert.strictEqual(response.statusCode, 404);
      const body = response.json();
      assert.strictEqual(body.error.code, "NOT_FOUND");
    });

    it("should return 409 for conflicting pattern update", async () => {
      // Create two keywords
      await app.inject({
        method: "POST",
        url: "/api/v1/groups/10/keywords",
        payload: {pattern: "existing-pattern"},
      });
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/groups/10/keywords",
        payload: {pattern: "to-be-updated"},
      });
      const created = createResponse.json();

      // Try to update to conflicting pattern
      const response = await app.inject({
        method: "PATCH",
        url: `/api/v1/groups/10/keywords/${created.data.id}`,
        payload: {pattern: "existing-pattern"},
      });

      assert.strictEqual(response.statusCode, 409);
      const body = response.json();
      assert.strictEqual(body.error.code, "CONFLICT");
    });
  });

  describe("DELETE /api/v1/groups/:groupId/keywords/:keywordId", () => {
    it("should delete a keyword and return 204", async () => {
      // Create a keyword first
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/v1/groups/11/keywords",
        payload: {pattern: "delete-test"},
      });
      const created = createResponse.json();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/v1/groups/11/keywords/${created.data.id}`,
      });

      assert.strictEqual(response.statusCode, 204);

      // Verify it's deleted
      const getResponse = await app.inject({
        method: "GET",
        url: `/api/v1/groups/11/keywords/${created.data.id}`,
      });
      assert.strictEqual(getResponse.statusCode, 404);
    });

    it("should return 404 for non-existent keyword", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/v1/groups/1/keywords/99999",
      });

      assert.strictEqual(response.statusCode, 404);
      const body = response.json();
      assert.strictEqual(body.error.code, "NOT_FOUND");
    });
  });

  describe("Error Response Format", () => {
    it("should include request_id in all error responses", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/groups/1/keywords/99999",
      });

      const body = response.json();
      assert.ok(body.error.request_id, "Error response should include request_id");
    });

    it("should return proper error structure for validation errors", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/1/keywords",
        payload: {
          pattern: "x".repeat(101), // Exceeds max length
        },
      });

      assert.strictEqual(response.statusCode, 400);
      const body = response.json();
      assert.ok(body.error);
      assert.strictEqual(body.error.code, "VALIDATION_ERROR");
      assert.ok(body.error.message);
      assert.ok(body.error.request_id);
    });
  });

  describe("All Pattern Types Supported", () => {
    it("should support exact pattern type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/12/keywords",
        payload: {pattern: "exact-type", pattern_type: "exact"},
      });
      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual(response.json().data.pattern_type, "exact");
    });

    it("should support phrase pattern type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/12/keywords",
        payload: {pattern: "phrase-type", pattern_type: "phrase"},
      });
      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual(response.json().data.pattern_type, "phrase");
    });

    it("should support wildcard pattern type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/groups/12/keywords",
        payload: {pattern: "wildcard-type", pattern_type: "wildcard"},
      });
      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual(response.json().data.pattern_type, "wildcard");
    });
  });
});
