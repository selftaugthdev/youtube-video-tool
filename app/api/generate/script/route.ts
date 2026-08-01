import { generateScript } from "@/lib/claude";
import { handleRoute } from "@/lib/apiHandler";
import type { KeywordEntry, Project } from "@/lib/types";

interface Body {
  project: Project;
  keywords: KeywordEntry[];
  sourceText: string;
  targetLength: string;
}

export const POST = handleRoute<Body>(async ({ project, keywords, sourceText, targetLength }) => {
  const script = await generateScript(project, keywords, sourceText, targetLength);
  return { script };
});
