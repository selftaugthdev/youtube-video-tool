"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProjectContext } from "@/lib/projectContext";
import { createContentItem, updateContentItem } from "@/lib/firestore";
import NoProjectNotice from "@/components/NoProjectNotice";
import ContentItemPicker from "@/components/ContentItemPicker";
import type { GeneratedScript } from "@/lib/claude";
import type { ContentItem } from "@/lib/types";
import { formatTimestamp } from "@/lib/format";

function ScriptGenerator() {
  const { selectedProject, keywords } = useProjectContext();
  const searchParams = useSearchParams();

  const [sourceText, setSourceText] = useState(searchParams.get("text") ?? "");
  const [targetLength, setTargetLength] = useState(
    selectedProject?.targetLength || "1 to 2 minutes"
  );
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachTo, setAttachTo] = useState<ContentItem | null>(null);
  const [saved, setSaved] = useState(false);

  if (!selectedProject) return <NoProjectNotice />;

  async function generate() {
    if (!sourceText.trim() || !selectedProject) return;
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/generate/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: selectedProject,
          keywords,
          sourceText,
          targetLength: targetLength || "1 to 2 minutes",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      setScript(data.script);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function saveScript() {
    if (!selectedProject || !script) return;
    if (attachTo) {
      await updateContentItem(selectedProject.id, attachTo.id, {
        script,
        stage: attachTo.stage === "idea" ? "scripted" : attachTo.stage,
      });
    } else {
      await createContentItem(selectedProject.id, {
        ideaSummary: sourceText,
        script,
        platforms: selectedProject.platforms,
        stage: "scripted",
      });
    }
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Teleprompter script — {selectedProject.name}</h1>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-black/60 dark:text-white/60">
          Paste any idea, hook, or raw topic. Works standalone, no need to run the other
          generators first.
        </label>
        <textarea
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          rows={4}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-black/60 dark:text-white/60">Target spoken length</label>
        <input
          className="w-56 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          placeholder="e.g. 1 to 2 minutes"
          value={targetLength}
          onChange={(e) => setTargetLength(e.target.value)}
        />
      </div>

      <button
        onClick={generate}
        disabled={loading || !sourceText.trim()}
        className="self-start rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate script"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {script && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-5 rounded-lg border border-black/10 p-6 dark:border-white/10">
            {script.sections.map((section, i) => (
              <div key={i}>
                <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
                  {section.label} — {formatTimestamp(section.timestampSeconds)}
                </h2>
                <div className="flex flex-col gap-2 text-lg leading-snug">
                  {section.lines.map((line, li) => (
                    <p key={li}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <h2 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">Notes</h2>
            <p className="whitespace-pre-wrap text-sm">{script.notes}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
            <span className="text-sm text-black/60 dark:text-white/60">Save to:</span>
            <ContentItemPicker
              projectId={selectedProject.id}
              selectedId={attachTo?.id ?? null}
              onSelect={setAttachTo}
            />
            <button
              onClick={saveScript}
              className="rounded bg-foreground px-3 py-1.5 text-sm text-background"
            >
              {saved ? "Saved" : "Save script"}
            </button>
            <Link
              href={`/generate/metadata?text=${encodeURIComponent(sourceText)}`}
              className="ml-auto text-sm underline"
            >
              Generate metadata for this →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScriptGeneratorPage() {
  return (
    <Suspense fallback={null}>
      <ScriptGenerator />
    </Suspense>
  );
}
