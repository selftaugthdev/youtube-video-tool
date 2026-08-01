"use client";

import { useState } from "react";
import { useProjectContext } from "@/lib/projectContext";
import { createContentItem } from "@/lib/firestore";
import NoProjectNotice from "@/components/NoProjectNotice";
import type { GeneratedHook, GeneratedIdea } from "@/lib/claude";

interface BatchItem {
  idea: GeneratedIdea;
  hooks: GeneratedHook[];
}

export default function BatchModePage() {
  const { selectedProject, keywords } = useProjectContext();
  const [seedTopic, setSeedTopic] = useState("");
  const [count, setCount] = useState(10);
  const [items, setItems] = useState<BatchItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedAll, setAddedAll] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());

  if (!selectedProject) return <NoProjectNotice />;

  async function generate() {
    setLoading(true);
    setError(null);
    setItems(null);
    setAddedAll(false);
    setAddedIndexes(new Set());
    try {
      const res = await fetch("/api/generate/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: selectedProject, keywords, seedTopic, count }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function addItem(item: BatchItem, index: number) {
    if (!selectedProject) return;
    await createContentItem(selectedProject.id, {
      pillar: item.idea.pillar,
      ideaSummary: item.idea.summary,
      hooks: item.hooks,
      selectedHookIndex: 0,
      platforms: selectedProject.platforms,
      stage: "idea",
    });
    setAddedIndexes((prev) => new Set(prev).add(index));
  }

  async function addAll() {
    if (!items) return;
    setAddingAll(true);
    try {
      for (let i = 0; i < items.length; i++) {
        if (!addedIndexes.has(i)) await addItem(items[i], i);
      }
      setAddedAll(true);
    } finally {
      setAddingAll(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Batch mode — {selectedProject.name}</h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        Generate a whole batch of ideas and hooks at once for a shoot day, then add them all to
        the calendar in one click.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm text-black/60 dark:text-white/60">Seed topic (optional)</label>
          <input
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
            value={seedTopic}
            onChange={(e) => setSeedTopic(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/60 dark:text-white/60">How many</label>
          <input
            type="number"
            min={2}
            max={20}
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
          {loading ? "Generating..." : `Generate ${count} ideas + hooks`}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {items && (
        <div className="flex flex-col gap-4">
          <button
            onClick={addAll}
            disabled={addingAll || addedAll}
            className="self-start rounded border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
          >
            {addedAll ? "All added to calendar" : addingAll ? "Adding..." : "Add all to calendar"}
          </button>

          <div className="flex flex-col gap-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                <div className="mb-2 inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                  {item.idea.pillar}
                </div>
                <p className="mb-3">{item.idea.summary}</p>
                <div className="mb-3 flex flex-col gap-1">
                  {item.hooks.map((hook, hi) => (
                    <div key={hi} className="text-sm">
                      <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                        {hook.type}
                      </span>
                      {hook.text}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addItem(item, i)}
                  disabled={addedIndexes.has(i)}
                  className="rounded border border-black/15 px-2 py-1 text-sm disabled:opacity-50 dark:border-white/20"
                >
                  {addedIndexes.has(i) ? "Added" : "Add this one"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
