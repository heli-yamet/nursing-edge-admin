"use client";

import { useEffect, useState, type ReactNode } from "react";
import { adminFetch } from "@/lib/admin-session";

type DetailOption = {
  option_id: string;
  displayed_option: string;
  option_text: string;
  is_correct: boolean;
};

type DetailQuestion = {
  question_version_id: string;
  question_id: string;
  format: string;
  stem: string;
  options: DetailOption[];
};

type LinkedQuestion = DetailQuestion & {
  link_id: string;
  link_revision: number;
};

type VersionHistoryRow = {
  question_version_id: string;
  publication_status: "STAGED" | "PUBLISHED";
  active: boolean;
  current: boolean;
};

type QuestionAdminMeta = {
  question_version_id: string;
  question_id: string;
  format: string;
  runtime_role: string | null;
  publication_status: "STAGED" | "PUBLISHED";
  active: boolean;
  version_history: VersionHistoryRow[];
};

type OptionSelectionRow = {
  selected_option_ids: string[];
  count: number;
  rate: number | null;
  rate_label: string | null;
};

type QuestionUsage = {
  answered: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  confidence: Record<string, number>;
  six_state: Record<string, number>;
  option_selections: OptionSelectionRow[];
};

type QuestionDetail = {
  original: DetailQuestion[];
  clinical: LinkedQuestion[];
  physiology: LinkedQuestion[];
  meta?: QuestionAdminMeta;
  usage?: QuestionUsage;
};

export function QuestionDetailDialog({
  questionVersionId,
  onClose,
}: {
  questionVersionId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!questionVersionId) {
      return;
    }
    let cancelled = false;
    setDetail(null);
    setError("");
    const versionId = questionVersionId;
    void (async () => {
      try {
        const response = await adminFetch(
          `/api/admin/question-details?question_version_id=${encodeURIComponent(versionId)}`,
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          detail?: QuestionDetail;
          reason?: string;
          error?: string;
        };
        if (cancelled) {
          return;
        }
        if (!payload.ok || !payload.detail) {
          setError(payload.reason ?? payload.error ?? "Could not load this question.");
          return;
        }
        setDetail(payload.detail);
      } catch {
        if (!cancelled) {
          setError("Could not reach the server. Try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questionVersionId]);

  useEffect(() => {
    if (!questionVersionId) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [questionVersionId, onClose]);

  if (!questionVersionId) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#163A59]/40 px-4 py-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-detail-title"
        className="w-full max-w-3xl rounded-[16px] border border-[#D9E1E5] bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id="question-detail-title"
            className="text-xl font-semibold text-[#163A59]"
          >
            Question detail
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[40px] items-center rounded-[10px] border border-[#D9E1E5] px-4 text-sm font-medium text-[#163A59] hover:bg-[#F7F9FA]"
          >
            Close
          </button>
        </div>
        {error ? (
          <p className="mt-4 text-base leading-7 text-[#8C3A3A]" role="status">
            {error}
          </p>
        ) : null}
        {!detail && !error ? (
          <p className="mt-4 text-base leading-7 text-[#24313A]" role="status">
            Loading question…
          </p>
        ) : null}
        {detail ? (
          <div className="mt-6">
            {detail.meta ? (
              <DetailSection title="Identity and publication">
                <dl className="grid gap-2 text-sm text-[#24313A] sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-[#163A59]">Permanent item</dt>
                    <dd className="font-mono text-xs">{detail.meta.question_id}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#163A59]">Question version</dt>
                    <dd className="font-mono text-xs">
                      {detail.meta.question_version_id}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#163A59]">Format</dt>
                    <dd>{detail.meta.format}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#163A59]">Runtime role</dt>
                    <dd>{runtimeRoleLabel(detail.meta.runtime_role)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-[#163A59]">Publication</dt>
                    <dd>{publicationLabel(detail.meta)}</dd>
                  </div>
                </dl>
                {detail.meta.version_history.length > 1 ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-[#163A59]">
                      Version history
                    </p>
                    <ul className="mt-2 space-y-1 font-mono text-xs text-[#24313A]">
                      {detail.meta.version_history.map((row) => (
                        <li key={row.question_version_id}>
                          {row.question_version_id}
                          {row.current ? " · opened" : ""}
                          {" · "}
                          {row.publication_status === "PUBLISHED"
                            ? row.active
                              ? "Published"
                              : "Paused"
                            : "Staged"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </DetailSection>
            ) : null}
            {detail.usage ? (
              <DetailSection title="Learner usage (read-only)">
                <UsageSummary usage={detail.usage} />
              </DetailSection>
            ) : null}
            <DetailSection title="Original question">
              {detail.original.length === 0 ? (
                <p className="text-base leading-7 text-[#24313A]">
                  No original question is stored for this link.
                </p>
              ) : (
                detail.original.map((question) => (
                  <QuestionBlock
                    key={question.question_version_id}
                    question={question}
                  />
                ))
              )}
            </DetailSection>
            <DetailSection title="Clinical question">
              <LinkedQuestions
                empty="No clinical question is linked."
                questions={detail.clinical}
              />
            </DetailSection>
            <DetailSection title="Physiology question">
              <LinkedQuestions
                empty="No physiology question is linked."
                questions={detail.physiology}
              />
            </DetailSection>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#D9E1E5] py-6 first:border-t-0 first:pt-0">
      <h3 className="text-lg font-semibold text-[#163A59]">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LinkedQuestions({
  empty,
  questions,
}: {
  empty: string;
  questions: LinkedQuestion[];
}) {
  if (questions.length === 0) {
    return <p className="text-base leading-7 text-[#24313A]">{empty}</p>;
  }
  return (
    <div className="space-y-6">
      {questions.map((question) => (
        <div key={`${question.link_id}-${question.link_revision}-${question.question_version_id}`}>
          {question.link_id ? (
            <p className="text-sm text-[#163A59]">
              {question.link_id} revision {question.link_revision}
            </p>
          ) : null}
          <QuestionBlock question={question} />
        </div>
      ))}
    </div>
  );
}

function runtimeRoleLabel(role: string | null): string {
  if (role === "AP_REINFORCEMENT") {
    return "Physiology (AP reinforcement)";
  }
  if (role === "CLINICAL_SIBLING_RESERVED") {
    return "Clinical sibling (reserved)";
  }
  if (role === "CLINICAL_CORE") {
    return "Clinical core (Practice)";
  }
  return role ?? "Practice-eligible (no role row)";
}

function publicationLabel(meta: QuestionAdminMeta): string {
  if (meta.publication_status === "STAGED") {
    return "Staged";
  }
  return meta.active ? "Published" : "Paused";
}

function formatAccuracy(value: number | null): string {
  if (value === null) {
    return "—";
  }
  return `${Math.round(value * 100)}%`;
}

function UsageSummary({ usage }: { usage: QuestionUsage }) {
  if (usage.answered === 0) {
    return (
      <p className="text-base leading-7 text-[#24313A]">
        No committed attempts on this version yet.
      </p>
    );
  }
  return (
    <div className="space-y-4 text-sm text-[#24313A]">
      <p>
        {usage.answered} answered · {usage.correct} correct · accuracy{" "}
        {formatAccuracy(usage.accuracy)} ({usage.correct}/{usage.answered})
      </p>
      <div>
        <p className="font-medium text-[#163A59]">Confidence</p>
        <ul className="mt-1 list-disc pl-5">
          <li>Unsure: {usage.confidence.UNSURE ?? 0}</li>
          <li>Sure: {usage.confidence.SURE ?? 0}</li>
          <li>Confident: {usage.confidence.CONFIDENT ?? 0}</li>
        </ul>
      </div>
      <div>
        <p className="font-medium text-[#163A59]">Six-state</p>
        <ul className="mt-1 grid gap-1 sm:grid-cols-2">
          {Object.entries(usage.six_state).map(([state, count]) => (
            <li key={state}>
              {state}: {count}
            </li>
          ))}
        </ul>
      </div>
      {usage.option_selections.length > 0 ? (
        <div>
          <p className="font-medium text-[#163A59]">Option selections</p>
          <ul className="mt-2 space-y-2">
            {usage.option_selections.map((row) => (
              <li key={row.selected_option_ids.join(",")} className="font-mono text-xs">
                {row.selected_option_ids.join(", ") || "(none)"} · {row.count}
                {row.rate_label ? ` · ${row.rate_label}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function QuestionBlock({ question }: { question: DetailQuestion }) {
  return (
    <div className="mt-3">
      <p className="font-mono text-xs text-[#163A59]">
        {question.question_version_id}
      </p>
      <p className="mt-1 font-mono text-xs text-[#24313A]">{question.question_id}</p>
      <p className="mt-3 text-base leading-7 text-[#24313A]">{question.stem}</p>
      <ul className="mt-3 space-y-2">
        {question.options.map((option) => (
          <li key={option.option_id} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={option.is_correct}
              onChange={() => undefined}
              aria-label={
                option.is_correct
                  ? `Correct option ${option.displayed_option}`
                  : `Option ${option.displayed_option}`
              }
              className="mt-1"
            />
            <span className="text-base leading-7 text-[#24313A]">
              <span className="font-medium text-[#163A59]">
                {option.displayed_option}.
              </span>{" "}
              {option.option_text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
