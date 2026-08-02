"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useProjectContext } from "@/lib/projectContext";
import { deleteContentItem, subscribeAllContent, updateContentItem } from "@/lib/firestore";
import { PLATFORM_LABELS, STAGES, STAGE_LABELS, type ContentItem, type Stage } from "@/lib/types";

function ContentCard({ item, projectName }: { item: ContentItem; projectName: string }) {
  const hook =
    item.selectedHookIndex != null ? item.hooks[item.selectedHookIndex] : item.hooks[0];

  async function changeStage(stage: Stage) {
    await updateContentItem(item.projectId, item.id, { stage });
  }

  async function remove() {
    if (!window.confirm("Delete this content item? This cannot be undone.")) return;
    await deleteContentItem(item.projectId, item.id);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium dark:bg-white/10">
          {projectName}
        </span>
        <div className="flex gap-2">
          <Link href={`/content/${item.projectId}/${item.id}`} className="text-xs underline">
            View
          </Link>
          <button onClick={remove} className="text-xs text-red-600 hover:underline">
            Delete
          </button>
        </div>
      </div>

      <Link href={`/content/${item.projectId}/${item.id}`} className="line-clamp-3 hover:underline">
        {item.ideaSummary || "(untitled)"}
      </Link>

      {item.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1 text-xs text-black/60 dark:text-white/60">
          {item.platforms.map((p) => (
            <span key={p}>{PLATFORM_LABELS[p]}</span>
          ))}
        </div>
      )}

      {item.pillar && (
        <span className="text-xs text-black/50 dark:text-white/50">Pillar: {item.pillar}</span>
      )}

      {hook && (
        <span className="w-fit rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
          {hook.type}
        </span>
      )}

      <select
        value={item.stage}
        onChange={(e) => changeStage(e.target.value as Stage)}
        className="mt-1 rounded border border-black/15 bg-transparent px-1 py-1 text-xs dark:border-white/20"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>
            {STAGE_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function CalendarPage() {
  const { projects } = useProjectContext();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<Set<Stage>>(new Set(STAGES));

  useEffect(() => subscribeAllContent(setItems), []);

  const projectNames = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const filtered = items.filter(
    (item) => (projectFilter === "all" || item.projectId === projectFilter) && stageFilter.has(item.stage)
  );

  function toggleStage(stage: Stage) {
    setStageFilter((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) next.delete(stage);
      else next.add(stage);
      return next;
    });
  }

  const visibleStages = STAGES.filter((s) => stageFilter.has(s));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Production calendar</h1>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-2 text-sm">
          {STAGES.map((s) => (
            <label key={s} className="flex items-center gap-1">
              <input type="checkbox" checked={stageFilter.has(s)} onChange={() => toggleStage(s)} />
              {STAGE_LABELS[s]}
            </label>
          ))}
        </div>

        <button
          onClick={() => setStageFilter(new Set(["shot"]))}
          className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20"
        >
          Edit backlog (Shot, not Edited)
        </button>
        <button
          onClick={() => setStageFilter(new Set(STAGES))}
          className="rounded border border-black/15 px-2 py-1 text-sm dark:border-white/20"
        >
          Reset filters
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleStages.map((stage) => (
          <div key={stage} className="flex w-64 shrink-0 flex-col gap-2">
            <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
              {STAGE_LABELS[stage]} ({filtered.filter((i) => i.stage === stage).length})
            </h2>
            <div className="flex flex-col gap-2">
              {filtered
                .filter((i) => i.stage === stage)
                .map((item) => (
                  <ContentCard
                    key={item.id}
                    item={item}
                    projectName={projectNames.get(item.projectId) ?? "Unknown"}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
