import { createProject } from "./firestore";
import type { Project } from "./types";

type SeedProject = Omit<Project, "id" | "createdAt">;

export const STARTER_PROJECTS: SeedProject[] = [
  {
    name: "MigraineCast",
    platforms: ["youtube", "tiktok"],
    tonePreset:
      "Warm, validating, you're not imagining this energy. Speak directly to migraine sufferers like a knowledgeable friend, not a doctor. Avoid medical claims or medical advice. Favor emotional validation over pure education, that performs better with this audience.",
    contentPillars: ["weather trigger", "symptom validation", "myth-busting"],
    targetLength: "1 to 2 minutes",
    callToAction:
      "End with a short, low-pressure call to action to download the free MigraineCast app to track symptoms, triggers, and early warning signs. Mention that the link is in the description.",
    disclaimer:
      "Quick disclaimer before we start, I'm not a doctor. This is based on actual migraine studies, and this is not medical advice. If something feels off or new for you, please check with an actual doctor.",
  },
  {
    name: "Manifestation / Life Rebuild",
    platforms: ["tiktok", "instagram"],
    tonePreset:
      "Skeptical-but-open narrator, first person, documentary or journal style. Frame everything as testing this on camera and reporting back honestly, not selling belief. Personal narrative arc format.",
    contentPillars: ["testing a technique", "results check-in", "origin story"],
    targetLength: "1 to 2 minutes",
    callToAction: "",
    disclaimer: "",
  },
];

export async function seedStarterProjects(): Promise<void> {
  for (const project of STARTER_PROJECTS) {
    await createProject(project);
  }
}
