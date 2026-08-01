"use client";

import { useEffect, useState } from "react";
import { subscribeProjectContent } from "@/lib/firestore";
import { STAGE_LABELS, type ContentItem } from "@/lib/types";

export default function ContentItemPicker({
  projectId,
  selectedId,
  onSelect,
}: {
  projectId: string;
  selectedId: string | null;
  onSelect: (item: ContentItem | null) => void;
}) {
  const [items, setItems] = useState<ContentItem[]>([]);

  useEffect(() => subscribeProjectContent(projectId, setItems), [projectId]);

  return (
    <select
      className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
      value={selectedId ?? ""}
      onChange={(e) => {
        const item = items.find((i) => i.id === e.target.value) ?? null;
        onSelect(item);
      }}
    >
      <option value="">— create new calendar item —</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          [{STAGE_LABELS[item.stage]}] {item.ideaSummary.slice(0, 60) || "(untitled)"}
        </option>
      ))}
    </select>
  );
}
