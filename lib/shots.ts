import type { Shot } from "./types";

export function hasUnresolvedMustHaves(shots: Shot[]): boolean {
  return shots.some((s) => s.priority === "Must-have" && s.status === "Needed");
}
