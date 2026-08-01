"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { addKeyword, deleteKeyword, subscribeKeywords } from "@/lib/firestore";
import { getProject } from "@/lib/firestore";
import type { KeywordEntry, Project } from "@/lib/types";

export default function KeywordBankPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [keywords, setKeywords] = useState<KeywordEntry[]>([]);
  const [phrase, setPhrase] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getProject(projectId).then(setProject);
    return subscribeKeywords(projectId, setKeywords);
  }, [projectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!phrase.trim()) return;
    setAdding(true);
    try {
      await addKeyword(projectId, phrase.trim(), notes.trim());
      setPhrase("");
      setNotes("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/projects" className="text-sm text-black/60 hover:underline dark:text-white/60">
          ← All projects
        </Link>
        <h1 className="text-xl font-semibold">
          Keyword bank{project ? `: ${project.name}` : ""}
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Proven keywords and phrases. Generators reference this list so output stays consistent
          with what already ranks.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          placeholder="Keyword or phrase"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
        />
        <input
          className="flex-1 rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button
          type="submit"
          disabled={adding || !phrase.trim()}
          className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {keywords.length === 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">No keywords yet.</p>
        )}
        {keywords.map((k) => (
          <div
            key={k.id}
            className="flex items-center justify-between rounded border border-black/10 px-3 py-2 text-sm dark:border-white/10"
          >
            <div>
              <span className="font-medium">{k.phrase}</span>
              {k.notes && <span className="ml-2 text-black/50 dark:text-white/50">{k.notes}</span>}
            </div>
            <button
              onClick={() => deleteKeyword(projectId, k.id)}
              className="text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
