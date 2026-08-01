const EM_DASH = "—";

export function containsEmDash(value: unknown): boolean {
  if (typeof value === "string") return value.includes(EM_DASH);
  if (Array.isArray(value)) return value.some(containsEmDash);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsEmDash);
  }
  return false;
}

function stripValue(value: unknown): unknown {
  if (typeof value === "string") return value.split(EM_DASH).join(",");
  if (Array.isArray(value)) return value.map(stripValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripValue(v)])
    );
  }
  return value;
}

/** Last-resort fallback if a retry still contains an em dash: replace rather than loop forever. */
export function stripEmDashes<T>(value: T): T {
  return stripValue(value) as T;
}
