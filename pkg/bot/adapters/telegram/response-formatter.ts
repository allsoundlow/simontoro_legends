import {interpolate} from "./template";
import type {
  ErrorResponseConfig,
  ListResponse,
  ResponseConfig,
  TextResponse,
  TextWithKeyboardResponse,
} from "./types";

/**
 * Formats a text response using template interpolation
 *
 * @param config - Text response configuration with template
 * @param result - Use case result to interpolate into template
 * @returns Formatted message string
 */
export function formatTextResponse<T extends Record<string, unknown>>(
  config: TextResponse<T>,
  result: T,
): string {
  return interpolate(config.template, result);
}

/**
 * Formats a list response by iterating over items and applying templates
 *
 * @param config - List response configuration
 * @param result - Use case result containing the items array
 * @returns Formatted message string with list items, or emptyMessage if no items
 */
export function formatListResponse<T extends Record<string, unknown>>(
  config: ListResponse<T>,
  result: T,
): string {
  const items = result[config.itemsField as string];

  if (!Array.isArray(items) || items.length === 0) {
    return config.emptyMessage;
  }

  const header = interpolate(config.template, result);
  const formattedItems = items
    .map((item, index) => {
      const itemData = typeof item === "object" && item !== null ? item : {value: item};
      return interpolate(config.itemTemplate, {...itemData, index: index + 1});
    })
    .join("\n");

  return `${header}\n${formattedItems}`;
}

/**
 * Formats a text with keyboard response using template interpolation
 *
 * Note: This returns only the text portion. The keyboard is handled separately
 * by the router when sending the message.
 *
 * @param config - Text with keyboard response configuration
 * @param result - Use case result to interpolate into template
 * @returns Formatted message string
 */
export function formatTextWithKeyboardResponse<T extends Record<string, unknown>>(
  config: TextWithKeyboardResponse<T>,
  result: T,
): string {
  return interpolate(config.template, result);
}

/**
 * Formats an error response by matching error type to configured mappings
 *
 * @param config - Error response configuration with mappings and default template
 * @param error - The error that was thrown
 * @returns Formatted error message string
 */
export function formatErrorResponse(config: ErrorResponseConfig, error: Error): string {
  // Find matching error mapping by error constructor name
  const errorType = error.constructor.name;
  const mapping = config.mappings.find((m) => m.errorType === errorType);

  // Use matched template or fall back to default
  const template = mapping ? mapping.template : config.defaultTemplate;

  // Interpolate with error properties (message available via {{message}})
  return interpolate(template, {message: error.message});
}

/**
 * Formats a response based on its type
 *
 * @param config - Response configuration (text, text_with_keyboard, list, or silent)
 * @param result - Use case result to format
 * @returns Formatted message string, or null for silent responses
 */
export function formatResponse<T extends Record<string, unknown>>(
  config: ResponseConfig<T>,
  result: T,
): string | null {
  switch (config.type) {
    case "text":
      return formatTextResponse(config, result);
    case "text_with_keyboard":
      return formatTextWithKeyboardResponse(config, result);
    case "list":
      return formatListResponse(config as ListResponse<T>, result);
    case "silent":
      return null;
  }
}
