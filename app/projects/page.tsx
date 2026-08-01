"use client";

import Link from "next/link";
import { useState } from "react";
import { useProjectContext } from "@/lib/projectContext";
import { createProject, deleteProject, updateProject } from "@/lib/firestore";
import { seedStarterProjects } from "@/lib/seedProjects";
import { ALL_PLATFORMS, PLATFORM_LABELS, type PlatformKey, type Project } from "@/lib/types";

function PlatformCheckboxes({
  value,
  onChange,
}: {
  value: PlatformKey[];
  onChange: (next: PlatformKey[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {ALL_PLATFORMS.map((p) => (
        <label key={p} className="flex items-center gap-1.5 text-sm">
          <input
            type="checkbox"
            checked={value.includes(p)}
            onChange={(e) => {
              onChange(e.target.checked ? [...value, p] : value.filter((v) => v !== p));
            }}
          />
          {PLATFORM_LABELS[p]}
        </label>
      ))}
    </div>
  );
}

function NewProjectForm() {
  const [name, setName] = useState("");
  const [platforms, setPlatforms] = useState<PlatformKey[]>([]);
  const [tonePreset, setTonePreset] = useState("");
  const [pillars, setPillars] = useState("");
  const [targetLength, setTargetLength] = useState("1 to 2 minutes");
  const [callToAction, setCallToAction] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createProject({
        name: name.trim(),
        platforms,
        tonePreset,
        contentPillars: pillars
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        targetLength: targetLength.trim(),
        callToAction: callToAction.trim(),
      });
      setName("");
      setPlatforms([]);
      setTonePreset("");
      setPillars("");
      setTargetLength("1 to 2 minutes");
      setCallToAction("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <h2 className="font-medium">New project</h2>
      <input
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <PlatformCheckboxes value={platforms} onChange={setPlatforms} />
      <textarea
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        placeholder="Voice/tone preset (injected into every generation prompt)"
        rows={3}
        value={tonePreset}
        onChange={(e) => setTonePreset(e.target.value)}
      />
      <input
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        placeholder="Content pillars, comma separated"
        value={pillars}
        onChange={(e) => setPillars(e.target.value)}
      />
      <input
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        placeholder="Default target script length, e.g. 1 to 2 minutes"
        value={targetLength}
        onChange={(e) => setTargetLength(e.target.value)}
      />
      <textarea
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        placeholder="Call to action guidance (optional), e.g. mention downloading the app, link in description"
        rows={2}
        value={callToAction}
        onChange={(e) => setCallToAction(e.target.value)}
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="self-start rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
      >
        {saving ? "Creating..." : "Create project"}
      </button>
    </form>
  );
}

function ProjectRow({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [platforms, setPlatforms] = useState<PlatformKey[]>(project.platforms);
  const [tonePreset, setTonePreset] = useState(project.tonePreset);
  const [pillars, setPillars] = useState(project.contentPillars.join(", "));
  const [targetLength, setTargetLength] = useState(project.targetLength ?? "");
  const [callToAction, setCallToAction] = useState(project.callToAction ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateProject(project.id, {
        name: name.trim(),
        platforms,
        tonePreset,
        contentPillars: pillars
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        targetLength: targetLength.trim(),
        callToAction: callToAction.trim(),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete project "${project.name}"? This does not delete its content items.`)) return;
    await deleteProject(project.id);
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-black/10 p-4 dark:border-white/10">
        <div>
          <div className="font-medium">{project.name}</div>
          <div className="text-sm text-black/60 dark:text-white/60">
            {project.platforms.map((p) => PLATFORM_LABELS[p]).join(", ") || "No platforms set"}
          </div>
          {project.contentPillars.length > 0 && (
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
              Pillars: {project.contentPillars.join(", ")}
            </div>
          )}
          {project.targetLength && (
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
              Target length: {project.targetLength}
            </div>
          )}
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={`/projects/${project.id}/topics`} className="rounded border border-black/15 px-2 py-1 dark:border-white/20">
            Topic bank
          </Link>
          <Link href={`/projects/${project.id}/keywords`} className="rounded border border-black/15 px-2 py-1 dark:border-white/20">
            Keyword bank
          </Link>
          <button onClick={() => setEditing(true)} className="rounded border border-black/15 px-2 py-1 dark:border-white/20">
            Edit
          </button>
          <button onClick={remove} className="rounded border border-black/15 px-2 py-1 text-red-600 dark:border-white/20">
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
      <input
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <PlatformCheckboxes value={platforms} onChange={setPlatforms} />
      <textarea
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        rows={4}
        value={tonePreset}
        onChange={(e) => setTonePreset(e.target.value)}
      />
      <input
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        value={pillars}
        onChange={(e) => setPillars(e.target.value)}
      />
      <input
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        placeholder="Default target script length, e.g. 1 to 2 minutes"
        value={targetLength}
        onChange={(e) => setTargetLength(e.target.value)}
      />
      <textarea
        className="rounded border border-black/15 bg-transparent px-2 py-1.5 text-sm dark:border-white/20"
        placeholder="Call to action guidance (optional)"
        rows={2}
        value={callToAction}
        onChange={(e) => setCallToAction(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={() => setEditing(false)} className="rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/20">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, loading } = useProjectContext();
  const [seeding, setSeeding] = useState(false);

  async function seed() {
    setSeeding(true);
    try {
      await seedStarterProjects();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Projects</h1>
      <NewProjectForm />
      <div className="flex flex-col gap-3">
        {loading && <p className="text-sm text-black/60 dark:text-white/60">Loading...</p>}
        {!loading && projects.length === 0 && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-black/60 dark:text-white/60">No projects yet. Create one above, or</p>
            <button
              onClick={seed}
              disabled={seeding}
              className="rounded border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
            >
              {seeding ? "Adding..." : "Add starter projects (MigraineCast + Manifestation / Life Rebuild)"}
            </button>
          </div>
        )}
        {projects.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
