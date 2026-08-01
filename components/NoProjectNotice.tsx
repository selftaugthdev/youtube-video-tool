import Link from "next/link";

export default function NoProjectNotice() {
  return (
    <div className="rounded-lg border border-black/10 p-6 text-sm dark:border-white/10">
      No project selected yet.{" "}
      <Link href="/projects" className="underline">
        Create a project
      </Link>{" "}
      to get started.
    </div>
  );
}
