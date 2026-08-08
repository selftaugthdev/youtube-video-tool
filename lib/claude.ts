import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { containsEmDash, stripEmDashes } from "./emDash";
import type { KeywordEntry, PlatformKey, Project, ShotPriority, ShotType, TitleBankEntry } from "./types";
import { PLATFORM_LABELS, SHOT_PRIORITIES, SHOT_TYPES, SUGGESTED_HOOK_TYPES } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local.");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

const UNIVERSAL_RULES = `
Universal rules for all output, no exceptions:
- Never use an em dash (—) anywhere in any generated text. Use a period, comma, or "and" instead.
- Write in plain, natural spoken language suitable for reading aloud on camera.
- Do not pad output with filler, disclaimers, or meta-commentary about the task.
`.trim();

export function buildSystemPrompt(project: Project, keywords: KeywordEntry[]): string {
  const pillarsLine = project.contentPillars.length
    ? `Established content pillars for this project: ${project.contentPillars.join(", ")}.`
    : "";
  const keywordsLine = keywords.length
    ? `Proven keyword bank for this project (reuse these where relevant instead of inventing new phrasing each time): ${keywords
        .map((k) => k.phrase)
        .join(", ")}.`
    : "";
  const platformsLine = `This project publishes on: ${project.platforms
    .map((p) => PLATFORM_LABELS[p])
    .join(", ")}.`;
  const ctaLine = project.callToAction
    ? `Call to action guidance for this project, use it when a script calls for a CTA: ${project.callToAction}`
    : "";

  return [
    `You are a content strategist and scriptwriter working on the project "${project.name}".`,
    `Tone and voice for this project (follow this exactly):`,
    project.tonePreset,
    platformsLine,
    pillarsLine,
    keywordsLine,
    ctaLine,
    UNIVERSAL_RULES,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function callTool<T>(
  system: string,
  user: string,
  tool: Tool,
  correction?: string
): Promise<T> {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: correction ? `${system}\n\n${correction}` : system,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: user }],
  });

  const block = message.content.find(
    (b): b is Extract<(typeof message.content)[number], { type: "tool_use" }> =>
      b.type === "tool_use"
  );
  if (!block) {
    throw new Error("Claude did not return a tool_use block for " + tool.name);
  }
  return block.input as T;
}

async function generateWithEmDashGuard<T>(
  system: string,
  user: string,
  tool: Tool
): Promise<T> {
  let result = await callTool<T>(system, user, tool);
  if (containsEmDash(result)) {
    result = await callTool<T>(
      system,
      user,
      tool,
      "Your previous output used an em dash character somewhere. Regenerate the entire output with no em dashes anywhere. Use a period, comma, or the word and instead."
    );
    if (containsEmDash(result)) {
      result = stripEmDashes(result);
    }
  }
  return result;
}

// ---------- Idea generation ----------

export interface GeneratedIdea {
  summary: string;
  pillar: string;
}

const ideaTool: Tool = {
  name: "return_video_ideas",
  description: "Return a list of video concept ideas, each tagged with a content pillar.",
  input_schema: {
    type: "object",
    properties: {
      ideas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "1-2 sentence video concept summary.",
            },
            pillar: {
              type: "string",
              description: "The content pillar this idea belongs to.",
            },
          },
          required: ["summary", "pillar"],
          additionalProperties: false,
        },
      },
    },
    required: ["ideas"],
    additionalProperties: false,
  },
  strict: true,
};

export async function generateIdeas(
  project: Project,
  keywords: KeywordEntry[],
  opts: { seedTopic?: string; count?: number } = {}
): Promise<GeneratedIdea[]> {
  const count = opts.count ?? 5;
  const system = buildSystemPrompt(project, keywords);
  const user = opts.seedTopic
    ? `Generate ${count} distinct video concept ideas building on this seed topic: "${opts.seedTopic}". Tag each with the most fitting content pillar.`
    : `Generate ${count} distinct video concept ideas for this project. Tag each with the most fitting content pillar.`;
  const result = await generateWithEmDashGuard<{ ideas: GeneratedIdea[] }>(
    system,
    user,
    ideaTool
  );
  return result.ideas;
}

// ---------- Hook generation ----------

export interface GeneratedHook {
  text: string;
  type: string;
}

const hookTool: Tool = {
  name: "return_hooks",
  description: "Return a list of video hooks, each tagged with its hook type.",
  input_schema: {
    type: "object",
    properties: {
      hooks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "The hook line itself." },
            type: {
              type: "string",
              description: `The hook type label. Suggested types: ${SUGGESTED_HOOK_TYPES.join(
                ", "
              )}. Use a different label if a hook doesn't fit any of these.`,
            },
          },
          required: ["text", "type"],
          additionalProperties: false,
        },
      },
    },
    required: ["hooks"],
    additionalProperties: false,
  },
  strict: true,
};

export async function generateHooks(
  project: Project,
  keywords: KeywordEntry[],
  ideaText: string,
  count = 5
): Promise<GeneratedHook[]> {
  const system = buildSystemPrompt(project, keywords);
  const user = `Write ${count} distinct hooks (the opening line(s) of the video) for this video idea:\n\n${ideaText}\n\nTag each hook with its hook type.`;
  const result = await generateWithEmDashGuard<{ hooks: GeneratedHook[] }>(
    system,
    user,
    hookTool
  );
  return result.hooks;
}

// ---------- Title generation ----------

function titleTool(platforms: PlatformKey[]): Tool {
  const properties: Record<string, unknown> = {};
  for (const p of platforms) {
    properties[p] = {
      type: "array",
      items: { type: "string" },
      description: `3 to 5 title variations for ${PLATFORM_LABELS[p]}.`,
    };
  }
  return {
    name: "return_titles",
    description: "Return 3 to 5 title variations for each requested platform.",
    input_schema: {
      type: "object",
      properties,
      required: platforms,
      additionalProperties: false,
    },
    strict: true,
  };
}

export async function generateTitles(
  project: Project,
  keywords: KeywordEntry[],
  titleBank: TitleBankEntry[],
  sourceText: string,
  platforms: PlatformKey[]
): Promise<Partial<Record<PlatformKey, string[]>>> {
  const baseSystem = buildSystemPrompt(project, keywords);
  const titleBankBlock = titleBank.length
    ? `\n\nTitles that have proven to convert well before for this project. Study their structure, length, pacing, and hook words, then apply those same underlying patterns to the new titles. Do not copy them verbatim or lightly reword one of them:\n${titleBank
        .map((t) => `- ${t.text}`)
        .join("\n")}`
    : "";
  const system = baseSystem + titleBankBlock;
  const user = `Generate 3 to 5 title variations for each of these platforms: ${platforms
    .map((p) => PLATFORM_LABELS[p])
    .join(
      ", "
    )}.\n\nBased on this idea or script:\n\n${sourceText}\n\nYouTube titles should be clickable and searchable. TikTok and Instagram titles should read like a scroll-stopping caption or on-screen hook, not a formal title. Each variation within a platform should try a genuinely different angle, not just reword the same one.`;
  return generateWithEmDashGuard<Partial<Record<PlatformKey, string[]>>>(
    system,
    user,
    titleTool(platforms)
  );
}

// ---------- Teleprompter script generation ----------

export interface GeneratedScriptSection {
  label: string;
  timestampSeconds: number;
  lines: string[];
}

export interface GeneratedScript {
  sections: GeneratedScriptSection[];
  notes: string;
}

const scriptTool: Tool = {
  name: "return_script",
  description:
    "Return a teleprompter-formatted script broken into labeled, timestamped sections, plus a separate notes section.",
  input_schema: {
    type: "object",
    properties: {
      sections: {
        type: "array",
        description:
          "The full script broken into sections such as hook, disclaimer, body, twist or validation, solution, relatability, and call to action. Not every script needs every label, choose whatever fits this specific video, but if the video explains a problem, trigger, or symptom, it must include a solution section with concrete next steps, not just explain the problem and move on. Together the sections must add up to the full requested runtime, not a truncated summary of it.",
        items: {
          type: "object",
          properties: {
            label: {
              type: "string",
              description:
                "Short section label, e.g. Hook, Body, Twist, Solution, Relatability, CTA, Disclaimer.",
            },
            timestampSeconds: {
              type: "integer",
              description:
                "Approximate elapsed seconds into the video when this section starts, based on natural spoken pace (roughly 140 words per minute).",
            },
            lines: {
              type: "array",
              items: { type: "string" },
              description:
                "Read-copy lines for this section only, short lines of roughly 8-10 words or fewer, in natural spoken order, one pause-worthy phrase per line. No stage directions in these lines.",
            },
          },
          required: ["label", "timestampSeconds", "lines"],
          additionalProperties: false,
        },
      },
      notes: {
        type: "string",
        description:
          "Stage directions, pacing guidance, b-roll suggestions, or delivery notes, kept entirely separate from the read-copy lines.",
      },
    },
    required: ["sections", "notes"],
    additionalProperties: false,
  },
  strict: true,
};

export async function generateScript(
  project: Project,
  keywords: KeywordEntry[],
  sourceText: string,
  targetLength: string
): Promise<GeneratedScript> {
  const system = buildSystemPrompt(project, keywords);
  const disclaimerInstruction = project.disclaimer
    ? ` Immediately after the hook, before the main body, include a disclaimer section. Use this wording almost verbatim, only adjusting it for natural flow: "${project.disclaimer}"`
    : "";
  const user = `Write a full teleprompter script based on this idea or hook:\n\n${sourceText}\n\nTarget spoken length: ${targetLength}. At a natural spoken pace of roughly 140 words per minute, write a full script that actually fills that runtime, don't undershoot it with a short summary version.\n\nStructure it into labeled, timestamped sections in this order: a hook first,${
    project.disclaimer ? " then a disclaimer," : ""
  } then the main body, a twist or validation beat, a solution section if this video explains a trigger, problem, or symptom (with a few concrete, actionable things the viewer can actually do, not just explaining the problem), a relatability moment, and a call to action.${disclaimerInstruction} Keep any stage directions or shot notes out of the lines and put them in the notes field instead.`;
  return generateWithEmDashGuard<GeneratedScript>(system, user, scriptTool);
}

// ---------- Platform repurposing (titles, descriptions, tags, treatment) ----------

export interface PlatformVariantResult {
  treatment: string;
  title: string;
  description: string;
  tags: string[];
}

function repurposeTool(platforms: PlatformKey[]): Tool {
  const variantSchema = {
    type: "object" as const,
    properties: {
      treatment: {
        type: "string",
        description:
          "1-3 sentences on how this specific platform's version should be executed differently from the others, not just reformatted copy.",
      },
      title: {
        type: "string",
        description:
          "Platform-appropriate title. For Instagram, use it as the on-screen hook text or cover caption, since Instagram posts don't have a separate title field.",
      },
      description: {
        type: "string",
        description:
          "YouTube: longer SEO-style description. TikTok: short caption. Instagram: caption with a strong opening line and a call-to-action.",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description:
          "YouTube: tags field entries. YouTube hard-caps this at 500 total characters across all tags combined (joined with commas), and anything over that gets truncated. Count carefully and stay under 500, typically that means around 20-30 tags depending on their length, not just 5-8. Mix broad head terms, specific long-tail phrases, common misspellings/variants, and the project's keyword bank and content pillars, don't pad with irrelevant filler just to fill space. TikTok: a smaller, curated set of hashtags (include the # symbol), more is not better here. Instagram: same, a curated set of hashtags (include the # symbol).",
      },
    },
    required: ["treatment", "title", "description", "tags"],
    additionalProperties: false,
  };

  const properties: Record<string, unknown> = {};
  for (const p of platforms) {
    properties[p] = variantSchema;
  }

  return {
    name: "return_platform_variants",
    description:
      "Return a distinct treatment, title, description, and tags for each requested platform.",
    input_schema: {
      type: "object",
      properties,
      required: platforms,
      additionalProperties: false,
    },
    strict: true,
  };
}

export async function generatePlatformVariants(
  project: Project,
  keywords: KeywordEntry[],
  sourceText: string,
  platforms: PlatformKey[]
): Promise<Partial<Record<PlatformKey, PlatformVariantResult>>> {
  const system = buildSystemPrompt(project, keywords);
  const user = `Create platform-specific variants of this video idea/script for: ${platforms
    .map((p) => PLATFORM_LABELS[p])
    .join(
      ", "
    )}.\n\nSource idea/script:\n\n${sourceText}\n\nEach platform's treatment must genuinely differ in execution (e.g. a YouTube long-form explainer vs. a TikTok hook-first cut vs. an Instagram Reel or carousel), not just be the same copy reformatted.${
    platforms.includes("youtube")
      ? " For YouTube tags specifically, get close to the 500 character limit (all tags joined by commas) without going over it, that's usually 20-30 tags mixing broad and long-tail keyword phrases, not a short list of 5-8."
      : ""
  }`;
  const result = await generateWithEmDashGuard<Partial<Record<PlatformKey, PlatformVariantResult>>>(
    system,
    user,
    repurposeTool(platforms)
  );
  if (result.youtube) {
    result.youtube = { ...result.youtube, tags: capYoutubeTags(result.youtube.tags) };
  }
  return result;
}

const YOUTUBE_TAGS_CHAR_LIMIT = 500;

/** Hard safety net: YouTube truncates the tags field past 500 chars, so never let the model's count drift over it. */
function capYoutubeTags(tags: string[]): string[] {
  const capped: string[] = [];
  let length = 0;
  for (const tag of tags) {
    const additional = capped.length === 0 ? tag.length : tag.length + 1;
    if (length + additional > YOUTUBE_TAGS_CHAR_LIMIT) break;
    capped.push(tag);
    length += additional;
  }
  return capped;
}

// ---------- Shotlist generation ----------

export interface GeneratedShot {
  order: number;
  type: ShotType;
  description: string;
  scriptRef: string;
  priority: ShotPriority;
}

const shotlistTool: Tool = {
  name: "return_shotlist",
  description: "Break a short-form video script into an ordered shotlist for a solo creator filming alone.",
  input_schema: {
    type: "object",
    properties: {
      shots: {
        type: "array",
        description:
          "Natural shot changes through the script (hook, problem, proof or tip, solution, CTA), plus supplementary B-roll or insert opportunities that support what's being said.",
        items: {
          type: "object",
          properties: {
            order: {
              type: "integer",
              description: "Order this shot appears in the video, starting at 1.",
            },
            type: {
              type: "string",
              enum: [...SHOT_TYPES],
              description: "Shot type.",
            },
            description: {
              type: "string",
              description:
                "What to point the camera at, plain language, specific enough to shoot from without further thought.",
            },
            scriptRef: {
              type: "string",
              description: "The line or beat from the script this shot covers.",
            },
            priority: {
              type: "string",
              enum: [...SHOT_PRIORITIES],
              description:
                "Must-have for anything covering spoken content (the talking-head read of the script itself). Nice-to-have for supplementary B-roll or inserts that help but aren't essential.",
            },
          },
          required: ["order", "type", "description", "scriptRef", "priority"],
          additionalProperties: false,
        },
      },
    },
    required: ["shots"],
    additionalProperties: false,
  },
  strict: true,
};

export async function generateShotlist(scriptText: string): Promise<GeneratedShot[]> {
  const system =
    "You are breaking a short-form video script into a shotlist for a solo creator filming alone, no crew.";
  const user = `Script:\n\n${scriptText}\n\nIdentify natural shot changes and suggest B-roll or insert opportunities that support what's being said. Default priority to Must-have for anything covering spoken content, Nice-to-have for supplementary B-roll.`;
  const result = await callTool<{ shots: GeneratedShot[] }>(system, user, shotlistTool);
  return result.shots;
}
