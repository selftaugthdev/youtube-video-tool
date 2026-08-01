import { generatePlatformVariants } from "@/lib/claude";
import { handleRoute } from "@/lib/apiHandler";
import type { KeywordEntry, PlatformKey, Project } from "@/lib/types";

interface Body {
  project: Project;
  keywords: KeywordEntry[];
  sourceText: string;
  platforms: PlatformKey[];
}

export const POST = handleRoute<Body>(async ({ project, keywords, sourceText, platforms }) => {
  const variants = await generatePlatformVariants(project, keywords, sourceText, platforms);
  return { variants };
});
