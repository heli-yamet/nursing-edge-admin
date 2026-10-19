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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[#D9E1E5]">
        <div
          role="tablist"
          aria-label="Content imports"
          className="-mb-px flex flex-wrap"
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
      </div>
      <div
        id="imports-questions-panel"
        role="tabpanel"
        aria-labelledby="imports-tab-questions"
        hidden={tab !== "questions"}
        className="min-h-0 flex-1 overflow-auto"
      >
        {questions}
      </div>
      <div
        id="imports-links-panel"
        role="tabpanel"
        aria-labelledby="imports-tab-links"
        hidden={tab !== "links"}
        className="min-h-0 flex-1 overflow-auto"
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
      className={`me-2 inline-flex items-center justify-center border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-[#0B7F86] ${
        selected
          ? "border-[#0B7F86] text-[#0B7F86]"
          : "border-transparent text-[#66727A] hover:border-[#0B7F86] hover:text-[#0B7F86]"
      }`}
    >
      {label}
    </button>
  );
}
