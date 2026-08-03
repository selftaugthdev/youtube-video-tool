"use client";

import { useState } from "react";
import { updatePlatformVariant } from "@/lib/firestore";
import { PLATFORM_LABELS, type PlatformKey, type PlatformVariant } from "@/lib/types";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!text) return null;

  return (
    <button onClick={copy} className="text-xs underline">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function PlatformVariantCard({
  projectId,
  contentId,
  platform,
  variant,
}: {
  projectId: string;
  contentId: string;
  platform: PlatformKey;
  variant: PlatformVariant;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(variant.title);
  const [description, setDescription] = useState(variant.description);
  const [tagsText, setTagsText] = useState(variant.tags.join(", "));
  const [treatment, setTreatment] = useState(variant.treatment);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setTitle(variant.title);
    setDescription(variant.description);
    setTagsText(variant.tags.join(", "));
    setTreatment(variant.treatment);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await updatePlatformVariant(projectId, contentId, platform, {
        treatment,
        title,
        description,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded border border-black/10 p-3 dark:border-white/10">
        <h3 className="text-sm font-medium">{PLATFORM_LABELS[platform]}</h3>
        <input
          className="rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
          placeholder="Description / caption"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
          placeholder="Tags, comma separated"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
        />
        <textarea
          className="rounded border border-black/15 bg-transparent px-2 py-1 text-xs italic dark:border-white/20"
          placeholder="Treatment notes"
          rows={2}
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-foreground px-3 py-1 text-xs text-background disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="rounded border border-black/15 px-3 py-1 text-xs dark:border-white/20"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{PLATFORM_LABELS[platform]}</h3>
        <button onClick={startEdit} className="text-xs underline">
          Edit
        </button>
      </div>
      {variant.treatment && (
        <p className="text-xs italic text-black/60 dark:text-white/60">{variant.treatment}</p>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{variant.title}</p>
        <CopyButton text={variant.title} />
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="whitespace-pre-wrap text-sm">{variant.description}</p>
        <CopyButton text={variant.description} />
      </div>
      {variant.tags.length > 0 && (
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {variant.tags.map((tag, i) => (
              <span key={i} className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                {tag}
              </span>
            ))}
          </div>
          <CopyButton text={variant.tags.join(", ")} />
        </div>
      )}
    </div>
  );
}
