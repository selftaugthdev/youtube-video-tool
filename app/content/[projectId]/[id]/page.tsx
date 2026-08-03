"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteContentItem, subscribeContentItem, updateContentItem } from "@/lib/firestore";
import { formatTimestamp } from "@/lib/format";
import PlatformVariantCard from "@/components/PlatformVariantCard";
import {
  PLATFORM_LABELS,
  STAGES,
  STAGE_LABELS,
  type ContentItem,
  type PlatformKey,
  type Stage,
} from "@/lib/types";

export default function ContentDetailPage() {
  const params = useParams<{ projectId: string; id: string }>();
  const router = useRouter();
  const { projectId, id } = params;

  const [item, setItem] = useState<ContentItem | null | undefined>(undefined);

  useEffect(() => subscribeContentItem(projectId, id, setItem), [projectId, id]);

  async function changeStage(stage: Stage) {
    await updateContentItem(projectId, id, { stage });
  }

  async function selectHook(index: number) {
    await updateContentItem(projectId, id, { selectedHookIndex: index });
  }

  async function remove() {
    if (!window.confirm("Delete this content item? This cannot be undone.")) return;
    await deleteContentItem(projectId, id);
    router.push("/calendar");
  }

  if (item === undefined) {
    return <p className="text-sm text-black/60 dark:text-white/60">Loading...</p>;
  }

  if (item === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-black/60 dark:text-white/60">
          This content item no longer exists.
        </p>
        <Link href="/calendar" className="text-sm underline">
          ← Back to calendar
        </Link>
      </div>
    );
  }

  const encodedIdea = encodeURIComponent(item.ideaSummary);
  const variantPlatforms = Object.keys(item.platformVariants) as PlatformKey[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/calendar" className="text-sm text-black/60 hover:underline dark:text-white/60">
            ← Calendar
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{item.ideaSummary || "(untitled)"}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-black/60 dark:text-white/60">
            {item.pillar && (
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {item.pillar}
              </span>
            )}
            {item.platforms.map((p) => (
              <span key={p} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {PLATFORM_LABELS[p]}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={item.stage}
            onChange={(e) => changeStage(e.target.value as Stage)}
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <button onClick={remove} className="text-sm text-red-600 hover:underline">
            Delete
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Hooks</h2>
          <Link href={`/generate/hooks?text=${encodedIdea}`} className="text-sm underline">
            Generate more →
          </Link>
        </div>
        {item.hooks.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">No hooks yet.</p>
        )}
        <div className="flex flex-col gap-2">
          {item.hooks.map((hook, i) => {
            const isSelected = (item.selectedHookIndex ?? 0) === i;
            return (
              <div
                key={i}
                className={`flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm ${
                  isSelected
                    ? "border-black/30 dark:border-white/40"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                <div>
                  <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                    {hook.type}
                  </span>
                  {hook.text}
                </div>
                {isSelected ? (
                  <span className="shrink-0 text-xs text-black/50 dark:text-white/50">Primary</span>
                ) : (
                  <button onClick={() => selectHook(i)} className="shrink-0 text-xs underline">
                    Make primary
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Script</h2>
          <Link href={`/generate/script?text=${encodedIdea}`} className="text-sm underline">
            {item.script ? "Regenerate →" : "Generate →"}
          </Link>
        </div>
        {!item.script && (
          <p className="text-sm text-black/60 dark:text-white/60">No script yet.</p>
        )}
        {item.script && (
          <>
            <div className="flex flex-col gap-5">
              {item.script.sections.map((section, i) => (
                <div key={i}>
                  <h3 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">
                    {section.label} — {formatTimestamp(section.timestampSeconds)}
                  </h3>
                  <div className="flex flex-col gap-2 text-lg leading-snug">
                    {section.lines.map((line, li) => (
                      <p key={li}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded border border-black/10 p-3 dark:border-white/10">
              <h3 className="mb-2 text-sm font-medium text-black/60 dark:text-white/60">Notes</h3>
              <p className="whitespace-pre-wrap text-sm">{item.script.notes}</p>
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Platform metadata</h2>
          <div className="flex gap-3">
            <Link href={`/generate/titles?text=${encodedIdea}`} className="text-sm underline">
              Titles →
            </Link>
            <Link href={`/generate/metadata?text=${encodedIdea}`} className="text-sm underline">
              {variantPlatforms.length > 0 ? "Regenerate →" : "Generate →"}
            </Link>
          </div>
        </div>
        {variantPlatforms.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">No metadata yet.</p>
        )}
        {variantPlatforms.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {variantPlatforms.map((p) => {
              const v = item.platformVariants[p];
              if (!v) return null;
              return (
                <PlatformVariantCard
                  key={p}
                  projectId={projectId}
                  contentId={id}
                  platform={p}
                  variant={v}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
