"use client";

import { useState, type ReactNode } from "react";
import { ImportFocusProvider } from "@/components/import-focus";

type ImportTab = "questions" | "links";

export function ImportTabs({
  questions,
  links,
}: {
  questions: ReactNode;
  links: ReactNode;
}) {
  const [tab, setTab] = useState<ImportTab>("questions");
  const [highlightedQuestionVersionId, setHighlightedQuestionVersionId] =
    useState<string | null>(null);

  function selectTab(next: ImportTab) {
    setTab(next);
    if (next === "links") {
      setHighlightedQuestionVersionId(null);
    }
  }

  function showQuestion(questionVersionId: string) {
    setHighlightedQuestionVersionId(questionVersionId);
    setTab("questions");
  }

  return (
    <ImportFocusProvider
      value={{ highlightedQuestionVersionId, showQuestion }}
    >
    <div className="mt-6">
      <div
        role="tablist"
        aria-label="Content imports"
        className="flex flex-wrap gap-2"
      >
        <TabButton
          id="questions"
          panelId="imports-questions-panel"
          current={tab}
          label="Questions"
          onSelect={selectTab}
        />
        <TabButton
          id="links"
          panelId="imports-links-panel"
          current={tab}
          label="Links"
          onSelect={selectTab}
        />
      </div>
      <div
        id="imports-questions-panel"
        role="tabpanel"
        aria-labelledby="imports-tab-questions"
        hidden={tab !== "questions"}
        className="mt-6"
      >
        {questions}
      </div>
      <div
        id="imports-links-panel"
        role="tabpanel"
        aria-labelledby="imports-tab-links"
        hidden={tab !== "links"}
        className="mt-6"
      >
        {links}
      </div>
    </div>
    </ImportFocusProvider>
  );
}

function TabButton({
  id,
  panelId,
  current,
  label,
  onSelect,
}: {
  id: ImportTab;
  panelId: string;
  current: ImportTab;
  label: string;
  onSelect: (tab: ImportTab) => void;
}) {
  const selected = current === id;
  return (
    <button
      id={`imports-tab-${id}`}
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      onClick={() => onSelect(id)}
      className={`inline-flex min-h-[40px] items-center rounded-[10px] border px-4 text-sm font-medium ${
        selected
          ? "border-[#163A59] bg-[#163A59] text-white"
          : "border-[#D9E1E5] bg-white text-[#163A59] hover:bg-[#F7F9FA]"
      }`}
    >
      {label}
    </button>
  );
}
