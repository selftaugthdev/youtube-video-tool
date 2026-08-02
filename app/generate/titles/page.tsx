"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProjectContext } from "@/lib/projectContext";
import { subscribeTitleBank, updateContentItem } from "@/lib/firestore";
import NoProjectNotice from "@/components/NoProjectNotice";
import ContentItemPicker from "@/components/ContentItemPicker";
import { PLATFORM_LABELS, type ContentItem, type PlatformKey, type TitleBankEntry } from "@/lib/types";

function TitleGenerator() {
  const { selectedProject, keywords } = useProjectContext();
  const searchParams = useSearchParams();

  const [sourceText, setSourceText] = useState(searchParams.get("text") ?? "");
  const [platforms, setPlatforms] = useState<PlatformKey[]>(selectedProject?.platforms ?? []);
  const [titleBank, setTitleBank] = useState<TitleBankEntry[]>([]);
  const [titles, setTitles] = useState<Partial<Record<PlatformKey, string[]>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachTo, setAttachTo] = useState<ContentItem | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProject) return;
    return subscribeTitleBank(selectedProject.id, setTitleBank);
  }, [selectedProject]);

  if (!selectedProject) return <NoProjectNotice />;

  const activePlatforms = platforms.length ? platforms : selectedProject.platforms;

  async function generate() {
    if (!sourceText.trim() || !selectedProject) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: selectedProject,
          keywords,
          titleBank,
          sourceText,
          platforms: activePlatforms,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      setTitles(data.titles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copyTitle(platform: PlatformKey, index: number, text: string) {
    await navigator.clipboard.writeText(text);
    const key = `${platform}-${index}`;
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  }

  async function applyTitle(platform: PlatformKey, text: string) {
    if (!selectedProject || !attachTo) return;
    const existing = attachTo.platformVariants[platform];
    await updateContentItem(selectedProject.id, attachTo.id, {
      platformVariants: {
        ...attachTo.platformVariants,
        [platform]: {
          treatment: existing?.treatment ?? "",
          description: existing?.description ?? "",
          tags: existing?.tags ?? [],
          title: text,
        },
      },
      platforms: Array.from(new Set([...attachTo.platforms, platform])) as PlatformKey[],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Titles — {selectedProject.name}</h1>

      <div className="flex flex-col gap-2">
        <label className="text-sm text-black/60 dark:text-white/60">
          Idea or script to title
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

      <p className="text-xs text-black/50 dark:text-white/50">
        {titleBank.length > 0
          ? `Referencing ${titleBank.length} proven titles from this project's title bank.`
          : "No title bank entries yet for this project, generating from tone and keywords only."}
      </p>

      <button
        onClick={generate}
        disabled={loading || !sourceText.trim() || activePlatforms.length === 0}
        className="self-start rounded bg-foreground px-4 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate titles"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {titles && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.keys(titles) as PlatformKey[]).map((p) => {
              const variants = titles[p];
              if (!variants) return null;
              return (
                <div key={p} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                  <h2 className="mb-2 font-medium">{PLATFORM_LABELS[p]}</h2>
                  <div className="flex flex-col gap-2">
                    {variants.map((title, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 rounded border border-black/10 px-2 py-1.5 text-sm dark:border-white/10"
                      >
                        <span>{title}</span>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => copyTitle(p, i, title)}
                            className="text-xs underline"
                          >
                            {copied === `${p}-${i}` ? "Copied" : "Copy"}
                          </button>
                          {attachTo && (
                            <button
                              onClick={() => applyTitle(p, title)}
                              className="text-xs underline"
                            >
                              Use this
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
            <span className="text-sm text-black/60 dark:text-white/60">
              Save into calendar item (optional):
            </span>
            <ContentItemPicker
              projectId={selectedProject.id}
              selectedId={attachTo?.id ?? null}
              onSelect={setAttachTo}
            />
            {!attachTo && (
              <span className="text-xs text-black/50 dark:text-white/50">
                Pick an item to enable &ldquo;Use this&rdquo; on each title.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TitleGeneratorPage() {
  return (
    <Suspense fallback={null}>
      <TitleGenerator />
    </Suspense>
  );
}
