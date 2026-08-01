import { generateIdeas } from "@/lib/claude";
import { handleRoute } from "@/lib/apiHandler";
import type { KeywordEntry, Project } from "@/lib/types";

interface Body {
  project: Project;
  keywords: KeywordEntry[];
  seedTopic?: string;
  count?: number;
}

export const POST = handleRoute<Body>(async ({ project, keywords, seedTopic, count }) => {
  const ideas = await generateIdeas(project, keywords, { seedTopic, count });
  return { ideas };
});
