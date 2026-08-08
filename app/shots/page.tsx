"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProjectContext } from "@/lib/projectContext";
import { subscribeAllContent, subscribeAllShots, updateShot } from "@/lib/firestore";
import { SHOT_TYPES, type ContentItem, type Shot, type ShotType } from "@/lib/types";

const TYPE_ORDER: ShotType[] = [...SHOT_TYPES];

function todayISO(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default function TodaysShotsPage() {
  const { projects } = useProjectContext();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [date, setDate] = useState(todayISO());

  useEffect(() => subscribeAllContent(setItems), []);
  useEffect(() => subscribeAllShots(setShots), []);

  const projectNames = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const scheduledToday = items.filter((i) => i.shootDate === date);

  const shotsByContent = useMemo(() => {
    const map = new Map<string, Shot[]>();
    for (const shot of shots) {
      if (shot.status !== "Needed") continue;
      const list = map.get(shot.contentId) ?? [];
      list.push(shot);
      map.set(shot.contentId, list);
    }
    return map;
  }, [shots]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Today&apos;s shots</h1>

      <div className="flex items-center gap-2">
        <label className="text-sm text-black/60 dark:text-white/60">Shoot date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        />
        <button onClick={() => setDate(todayISO())} className="text-sm underline">
          Today
        </button>
      </div>

      {scheduledToday.length === 0 && (
        <p className="text-sm text-black/60 dark:text-white/60">
          No videos have this date set as their shoot date. Set a shoot date on a content item&apos;s
          detail page to have it show up here.
        </p>
      )}

      <div className="flex flex-col gap-6">
        {scheduledToday.map((item) => {
          const itemShots = (shotsByContent.get(item.id) ?? []).sort(
            (a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || a.orderNum - b.orderNum
          );
          return (
            <div key={item.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium dark:bg-white/10">
                    {projectNames.get(item.projectId) ?? "Unknown"}
                  </span>
                  <span className="text-sm">{item.ideaSummary || "(untitled)"}</span>
                </div>
                <Link href={`/content/${item.projectId}/${item.id}`} className="text-xs underline">
                  Open →
                </Link>
              </div>

              {itemShots.length === 0 ? (
                <p className="text-sm text-black/60 dark:text-white/60">
                  Nothing left, every shot for this one is Got it.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {itemShots.map((shot) => (
                    <label
                      key={shot.id}
                      className="flex items-start gap-2 rounded border border-black/10 px-2 py-1.5 text-sm dark:border-white/10"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        onChange={() => updateShot(shot.projectId, shot.contentId, shot.id, { status: "Got it" })}
                      />
                      <div>
                        <span className="mr-1.5 rounded-full bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">
                          {shot.type}
                        </span>
                        <span
                          className={
                            shot.priority === "Must-have" ? "font-medium" : "text-black/70 dark:text-white/70"
                          }
                        >
                          {shot.description}
                        </span>
                        {shot.gearNote && (
                          <span className="ml-1.5 text-xs italic text-black/50 dark:text-white/50">
                            ({shot.gearNote})
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
