const BINDING_KEYS = ['startBinding', 'endBinding'] as const;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Clears arrow bindings whose target is not part of the same library item.
 * Excalidraw restores items in isolation, so such bindings can never resolve.
 * Returns `true` if anything changed.
 */
const clearDanglingBindings = (elements: readonly unknown[]): boolean => {
  const elementIds = new Set<string>();
  for (const element of elements) {
    if (isRecord(element) && typeof element.id === 'string') {
      elementIds.add(element.id);
    }
  }

  let changed = false;
  for (const element of elements) {
    if (!isRecord(element)) {
      continue;
    }
    for (const key of BINDING_KEYS) {
      const binding = element[key];
      if (binding === undefined || binding === null) {
        continue;
      }
      const targetId = isRecord(binding) ? binding.elementId : undefined;
      if (typeof targetId === 'string' && elementIds.has(targetId)) {
        continue;
      }
      element[key] = null;
      changed = true;
    }
  }
  return changed;
};

/**
 * Collects the element arrays of a library file, or `null` when the payload is
 * not a library shape we know how to sanitize. Unknown items yield `null` so
 * they are left untouched.
 */
const getLibraryElementGroups = (data: unknown): (readonly unknown[] | null)[] | null => {
  if (!isRecord(data) || data.type !== 'excalidrawlib') {
    return null;
  }
  if (Array.isArray(data.libraryItems)) {
    return data.libraryItems.map((item) =>
      isRecord(item) && Array.isArray(item.elements) ? item.elements : null,
    );
  }
  if (Array.isArray(data.library)) {
    return data.library.map((item) => (Array.isArray(item) ? item : null));
  }
  return null;
};

/** Mutates parsed library data in place. Returns `true` if any binding was cleared. */
export const sanitizeLibraryData = (data: unknown): boolean => {
  const groups = getLibraryElementGroups(data);
  if (!groups) {
    return false;
  }

  let changed = false;
  for (const elements of groups) {
    if (elements && clearDanglingBindings(elements)) {
      changed = true;
    }
  }
  return changed;
};

/**
 * Sanitizes a fetched library Blob. Invalid JSON or unrecognized payloads are
 * returned unchanged so Excalidraw keeps its own validation behaviour.
 */
export const sanitizeLibraryBlob = async (blob: Blob): Promise<Blob> => {
  let data: unknown;
  try {
    data = JSON.parse(await blob.text());
  } catch {
    return blob;
  }

  if (!sanitizeLibraryData(data)) {
    return blob;
  }
  return new Blob([JSON.stringify(data)], { type: blob.type });
};
