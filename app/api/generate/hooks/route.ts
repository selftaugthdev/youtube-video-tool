import { generateHooks } from "@/lib/claude";
import { handleRoute } from "@/lib/apiHandler";
import type { KeywordEntry, Project } from "@/lib/types";

interface Body {
  project: Project;
  keywords: KeywordEntry[];
  ideaText: string;
  count?: number;
}

export const POST = handleRoute<Body>(async ({ project, keywords, ideaText, count }) => {
  const hooks = await generateHooks(project, keywords, ideaText, count);
  return { hooks };
});
