"use client";

import { useState } from "react";
import { addShot, addShotsBulk, deleteShot, updateShot } from "@/lib/firestore";
import {
  SHOT_PRIORITIES,
  SHOT_TYPES,
  type Shot,
  type ShotPriority,
  type ShotStatus,
  type ShotType,
} from "@/lib/types";

const TYPE_ORDER: ShotType[] = ["A-roll", "B-roll", "Insert", "Text overlay"];

function ShotRow({
  shot,
  projectId,
  contentId,
}: {
  shot: Shot;
  projectId: string;
  contentId: string;
}) {
  const [gearNote, setGearNote] = useState(shot.gearNote);

  function toggleStatus() {
    const next: ShotStatus = shot.status === "Needed" ? "Got it" : "Needed";
    updateShot(projectId, contentId, shot.id, { status: next });
  }

  function saveGearNote() {
    if (gearNote !== shot.gearNote) {
      updateShot(projectId, contentId, shot.id, { gearNote });
    }
  }

  return (
    <div className="flex items-start gap-2 rounded border border-black/10 px-2 py-1.5 text-sm dark:border-white/10">
      <input
        type="checkbox"
        checked={shot.status === "Got it"}
        onChange={toggleStatus}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              shot.priority === "Must-have"
                ? "bg-black/10 dark:bg-white/15"
                : "bg-black/5 dark:bg-white/10"
            }`}
          >
            {shot.priority}
          </span>
          <span className={shot.status === "Got it" ? "line-through text-black/40 dark:text-white/40" : ""}>
            {shot.description}
          </span>
        </div>
        {shot.scriptRef && (
          <p className="mt-0.5 text-xs italic text-black/50 dark:text-white/50">{shot.scriptRef}</p>
        )}
        <input
          className="mt-1 w-full rounded border border-black/10 bg-transparent px-1.5 py-0.5 text-xs dark:border-white/10"
          placeholder="Gear note (optional)"
          value={gearNote}
          onChange={(e) => setGearNote(e.target.value)}
          onBlur={saveGearNote}
        />
      </div>
      <button
        onClick={() => deleteShot(projectId, contentId, shot.id)}
        className="shrink-0 text-xs text-red-600 hover:underline"
      >
        Remove
      </button>
    </div>
  );
}

function AddShotForm({ projectId, contentId, nextOrder }: { projectId: string; contentId: string; nextOrder: number }) {
  const [type, setType] = useState<ShotType>("A-roll");
  const [description, setDescription] = useState("");
  const [scriptRef, setScriptRef] = useState("");
  const [gearNote, setGearNote] = useState("");
  const [priority, setPriority] = useState<ShotPriority>("Must-have");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    await addShot(projectId, contentId, {
      orderNum: nextOrder,
      type,
      description: description.trim(),
      scriptRef: scriptRef.trim(),
      gearNote: gearNote.trim(),
      priority,
      status: "Needed",
    });
    setDescription("");
    setScriptRef("");
    setGearNote("");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2 rounded border border-black/10 p-2 text-sm dark:border-white/10">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ShotType)}
        className="rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20"
      >
        {SHOT_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <input
        className="min-w-[10rem] flex-1 rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="w-32 rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20"
        placeholder="Script ref"
        value={scriptRef}
        onChange={(e) => setScriptRef(e.target.value)}
      />
      <input
        className="w-28 rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20"
        placeholder="Gear note"
        value={gearNote}
        onChange={(e) => setGearNote(e.target.value)}
      />
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as ShotPriority)}
        className="rounded border border-black/15 bg-transparent px-1.5 py-1 text-xs dark:border-white/20"
      >
        {SHOT_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={!description.trim()}
        className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50 dark:border-white/20"
      >
        Add shot
      </button>
    </form>
  );
}

export default function ShotlistSection({
  projectId,
  contentId,
  scriptText,
  shots,
}: {
  projectId: string;
  contentId: string;
  scriptText: string;
  shots: Shot[];
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/shotlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptText }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      const data = await res.json();
      const startOrder = shots.length > 0 ? Math.max(...shots.map((s) => s.orderNum)) + 1 : 1;
      await addShotsBulk(
        projectId,
        contentId,
        data.shots.map(
          (
            s: { order: number; type: ShotType; description: string; scriptRef: string; priority: ShotPriority },
            i: number
          ) => ({
            orderNum: startOrder + i,
            type: s.type,
            description: s.description,
            scriptRef: s.scriptRef,
            gearNote: "",
            priority: s.priority,
            status: "Needed" as ShotStatus,
          })
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  const nextOrder = shots.length > 0 ? Math.max(...shots.map((s) => s.orderNum)) + 1 : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-black/60 dark:text-white/60">
          {shots.length} shot{shots.length === 1 ? "" : "s"}
        </span>
        <button
          onClick={generate}
          disabled={generating}
          className="rounded border border-black/15 px-2 py-1 text-xs disabled:opacity-50 dark:border-white/20"
        >
          {generating ? "Generating..." : "Generate shotlist"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {TYPE_ORDER.map((type) => {
        const group = shots.filter((s) => s.type === type).sort((a, b) => a.orderNum - b.orderNum);
        if (group.length === 0) return null;
        return (
          <div key={type} className="flex flex-col gap-1.5">
            <h4 className="text-xs font-medium uppercase text-black/50 dark:text-white/50">{type}</h4>
            {group.map((shot) => (
              <ShotRow key={shot.id} shot={shot} projectId={projectId} contentId={contentId} />
            ))}
          </div>
        );
      })}

      <AddShotForm projectId={projectId} contentId={contentId} nextOrder={nextOrder} />
    </div>
  );
}
