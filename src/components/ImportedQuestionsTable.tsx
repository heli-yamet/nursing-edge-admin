"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ImportedQuestion = {
  question_id: string;
  question_version_id: string;
  workbook_row: string;
  format: string;
  publication_status: "STAGED" | "PUBLISHED";
  active?: boolean;
  on_calibration_blueprint?: boolean;
};

type ActionLine = {
  question_version_id: string;
  outcome: "PUBLISHED" | "PAUSED" | "RESUMED" | "REJECTED";
  reason: string | null;
};

type StatusFilter = "ALL" | "STAGED" | "PUBLISHED" | "PAUSED";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "STAGED", label: "Staged" },
  { id: "PUBLISHED", label: "Published" },
  { id: "PAUSED", label: "Paused" },
];

type ActionResponse = {
  ok?: boolean;
  reason?: string | null;
  error?: string;
  lines?: ActionLine[];
};

function isPauseable(question: ImportedQuestion): boolean {
  return question.publication_status === "PUBLISHED" && question.active !== false;
}

function isResumable(question: ImportedQuestion): boolean {
  return question.publication_status === "PUBLISHED" && question.active === false;
}

function statusOf(question: ImportedQuestion): Exclude<StatusFilter, "ALL"> {
  if (question.publication_status === "STAGED") {
    return "STAGED";
  }
  return question.active === false ? "PAUSED" : "PUBLISHED";
}

function statusLabel(question: ImportedQuestion): string {
  const status = statusOf(question);
  return FILTERS.find((filter) => filter.id === status)?.label ?? status;
}

function poolLabel(question: ImportedQuestion): string {
  return question.on_calibration_blueprint ? "Calibration" : "Practice";
}

export function ImportedQuestionsTable({
  questions,
}: {
  questions: ImportedQuestion[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ActionLine[]>([]);

  const stagedIds = useMemo(
    () =>
      questions
        .filter((question) => question.publication_status === "STAGED")
        .map((question) => question.question_version_id),
    [questions],
  );
  const pauseableIds = useMemo(
    () =>
      questions
        .filter((question) => isPauseable(question))
        .map((question) => question.question_version_id),
    [questions],
  );
  const resumableIds = useMemo(
    () =>
      questions
        .filter((question) => isResumable(question))
        .map((question) => question.question_version_id),
    [questions],
  );
  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      ALL: questions.length,
      STAGED: 0,
      PUBLISHED: 0,
      PAUSED: 0,
    };
    for (const question of questions) {
      result[statusOf(question)] += 1;
    }
    return result;
  }, [questions]);
  const visible = useMemo(
    () =>
      filter === "ALL"
        ? questions
        : questions.filter((question) => statusOf(question) === filter),
    [questions, filter],
  );
  const visibleIds = useMemo(
    () => visible.map((question) => question.question_version_id),
    [visible],
  );
  const lineById = useMemo(
    () => new Map(lines.map((line) => [line.question_version_id, line])),
    [lines],
  );
  const selectedVisibleCount = visibleIds.filter((id) =>
    selected.includes(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  if (questions.length === 0) {
    return null;
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllVisible() {
    setSelected((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return [...new Set([...current, ...visibleIds])];
    });
  }

  function chooseFilter(next: StatusFilter) {
    setFilter(next);
    setSelected([]);
  }

  async function postAction(
    path: string,
    ids: string[],
    successMessage: string,
    emptyMessage: string,
  ) {
    if (ids.length === 0) {
      setMessage(emptyMessage);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_version_ids: ids }),
      });
      const payload = (await response.json()) as ActionResponse;
      setLines(payload.lines ?? []);
      if (payload.ok) {
        setMessage(successMessage);
        setSelected([]);
        router.refresh();
        return;
      }
      setMessage(payload.reason ?? payload.error ?? emptyMessage);
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    await postAction(
      "/api/question-publishes",
      selected.filter((id) => stagedIds.includes(id)),
      "Selected questions are published. Learners still do not see them.",
      "Nothing was published.",
    );
  }

  async function pause() {
    await postAction(
      "/api/question-pauses",
      selected.filter((id) => pauseableIds.includes(id)),
      "Selected questions are paused. They are no longer eligible. Learners still do not see them.",
      "Nothing was paused.",
    );
  }

  async function resume() {
    await postAction(
      "/api/question-resumes",
      selected.filter((id) => resumableIds.includes(id)),
      "Selected questions are resumed. They are eligible again. Learners still do not see them.",
      "Nothing was resumed.",
    );
  }

  async function setCalibration() {
    await postAction(
      "/api/calibration-blueprints",
      selected,
      "Those 35 questions are the Calibration set. Ordinary Practice will not use them. Learners still do not see them.",
      "Select exactly 35 imported questions.",
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-[#163A59]">Imported questions</h2>
      <p className="mt-2 text-base leading-7 text-[#24313A]">
        {questions.length} question {questions.length === 1 ? "version" : "versions"}{" "}
        in the bank. Select staged versions to publish, published versions to
        pause, paused versions to resume, or exactly 35 versions as the
        Calibration set. Learners still do not see questions.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || selected.every((id) => !stagedIds.includes(id))}
          onClick={() => void publish()}
          className="inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
        >
          {busy ? "Working…" : "Publish selected"}
        </button>
        <button
          type="button"
          disabled={busy || selected.every((id) => !pauseableIds.includes(id))}
          onClick={() => void pause()}
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#0B7F86] bg-white px-5 text-base font-medium text-[#0B7F86] hover:bg-[#F7F9FA] disabled:opacity-60"
        >
          {busy ? "Working…" : "Pause selected"}
        </button>
        <button
          type="button"
          disabled={busy || selected.every((id) => !resumableIds.includes(id))}
          onClick={() => void resume()}
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#0B7F86] bg-white px-5 text-base font-medium text-[#0B7F86] hover:bg-[#F7F9FA] disabled:opacity-60"
        >
          {busy ? "Working…" : "Resume selected"}
        </button>
        <button
          type="button"
          disabled={busy || selected.length !== 35}
          onClick={() => void setCalibration()}
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#163A59] bg-white px-5 text-base font-medium text-[#163A59] hover:bg-[#F7F9FA] disabled:opacity-60"
        >
          {busy ? "Working…" : "Set selected as Calibration"}
        </button>
      </div>
      {message ? (
        <p className="mt-4 text-base leading-7 text-[#24313A]" role="status">
          {message}
        </p>
      ) : null}
      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Show questions by status"
      >
        {FILTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={filter === option.id}
            onClick={() => chooseFilter(option.id)}
            className={`inline-flex min-h-[40px] items-center rounded-[10px] border px-4 text-sm font-medium ${
              filter === option.id
                ? "border-[#163A59] bg-[#163A59] text-white"
                : "border-[#D9E1E5] bg-white text-[#163A59] hover:bg-[#F7F9FA]"
            }`}
          >
            {option.label} ({counts[option.id]})
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-[#24313A]">
        {selected.length} selected
      </p>
      <div className="mt-2 max-h-[480px] overflow-auto rounded-[10px] border border-[#D9E1E5] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#F7F9FA] text-[#163A59]">
            <tr>
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all shown questions"
                  title="Select all shown questions"
                  checked={allVisibleSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someVisibleSelected;
                    }
                  }}
                  disabled={visibleIds.length === 0}
                  onChange={toggleAllVisible}
                />
              </th>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Question version</th>
              <th className="px-3 py-2 font-medium">Permanent item</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Pool</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((question) => {
              const line = lineById.get(question.question_version_id);
              const status =
                line?.outcome === "REJECTED" && line.reason
                  ? line.reason
                  : statusLabel(question);
              return (
                <tr
                  key={question.question_version_id}
                  className="border-t border-[#D9E1E5]"
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      aria-label={`Select ${question.question_version_id}`}
                      checked={selected.includes(question.question_version_id)}
                      onChange={() => toggle(question.question_version_id)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">{question.workbook_row}</td>
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {question.question_version_id}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {question.question_id}
                  </td>
                  <td className="px-3 py-2 align-top">{question.format}</td>
                  <td className="px-3 py-2 align-top">{poolLabel(question)}</td>
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
