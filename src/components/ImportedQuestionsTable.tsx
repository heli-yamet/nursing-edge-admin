"use client";

import { useRouter } from "next/navigation";
import { useImportFocus } from "@/components/import-focus";
import { QuestionDetailDialog } from "@/components/QuestionDetailDialog";
import { adminFetch, readAdminToken } from "@/lib/admin-session";
import { useEffect, useMemo, useState } from "react";

type ImportedQuestion = {
  question_id: string;
  question_version_id: string;
  workbook_row: string;
  format: string;
  publication_status: "STAGED" | "PUBLISHED";
  active?: boolean;
  on_calibration_blueprint?: boolean;
  role?: string | null;
};

type ActionLine = {
  question_version_id: string;
  outcome: "PUBLISHED" | "PAUSED" | "RESUMED" | "DELETED" | "REJECTED";
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
  if (question.on_calibration_blueprint) {
    return "Calibration";
  }
  if (question.role === "AP_REINFORCEMENT") {
    return "Physiology";
  }
  if (question.role === "CLINICAL_SIBLING_RESERVED") {
    return "Clinical";
  }
  return "Practice";
}

export function ImportedQuestionsTable({
  questions,
}: {
  questions: ImportedQuestion[];
}) {
  const router = useRouter();
  const focus = useImportFocus();
  const highlighted = focus?.highlightedQuestionVersionId ?? null;
  const [selected, setSelected] = useState<string[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lines, setLines] = useState<ActionLine[]>([]);
  const [detailVersionId, setDetailVersionId] = useState<string | null>(null);

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
  useEffect(() => {
    if (!highlighted) {
      return;
    }
    const match = questions.find(
      (question) => question.question_version_id === highlighted,
    );
    if (match && filter !== "ALL" && statusOf(match) !== filter) {
      setFilter("ALL");
    }
  }, [highlighted, questions, filter]);

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

  useEffect(() => {
    if (!highlighted) {
      return;
    }
    const row = document.getElementById(`imported-question-${highlighted}`);
    if (!row) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      row.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [highlighted, visible]);
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
    if (!readAdminToken()) {
      setMessage("Sign in again before changing questions.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await adminFetch(path, {
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
      "/api/admin/question-publishes",
      selected.filter((id) => stagedIds.includes(id)),
      "Selected questions are published. Learners still do not see them.",
      "Nothing was published.",
    );
  }

  async function pause() {
    await postAction(
      "/api/admin/question-pauses",
      selected.filter((id) => pauseableIds.includes(id)),
      "Selected questions are paused. They are no longer eligible. Learners still do not see them.",
      "Nothing was paused.",
    );
  }

  async function resume() {
    await postAction(
      "/api/admin/question-resumes",
      selected.filter((id) => resumableIds.includes(id)),
      "Selected questions are resumed. They are eligible again. Learners still do not see them.",
      "Nothing was resumed.",
    );
  }

  async function removeSelected() {
    const ids = selected.filter((id) => stagedIds.includes(id));
    if (ids.length === 0) {
      setMessage("Nothing was deleted.");
      return;
    }
    const noun = ids.length === 1 ? "staged question" : "staged questions";
    const confirmed = window.confirm(
      `Delete ${ids.length} ${noun}? Published questions stay in the bank.`,
    );
    if (!confirmed) {
      return;
    }
    await postAction(
      "/api/admin/question-deletes",
      ids,
      "Selected staged questions are deleted. Published questions stay in the bank.",
      "Nothing was deleted.",
    );
  }

  async function setCalibration() {
    await postAction(
      "/api/admin/calibration-blueprints",
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
        in the bank. Select staged versions to publish or delete, published
        versions to pause, paused versions to resume, or exactly 35 versions as
        the Calibration set. Learners still do not see questions.
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
          disabled={busy || selected.every((id) => !stagedIds.includes(id))}
          onClick={() => void removeSelected()}
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#8C3A3A] bg-white px-5 text-base font-medium text-[#8C3A3A] hover:bg-[#F7F9FA] disabled:opacity-60"
        >
          {busy ? "Working…" : "Delete selected"}
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
              <th className="px-3 py-2 font-medium">Question version</th>
              <th className="px-3 py-2 font-medium">Permanent item</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Pool</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">
                <span className="sr-only">Details</span>
              </th>
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
                  id={`imported-question-${question.question_version_id}`}
                  className={`border-t border-[#D9E1E5] ${
                    highlighted === question.question_version_id
                      ? "bg-[#FFF6D8]"
                      : ""
                  }`}
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      aria-label={`Select ${question.question_version_id}`}
                      checked={selected.includes(question.question_version_id)}
                      onChange={() => toggle(question.question_version_id)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {question.question_version_id}
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {question.question_id}
                  </td>
                  <td className="px-3 py-2 align-top">{question.format}</td>
                  <td className="px-3 py-2 align-top">{poolLabel(question)}</td>
                  <td className="px-3 py-2 align-top">{status}</td>
                  <td className="px-3 py-2 align-top">
                    <button
                      type="button"
                      aria-label={`Details for ${question.question_version_id}`}
                      onClick={() => setDetailVersionId(question.question_version_id)}
                      className="inline-flex items-center justify-center px-2 text-base font-medium tracking-widest text-[#163A59] hover:text-[#0B7F86]"
                    >
                      ...
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <QuestionDetailDialog
        questionVersionId={detailVersionId}
        onClose={() => setDetailVersionId(null)}
      />
    </section>
  );
}
