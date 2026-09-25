"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ImportedQuestion = {
  question_id: string;
  question_version_id: string;
  workbook_row: string;
  format: string;
  publication_status: "STAGED" | "PUBLISHED";
};

type PublishLine = {
  question_version_id: string;
  outcome: "PUBLISHED" | "REJECTED";
  reason: string | null;
};

type PublishResponse = {
  ok?: boolean;
  reason?: string | null;
  error?: string;
  lines?: PublishLine[];
};

function statusLabel(status: ImportedQuestion["publication_status"]): string {
  return status === "PUBLISHED" ? "Published" : "Staged";
}

export function ImportedQuestionsTable({
  questions,
}: {
  questions: ImportedQuestion[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<PublishLine[]>([]);

  const stagedIds = useMemo(
    () =>
      questions
        .filter((question) => question.publication_status === "STAGED")
        .map((question) => question.question_version_id),
    [questions],
  );
  const lineById = useMemo(
    () => new Map(lines.map((line) => [line.question_version_id, line])),
    [lines],
  );
  const allStagedSelected =
    stagedIds.length > 0 && stagedIds.every((id) => selected.includes(id));

  if (questions.length === 0) {
    return null;
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllStaged() {
    setSelected(allStagedSelected ? [] : stagedIds);
  }

  async function publish() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/question-publishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_version_ids: selected }),
      });
      const payload = (await response.json()) as PublishResponse;
      setLines(payload.lines ?? []);
      if (payload.ok) {
        setMessage("Selected questions are published. Learners still do not see them.");
        setSelected([]);
        router.refresh();
        return;
      }
      setMessage(payload.reason ?? payload.error ?? "Nothing was published.");
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-[#163A59]">Imported questions</h2>
      <p className="mt-2 text-base leading-7 text-[#24313A]">
        {questions.length} question {questions.length === 1 ? "version" : "versions"}{" "}
        in the bank. Select staged versions to publish. Learners still do not see
        questions.
      </p>
      <button
        type="button"
        disabled={busy || selected.length === 0}
        onClick={() => void publish()}
        className="mt-4 inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
      >
        {busy ? "Publishing…" : "Publish selected"}
      </button>
      {message ? (
        <p className="mt-4 text-base leading-7 text-[#24313A]" role="status">
          {message}
        </p>
      ) : null}
      <div className="mt-4 max-h-[480px] overflow-auto rounded-[10px] border border-[#D9E1E5] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#F7F9FA] text-[#163A59]">
            <tr>
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  aria-label="Select staged questions"
                  checked={allStagedSelected}
                  disabled={stagedIds.length === 0}
                  onChange={toggleAllStaged}
                />
              </th>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Question version</th>
              <th className="px-3 py-2 font-medium">Permanent item</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => {
              const staged = question.publication_status === "STAGED";
              const line = lineById.get(question.question_version_id);
              const status =
                question.publication_status === "PUBLISHED"
                  ? "Published"
                  : line?.outcome === "REJECTED" && line.reason
                    ? line.reason
                    : statusLabel(question.publication_status);
              return (
                <tr
                  key={question.question_version_id}
                  className="border-t border-[#D9E1E5]"
                >
                  <td className="px-3 py-2 align-top">
                    {staged ? (
                      <input
                        type="checkbox"
                        aria-label={`Select ${question.question_version_id}`}
                        checked={selected.includes(question.question_version_id)}
                        onChange={() => toggle(question.question_version_id)}
                      />
                    ) : null}
                  </td>
                  <td className="px-3 py-2 align-top">{question.workbook_row}</td>
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {question.question_version_id}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {question.question_id}
                  </td>
                  <td className="px-3 py-2 align-top">{question.format}</td>
                  <td className="px-3 py-2 align-top">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
