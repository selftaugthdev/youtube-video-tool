"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProjectContext } from "@/lib/projectContext";
import { createContentItem, updateContentItem } from "@/lib/firestore";
import NoProjectNotice from "@/components/NoProjectNotice";
import ContentItemPicker from "@/components/ContentItemPicker";
import type { GeneratedHook } from "@/lib/claude";
import type { ContentItem } from "@/lib/types";

function HooksGenerator() {
  const { selectedProject, keywords } = useProjectContext();
  const searchParams = useSearchParams();

  const [ideaText, setIdeaText] = useState(searchParams.get("text") ?? "");
  const [count, setCount] = useState(5);
  const [hooks, setHooks] = useState<GeneratedHook[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachTo, setAttachTo] = useState<ContentItem | null>(null);
  const [saved, setSaved] = useState(false);

  if (!selectedProject) return <NoProjectNotice />;

  async function generate() {
    if (!ideaText.trim()) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/generate/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: selectedProject, keywords, ideaText, count }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      setHooks(data.hooks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveHooks() {
    if (!selectedProject || !hooks) return;
    if (attachTo) {
      await updateContentItem(selectedProject.id, attachTo.id, {
        hooks: [...attachTo.hooks, ...hooks],
        selectedHookIndex: attachTo.selectedHookIndex ?? attachTo.hooks.length,
      });
    } else {
      await createContentItem(selectedProject.id, {
        ideaSummary: ideaText,
        hooks,
        selectedHookIndex: 0,
        platforms: selectedProject.platforms,
        stage: "idea",
      });
    }
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Hooks — {selectedProject.name}</h1>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-black/60 dark:text-white/60">
          Idea or hook source text (paste anything, or came from the idea generator)
        </label>
        <textarea
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          rows={3}
          value={ideaText}
          onChange={(e) => setIdeaText(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm text-black/60 dark:text-white/60">Count</label>
          <input
            type="number"
            min={1}
            max={8}
            className="w-20 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
        <button
          onClick={generate}
          disabled={loading || !ideaText.trim()}
          className="rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate hooks"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {hooks && (
        <div className="flex flex-col gap-3">
          {hooks.map((hook, i) => (
            <div key={i} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
              <div className="mb-2 inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {hook.type}
              </div>
              <p className="mb-3">{hook.text}</p>
              <Link
                href={`/generate/script?text=${encodeURIComponent(`${hook.text}\n\n${ideaText}`)}`}
                className="text-sm underline"
              >
                Write script from this hook
              </Link>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
            <span className="text-sm text-black/60 dark:text-white/60">Save to:</span>
            <ContentItemPicker
              projectId={selectedProject.id}
              selectedId={attachTo?.id ?? null}
              onSelect={setAttachTo}
            />
            <button
              onClick={saveHooks}
              className="rounded bg-foreground px-3 py-1.5 text-sm text-background"
            >
              {saved ? "Saved" : "Save hooks"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HooksGeneratorPage() {
  return (
    <Suspense fallback={null}>
      <HooksGenerator />
    </Suspense>
  );
}
