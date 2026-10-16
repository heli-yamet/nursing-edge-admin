"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ImportTab = "questions" | "links";

export function ImportTabs({
  tab,
  questions,
  links,
}: {
  tab: ImportTab;
  questions: ReactNode;
  links: ReactNode;
}) {
  return (
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="Content imports"
        className="flex flex-wrap gap-2"
      >
        <TabLink id="questions" href="/imports" current={tab} label="Questions" />
        <TabLink
          id="links"
          href="/imports?tab=links"
          current={tab}
          label="Links"
        />
      </div>
      <div role="tabpanel" className="mt-6">
        {tab === "links" ? links : questions}
      </div>
    </div>
  );
}

function TabLink({
  id,
  href,
  current,
  label,
}: {
  id: ImportTab;
  href: string;
  current: ImportTab;
  label: string;
}) {
  const selected = current === id;
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={selected}
      className={`inline-flex min-h-[40px] items-center rounded-[10px] border px-4 text-sm font-medium ${
        selected
          ? "border-[#163A59] bg-[#163A59] text-white"
          : "border-[#D9E1E5] bg-white text-[#163A59] hover:bg-[#F7F9FA]"
      }`}
    >
      {label}
    </Link>
  );
}
