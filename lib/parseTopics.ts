const HORIZONTAL_RULE = /^([-*_])( *\1){2,}$/;

/** Turns a pasted or uploaded .md/.txt file of one topic per line into a clean list. */
export function parseTopicsFromText(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#") && !HORIZONTAL_RULE.test(line))
    .map((line) => line.replace(/^[-*+]\s+/, "").replace(/^\d+[.)]\s+/, "").trim())
    .filter((line) => line.length > 0);
}
