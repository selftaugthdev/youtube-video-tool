"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addTopic,
  addTopicsBulk,
  clearAllTopics,
  deleteTopic,
  getProject,
  setTopicUsed,
  subscribeTopics,
} from "@/lib/firestore";
import { parseTopicsFromText } from "@/lib/parseTopics";
import type { Project, Topic } from "@/lib/types";

export default function TopicBankPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [manualTopic, setManualTopic] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [hideUsed, setHideUsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProject(projectId).then(setProject);
    return subscribeTopics(projectId, setTopics);
  }, [projectId]);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadMessage(null);
    try {
      const text = await file.text();
      const parsed = parseTopicsFromText(text);
      if (parsed.length === 0) {
        setUploadMessage("No topics found in that file. One topic per line.");
        return;
      }
      await addTopicsBulk(projectId, parsed);
      setUploadMessage(`Added ${parsed.length} topics.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTopic.trim()) return;
    await addTopic(projectId, manualTopic.trim());
    setManualTopic("");
  }

  async function handleClearAll() {
    if (!window.confirm(`Delete all ${topics.length} topics? This cannot be undone.`)) return;
    await clearAllTopics(projectId);
  }

  const visibleTopics = hideUsed ? topics.filter((t) => !t.used) : topics;
  const usedCount = topics.filter((t) => t.used).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/projects" className="text-sm text-black/60 hover:underline dark:text-white/60">
          ← All projects
        </Link>
        <h1 className="text-xl font-semibold">
          Topic bank{project ? `: ${project.name}` : ""}
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Upload a list of video topics (one per line, .md or .txt). Mark one used when you turn
          it into hooks or a script, so you always know what is left to shoot.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,text/markdown,text/plain"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm"
        />
        {uploading && <span className="text-sm text-black/60 dark:text-white/60">Adding...</span>}
        {uploadMessage && <span className="text-sm text-black/60 dark:text-white/60">{uploadMessage}</span>}
      </div>

      <form onSubmit={addManual} className="flex gap-2">
        <input
          className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          placeholder="Add a single topic manually"
          value={manualTopic}
          onChange={(e) => setManualTopic(e.target.value)}
        />
        <button
          type="submit"
          disabled={!manualTopic.trim()}
          className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60">
        <span>
          {topics.length} topics, {usedCount} used
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={hideUsed} onChange={(e) => setHideUsed(e.target.checked)} />
            Hide used
          </label>
          {topics.length > 0 && (
            <button onClick={handleClearAll} className="text-red-600 hover:underline">
              Clear all
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visibleTopics.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">No topics yet. Upload a file above.</p>
        )}
        {visibleTopics.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
          >
            <label className="flex flex-1 items-center gap-2">
              <input
                type="checkbox"
                checked={t.used}
                onChange={(e) => setTopicUsed(projectId, t.id, e.target.checked)}
              />
              <span className={t.used ? "text-black/40 line-through dark:text-white/40" : ""}>
                {t.text}
              </span>
            </label>
            <div className="flex shrink-0 gap-2">
              <Link
                href={`/generate/hooks?text=${encodeURIComponent(t.text)}`}
                onClick={() => setTopicUsed(projectId, t.id, true)}
                className="text-xs underline"
              >
                Use for hooks
              </Link>
              <Link
                href={`/generate/script?text=${encodeURIComponent(t.text)}`}
                onClick={() => setTopicUsed(projectId, t.id, true)}
                className="text-xs underline"
              >
                Use for script
              </Link>
              <button
                onClick={() => deleteTopic(projectId, t.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
