"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectContext } from "@/lib/projectContext";

const LINKS = [
  { href: "/calendar", label: "Calendar" },
  { href: "/generate/idea", label: "Ideas" },
  { href: "/generate/hooks", label: "Hooks" },
  { href: "/generate/titles", label: "Titles" },
  { href: "/generate/script", label: "Script" },
  { href: "/generate/metadata", label: "Metadata" },
  { href: "/batch", label: "Batch" },
  { href: "/projects", label: "Projects" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { projects, selectedProjectId, setSelectedProjectId, loading } = useProjectContext();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
        <span className="font-semibold whitespace-nowrap">Content Dashboard</span>

        <select
          className="rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20"
          value={selectedProjectId ?? ""}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={loading || projects.length === 0}
        >
          {projects.length === 0 && <option value="">No projects yet</option>}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <nav className="flex flex-wrap gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 ${
                pathname === link.href ? "bg-black/10 font-medium dark:bg-white/15" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
