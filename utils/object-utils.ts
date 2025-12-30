/**
 * Remove empty fields from an object
 * Removes: null, undefined, empty strings, and optionally NaN
 */
export function removeEmptyFields<T extends Record<string, unknown>>(
  obj: T,
  options?: {
    removeEmptyStrings?: boolean;
    removeZero?: boolean;
    removeFalse?: boolean;
    removeNull?: boolean;
  }
): Partial<T> {
  const {
    removeEmptyStrings = true,
    removeZero = false,
    removeFalse = false,
    removeNull = true,
  } = options || {};

  return Object.entries(obj).reduce((acc, [key, value]) => {
    // Always remove null and undefined
    if (value === null || value === undefined) {
      return acc;
    }

    // Remove empty strings if enabled
    if (removeEmptyStrings && value === "") {
      return acc;
    }

    // Remove zero if enabled
    if (removeZero && value === 0) {
      return acc;
    }

    // Remove false if enabled
    if (removeFalse && value === false) {
      return acc;
    }

    // Remove NaN
    if (typeof value === "number" && isNaN(value)) {
      return acc;
    }

    // Remove Null if enabled
    if (removeNull && value === null) {
      return acc;
    }

    // Keep the field
    acc[key as keyof T] = value as T[keyof T];
    return acc;
  }, {} as Partial<T>);
}

/**
 * Deep version that handles nested objects
 */
export function removeEmptyFieldsDeep<T extends Record<string, unknown>>(
  obj: T,
  options?: {
    removeEmptyStrings?: boolean;
    removeZero?: boolean;
    removeFalse?: boolean;
  }
): Partial<T> {
  const {
    removeEmptyStrings = true,
    removeZero = false,
    removeFalse = false,
  } = options || {};

  return Object.entries(obj).reduce((acc, [key, value]) => {
    // Always remove null and undefined
    if (value === null || value === undefined) {
      return acc;
    }

    // Remove empty strings if enabled
    if (removeEmptyStrings && value === "") {
      return acc;
    }

    // Remove zero if enabled
    if (removeZero && value === 0) {
      return acc;
    }

    // Remove false if enabled
    if (removeFalse && value === false) {
      return acc;
    }

    // Remove NaN
    if (typeof value === "number" && isNaN(value)) {
      return acc;
    }

    // Recursively clean nested objects
    if (typeof value === "object" && !Array.isArray(value)) {
      const cleaned = removeEmptyFieldsDeep(
        value as Record<string, unknown>,
        options
      );
      // Only include if the cleaned object has properties
      if (Object.keys(cleaned).length > 0) {
        acc[key as keyof T] = cleaned as T[keyof T];
      }
      return acc;
    }

    // Keep the field
    acc[key as keyof T] = value as T[keyof T];
    return acc;
  }, {} as Partial<T>);
}
