import assert from "node:assert";
import {describe, it} from "node:test";

import {interpolate} from "../../adapters/telegram/template";

describe("Template Interpolation", () => {
  describe("interpolate", () => {
    it("should replace simple field placeholders", () => {
      const result = interpolate("Hello, {{name}}!", {name: "Alice"});
      assert.strictEqual(result, "Hello, Alice!");
    });

    it("should replace nested field placeholders with dot notation", () => {
      const result = interpolate("Welcome, {{admin.telegram_username}}!", {
        admin: {telegram_username: "bob"},
      });
      assert.strictEqual(result, "Welcome, bob!");
    });

    it("should return empty string for null values", () => {
      const result = interpolate("Status: {{status}}", {status: null});
      assert.strictEqual(result, "Status: ");
    });

    it("should return empty string for undefined values", () => {
      const result = interpolate("Status: {{status}}", {status: undefined});
      assert.strictEqual(result, "Status: ");
    });

    it("should return empty string for missing fields", () => {
      const result = interpolate("Status: {{missing}}", {other: "value"});
      assert.strictEqual(result, "Status: ");
    });

    it("should preserve non-placeholder text", () => {
      const result = interpolate("No placeholders here", {name: "Alice"});
      assert.strictEqual(result, "No placeholders here");
    });

    it("should handle multiple placeholders", () => {
      const result = interpolate("{{greeting}}, {{name}}!", {greeting: "Hello", name: "World"});
      assert.strictEqual(result, "Hello, World!");
    });

    it("should handle deeply nested paths", () => {
      const result = interpolate("Value: {{a.b.c}}", {a: {b: {c: "deep"}}});
      assert.strictEqual(result, "Value: deep");
    });

    it("should return empty string for partial nested path", () => {
      const result = interpolate("Value: {{a.b.c}}", {a: {b: null}});
      assert.strictEqual(result, "Value: ");
    });

    it("should convert numbers to strings", () => {
      const result = interpolate("Count: {{count}}", {count: 42});
      assert.strictEqual(result, "Count: 42");
    });

    it("should handle whitespace in placeholder names", () => {
      const result = interpolate("Hello, {{ name }}!", {name: "Alice"});
      assert.strictEqual(result, "Hello, Alice!");
    });
  });
});
