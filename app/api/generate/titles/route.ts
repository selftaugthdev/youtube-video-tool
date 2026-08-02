import { generateTitles } from "@/lib/claude";
import { handleRoute } from "@/lib/apiHandler";
import type { KeywordEntry, PlatformKey, Project, TitleBankEntry } from "@/lib/types";

interface Body {
  project: Project;
  keywords: KeywordEntry[];
  titleBank: TitleBankEntry[];
  sourceText: string;
  platforms: PlatformKey[];
}

export const POST = handleRoute<Body>(
  async ({ project, keywords, titleBank, sourceText, platforms }) => {
    const titles = await generateTitles(project, keywords, titleBank, sourceText, platforms);
    return { titles };
  }
);
