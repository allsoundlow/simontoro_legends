import assert from "node:assert";
import {describe, it} from "node:test";

import {
  formatErrorResponse,
  formatListResponse,
  formatResponse,
  formatTextResponse,
  formatTextWithKeyboardResponse,
} from "../../adapters/telegram/response-formatter";
import type {
  ErrorResponseConfig,
  ListResponse,
  ResponseConfig,
  TextResponse,
  TextWithKeyboardResponse,
} from "../../adapters/telegram/types";

describe("Response Formatter", () => {
  describe("formatTextResponse", () => {
    it("should interpolate template with result data", () => {
      const config: TextResponse<{name: string}> = {
        type: "text",
        template: "Hello, {{name}}!",
      };
      const result = formatTextResponse(config, {name: "Alice"});
      assert.strictEqual(result, "Hello, Alice!");
    });

    it("should handle nested fields", () => {
      const config: TextResponse<{admin: {username: string}}> = {
        type: "text",
        template: "Welcome, {{admin.username}}!",
      };
      const result = formatTextResponse(config, {admin: {username: "bob"}});
      assert.strictEqual(result, "Welcome, bob!");
    });
  });

  describe("formatListResponse", () => {
    it("should format list with header and items", () => {
      type Data = {title: string; items: Array<{name: string}>};
      const config: ListResponse<Data> = {
        type: "list",
        template: "{{title}}:",
        itemTemplate: "- {{name}}",
        itemsField: "items",
        emptyMessage: "No items",
      };
      const result = formatListResponse(config, {
        title: "Users",
        items: [{name: "Alice"}, {name: "Bob"}],
      });
      assert.strictEqual(result, "Users:\n- Alice\n- Bob");
    });

    it("should return emptyMessage when items array is empty", () => {
      type Data = {items: Array<{name: string}>};
      const config: ListResponse<Data> = {
        type: "list",
        template: "Items:",
        itemTemplate: "- {{name}}",
        itemsField: "items",
        emptyMessage: "No items found",
      };
      const result = formatListResponse(config, {items: []});
      assert.strictEqual(result, "No items found");
    });

    it("should include index in item template", () => {
      type Data = {items: Array<{name: string}>};
      const config: ListResponse<Data> = {
        type: "list",
        template: "List:",
        itemTemplate: "{{index}}. {{name}}",
        itemsField: "items",
        emptyMessage: "Empty",
      };
      const result = formatListResponse(config, {
        items: [{name: "First"}, {name: "Second"}],
      });
      assert.strictEqual(result, "List:\n1. First\n2. Second");
    });
  });

  describe("formatTextWithKeyboardResponse", () => {
    it("should interpolate template (keyboard handled separately)", () => {
      const config: TextWithKeyboardResponse<{action: string}> = {
        type: "text_with_keyboard",
        template: "Choose {{action}}:",
        keyboard: {buttons: [[{text: "Yes", callbackData: "yes"}]]},
      };
      const result = formatTextWithKeyboardResponse(config, {action: "option"});
      assert.strictEqual(result, "Choose option:");
    });
  });

  describe("formatErrorResponse", () => {
    const errorConfig: ErrorResponseConfig = {
      mappings: [
        {errorType: "NotFoundError", template: "Resource not found"},
        {errorType: "ConflictError", template: "Conflict: {{message}}"},
      ],
      defaultTemplate: "Error: {{message}}",
    };

    it("should use mapped template for matching error type", () => {
      class NotFoundError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "NotFoundError";
        }
      }
      const error = new NotFoundError("User not found");
      const result = formatErrorResponse(errorConfig, error);
      assert.strictEqual(result, "Resource not found");
    });

    it("should interpolate message in mapped template", () => {
      class ConflictError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "ConflictError";
        }
      }
      const error = new ConflictError("Already exists");
      const result = formatErrorResponse(errorConfig, error);
      assert.strictEqual(result, "Conflict: Already exists");
    });

    it("should use default template for unmatched error type", () => {
      class ValidationError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "ValidationError";
        }
      }
      const error = new ValidationError("Invalid input");
      const result = formatErrorResponse(errorConfig, error);
      assert.strictEqual(result, "Error: Invalid input");
    });
  });

  describe("formatResponse", () => {
    it("should format text response", () => {
      const config: ResponseConfig<{name: string}> = {
        type: "text",
        template: "Hi {{name}}",
      };
      const result = formatResponse(config, {name: "Test"});
      assert.strictEqual(result, "Hi Test");
    });

    it("should return null for silent response", () => {
      const config: ResponseConfig<Record<string, unknown>> = {type: "silent"};
      const result = formatResponse(config, {});
      assert.strictEqual(result, null);
    });
  });
});
