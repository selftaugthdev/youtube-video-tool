"use client";

import Link from "next/link";
import { useState } from "react";
import { useProjectContext } from "@/lib/projectContext";
import { createContentItem } from "@/lib/firestore";
import NoProjectNotice from "@/components/NoProjectNotice";
import type { GeneratedIdea } from "@/lib/claude";

export default function IdeaGeneratorPage() {
  const { selectedProject, keywords } = useProjectContext();
  const [seedTopic, setSeedTopic] = useState("");
  const [count, setCount] = useState(5);
  const [ideas, setIdeas] = useState<GeneratedIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());

  if (!selectedProject) return <NoProjectNotice />;

  async function generate() {
    setLoading(true);
    setError(null);
    setAddedIndexes(new Set());
    try {
      const res = await fetch("/api/generate/idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: selectedProject, keywords, seedTopic, count }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      setIdeas(data.ideas);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function addToCalendar(idea: GeneratedIdea, index: number) {
    if (!selectedProject) return;
    await createContentItem(selectedProject.id, {
      pillar: idea.pillar,
      ideaSummary: idea.summary,
      platforms: selectedProject.platforms,
      stage: "idea",
    });
    setAddedIndexes((prev) => new Set(prev).add(index));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Video ideas — {selectedProject.name}</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm text-black/60 dark:text-white/60">Seed topic (optional)</label>
          <input
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
            placeholder="Leave blank for fully open ideas"
            value={seedTopic}
            onChange={(e) => setSeedTopic(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/60 dark:text-white/60">Count</label>
          <input
            type="number"
            min={1}
            max={10}
            className="w-20 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate ideas"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3">
        {ideas?.map((idea, i) => (
          <div key={i} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <div className="mb-2 inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
              {idea.pillar}
            </div>
            <p className="mb-3">{idea.summary}</p>
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => addToCalendar(idea, i)}
                disabled={addedIndexes.has(i)}
                className="rounded border border-black/15 px-2 py-1 disabled:opacity-50 dark:border-white/20"
              >
                {addedIndexes.has(i) ? "Added to calendar" : "Add to calendar"}
              </button>
              <Link
                href={`/generate/hooks?text=${encodeURIComponent(idea.summary)}`}
                className="rounded border border-black/15 px-2 py-1 dark:border-white/20"
              >
                Generate hooks for this
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
