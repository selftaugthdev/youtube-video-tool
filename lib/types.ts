export type PlatformKey = "youtube" | "tiktok" | "instagram";

export const ALL_PLATFORMS: PlatformKey[] = ["youtube", "tiktok", "instagram"];

export const PLATFORM_LABELS: Record<PlatformKey, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export const STAGES = [
  "idea",
  "scripted",
  "shoot_scheduled",
  "shot",
  "edited",
  "scheduled",
  "posted",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  idea: "Idea",
  scripted: "Scripted",
  shoot_scheduled: "Shoot scheduled",
  shot: "Shot",
  edited: "Edited",
  scheduled: "Scheduled",
  posted: "Posted",
};

export const SUGGESTED_HOOK_TYPES = [
  "comment-bait",
  "statement hook",
  "emotional-validation",
  "curiosity-gap",
  "contrarian",
];

export interface Project {
  id: string;
  name: string;
  platforms: PlatformKey[];
  tonePreset: string;
  contentPillars: string[];
  targetLength: string;
  callToAction: string;
  disclaimer: string;
  createdAt: number;
}

export interface KeywordEntry {
  id: string;
  phrase: string;
  notes?: string;
  createdAt: number;
}

export interface Topic {
  id: string;
  text: string;
  used: boolean;
  usedAt?: number;
  createdAt: number;
}

export interface TitleBankEntry {
  id: string;
  text: string;
  notes?: string;
  createdAt: number;
}

export interface Hook {
  text: string;
  type: string;
}

export interface PlatformVariant {
  treatment: string;
  title: string;
  description: string;
  tags: string[];
}

export interface ContentStats {
  youtube?: {
    views?: number;
    watchTimeMin?: number;
    subsGained?: number;
  };
  tiktok?: {
    views?: number;
    profileViews?: number;
  };
}

export interface ScriptSection {
  label: string;
  timestampSeconds: number;
  lines: string[];
}

export interface ContentItem {
  id: string;
  projectId: string;
  pillar: string;
  ideaSummary: string;
  hooks: Hook[];
  selectedHookIndex?: number;
  script: {
    sections: ScriptSection[];
    notes: string;
  } | null;
  platformVariants: Partial<Record<PlatformKey, PlatformVariant>>;
  platforms: PlatformKey[];
  stage: Stage;
  shootDate?: string;
  scheduledAt?: string;
  postedAt?: string;
  stats: ContentStats;
  createdAt: number;
  updatedAt: number;
}
