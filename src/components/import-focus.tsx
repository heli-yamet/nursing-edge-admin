"use client";

import { createContext, useContext, type ReactNode } from "react";

export type ImportFocus = {
  highlightedQuestionVersionId: string | null;
  showQuestion: (questionVersionId: string) => void;
};

const ImportFocusContext = createContext<ImportFocus | null>(null);

export function ImportFocusProvider({
  value,
  children,
}: {
  value: ImportFocus;
  children: ReactNode;
}) {
  return (
    <ImportFocusContext.Provider value={value}>
      {children}
    </ImportFocusContext.Provider>
  );
}

export function useImportFocus(): ImportFocus | null {
  return useContext(ImportFocusContext);
}
