import { generateHooks, generateIdeas, type GeneratedHook, type GeneratedIdea } from "@/lib/claude";
import { handleRoute } from "@/lib/apiHandler";
import type { KeywordEntry, Project } from "@/lib/types";

interface Body {
  project: Project;
  keywords: KeywordEntry[];
  seedTopic?: string;
  count: number;
}

export interface BatchItem {
  idea: GeneratedIdea;
  hooks: GeneratedHook[];
}

export const POST = handleRoute<Body>(async ({ project, keywords, seedTopic, count }) => {
  const ideas = await generateIdeas(project, keywords, { seedTopic, count });
  const items: BatchItem[] = await Promise.all(
    ideas.map(async (idea) => ({
      idea,
      hooks: await generateHooks(project, keywords, idea.summary, 3),
    }))
  );
  return { items };
});
