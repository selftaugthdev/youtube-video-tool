"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProjectContext } from "@/lib/projectContext";
import { createContentItem, updateContentItem } from "@/lib/firestore";
import NoProjectNotice from "@/components/NoProjectNotice";
import ContentItemPicker from "@/components/ContentItemPicker";
import type { PlatformVariantResult } from "@/lib/claude";
import { PLATFORM_LABELS, type ContentItem, type PlatformKey } from "@/lib/types";

function MetadataGenerator() {
  const { selectedProject, keywords } = useProjectContext();
  const searchParams = useSearchParams();

  const [sourceText, setSourceText] = useState(searchParams.get("text") ?? "");
  const [platforms, setPlatforms] = useState<PlatformKey[]>(selectedProject?.platforms ?? []);
  const [variants, setVariants] = useState<Partial<Record<PlatformKey, PlatformVariantResult>> | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachTo, setAttachTo] = useState<ContentItem | null>(null);
  const [saved, setSaved] = useState(false);

  if (!selectedProject) return <NoProjectNotice />;

  const activePlatforms = platforms.length ? platforms : selectedProject.platforms;

  async function generate() {
    if (!sourceText.trim() || !selectedProject) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/generate/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: selectedProject,
          keywords,
          sourceText,
          platforms: activePlatforms,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      setVariants(data.variants);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveVariants() {
    if (!selectedProject || !variants) return;
    if (attachTo) {
      await updateContentItem(selectedProject.id, attachTo.id, {
        platformVariants: { ...attachTo.platformVariants, ...variants },
        platforms: Array.from(new Set([...attachTo.platforms, ...Object.keys(variants)])) as PlatformKey[],
      });
    } else {
      await createContentItem(selectedProject.id, {
        ideaSummary: sourceText,
        platformVariants: variants,
        platforms: Object.keys(variants) as PlatformKey[],
        stage: "idea",
      });
    }
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Platform metadata — {selectedProject.name}</h1>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-black/60 dark:text-white/60">
          Idea or script to repurpose across platforms
        </label>
        <textarea
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          rows={4}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {selectedProject.platforms.map((p) => (
          <label key={p} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={activePlatforms.includes(p)}
              onChange={(e) => {
                setPlatforms(
                  e.target.checked
                    ? [...activePlatforms, p]
                    : activePlatforms.filter((v) => v !== p)
                );
              }}
            />
            {PLATFORM_LABELS[p]}
          </label>
        ))}
      </div>

      <button
        onClick={generate}
        disabled={loading || !sourceText.trim() || activePlatforms.length === 0}
        className="self-start rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate all platform variants"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {variants && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(variants) as PlatformKey[]).map((p) => {
              const v = variants[p];
              if (!v) return null;
              return (
                <div key={p} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                  <h2 className="mb-2 font-medium">{PLATFORM_LABELS[p]}</h2>
                  <p className="mb-2 text-xs italic text-black/60 dark:text-white/60">
                    {v.treatment}
                  </p>
                  <p className="mb-2 text-sm font-medium">{v.title}</p>
                  <p className="mb-2 whitespace-pre-wrap text-sm">{v.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {v.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
            <span className="text-sm text-black/60 dark:text-white/60">Save to:</span>
            <ContentItemPicker
              projectId={selectedProject.id}
              selectedId={attachTo?.id ?? null}
              onSelect={setAttachTo}
            />
            <button
              onClick={saveVariants}
              className="rounded bg-foreground px-3 py-1.5 text-sm text-background"
            >
              {saved ? "Saved" : "Save variants"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MetadataGeneratorPage() {
  return (
    <Suspense fallback={null}>
      <MetadataGenerator />
    </Suspense>
  );
}
