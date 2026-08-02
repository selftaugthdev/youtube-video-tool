"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addTitleBankEntry,
  addTitleBankEntriesBulk,
  clearTitleBank,
  deleteTitleBankEntry,
  getProject,
  subscribeTitleBank,
} from "@/lib/firestore";
import { parseTopicsFromText } from "@/lib/parseTopics";
import type { Project, TitleBankEntry } from "@/lib/types";

export default function TitleBankPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [titles, setTitles] = useState<TitleBankEntry[]>([]);
  const [manualTitle, setManualTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProject(projectId).then(setProject);
    return subscribeTitleBank(projectId, setTitles);
  }, [projectId]);

  async function handleFile(file: File) {
    setUploading(true);
    setUploadMessage(null);
    try {
      const text = await file.text();
      const parsed = parseTopicsFromText(text);
      if (parsed.length === 0) {
        setUploadMessage("No titles found in that file. One title per line.");
        return;
      }
      await addTitleBankEntriesBulk(projectId, parsed);
      setUploadMessage(`Added ${parsed.length} titles.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function addManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    await addTitleBankEntry(projectId, manualTitle.trim());
    setManualTitle("");
  }

  async function handleClearAll() {
    if (!window.confirm(`Delete all ${titles.length} titles? This cannot be undone.`)) return;
    await clearTitleBank(projectId);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/projects" className="text-sm text-black/60 hover:underline dark:text-white/60">
          ← All projects
        </Link>
        <h1 className="text-xl font-semibold">
          Title bank{project ? `: ${project.name}` : ""}
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Upload titles that have proven to convert well (one per line, .md or .txt). The title
          generator studies their structure and hook patterns and reuses those patterns, it does
          not copy them.
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
          placeholder="Add a single proven title manually"
          value={manualTitle}
          onChange={(e) => setManualTitle(e.target.value)}
        />
        <button
          type="submit"
          disabled={!manualTitle.trim()}
          className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-black/60 dark:text-white/60">
        <span>{titles.length} titles</span>
        {titles.length > 0 && (
          <button onClick={handleClearAll} className="text-red-600 hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {titles.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">No titles yet. Upload a file above.</p>
        )}
        {titles.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
          >
            <span>{t.text}</span>
            <button
              onClick={() => deleteTitleBankEntry(projectId, t.id)}
              className="shrink-0 text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
