/**
 * Template interpolation for response formatting
 */

/**
 * Gets a nested value from an object using dot notation path.
 * Returns undefined if any part of the path doesn't exist.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Interpolates a template string by replacing {{field}} placeholders with values from data.
 *
 * - Supports dot notation for nested access (e.g., {{admin.telegram_username}})
 * - Returns empty string for null, undefined, or missing values
 * - Preserves literal text that is not a placeholder
 *
 * @param template - Template string with {{field}} placeholders
 * @param data - Object containing values to interpolate
 * @returns Interpolated string
 */
export function interpolate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, fieldPath: string) => {
    const trimmedPath = fieldPath.trim();
    const value = getNestedValue(data, trimmedPath);

    if (value === null || value === undefined) {
      return "";
    }

    return String(value);
  });
}
