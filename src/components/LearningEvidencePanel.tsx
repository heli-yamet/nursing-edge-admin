"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, readAdminToken } from "@/lib/admin-session";

type ResultCounts = {
  answered: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
};

type EvidenceRow = {
  attempt_id: string;
  learner_id: string;
  committed_at: string;
  session_type: string;
  format: string;
  topic_name: string | null;
  correct: boolean;
  confidence: string;
  six_state: string;
  review_outcome: string;
  role: string;
};

type TopicOption = {
  topic_id: string;
  name: string;
};

type EvidencePayload = {
  matched_attempts: number;
  clinical: ResultCounts;
  physiology: ResultCounts;
  rows: EvidenceRow[];
  topics: TopicOption[];
};

function defaultFromDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function accuracyLine(counts: ResultCounts): string {
  if (counts.answered <= 0) {
    return "No answers in this filter.";
  }
  const pct =
    counts.accuracy === null
      ? ""
      : ` (${Math.round(counts.accuracy * 100)}%)`;
  return `${counts.correct}/${counts.answered}${pct}`;
}

function whenLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function LearningEvidencePanel() {
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [topicId, setTopicId] = useState("");
  const [format, setFormat] = useState("");
  const [confidence, setConfidence] = useState("");
  const [sixState, setSixState] = useState("");
  const [sessionType, setSessionType] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState("ALL");
  const [topics, setTopics] = useState<TopicOption[]>([]);
  const [evidence, setEvidence] = useState<EvidencePayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!readAdminToken()) {
      setMessage("Sign in again to load learning evidence.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (from) {
        params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      }
      if (to) {
        params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      }
      if (topicId) {
        params.set("topic_id", topicId);
      }
      if (format) {
        params.set("format", format);
      }
      if (confidence) {
        params.set("confidence", confidence);
      }
      if (sixState) {
        params.set("six_state", sixState);
      }
      if (sessionType) {
        params.set("session_type", sessionType);
      }
      if (reviewOutcome) {
        params.set("review_outcome", reviewOutcome);
      }
      const response = await adminFetch(
        `/api/admin/learning-evidence?${params}`,
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        reason?: string;
        evidence?: EvidencePayload;
      };
      if (!payload.ok || !payload.evidence) {
        setEvidence(null);
        setMessage(payload.reason ?? "Could not load learning evidence.");
        return;
      }
      setEvidence(payload.evidence);
      if (payload.evidence.topics.length > 0) {
        setTopics(payload.evidence.topics);
      }
    } catch {
      setEvidence(null);
      setMessage("Could not load learning evidence.");
    } finally {
      setBusy(false);
    }
  }, [
    confidence,
    format,
    from,
    reviewOutcome,
    sessionType,
    sixState,
    to,
    topicId,
  ]);

  useEffect(() => {
    void load();
    // Initial load only; filters apply on button click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[16px] border border-[#D9E1E5] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#163A59]">Filters</h2>
        <p className="mt-2 text-sm leading-6 text-[#5C6B74]">
          Read-only view of committed attempts. Accuracy uses the same N/D
          formula as learner Results and Progress. Clinical and physiology
          counts stay separate.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Topic
            <select
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic.topic_id} value={topic.topic_id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              <option value="">All formats</option>
              <option value="MCQ">MCQ</option>
              <option value="SATA">SATA</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Confidence
            <select
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              <option value="">All</option>
              <option value="UNSURE">Unsure</option>
              <option value="SURE">Sure</option>
              <option value="CONFIDENT">Confident</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Six-state
            <select
              value={sixState}
              onChange={(event) => setSixState(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              <option value="">All</option>
              <option value="CORRECT_UNSURE">Correct and Unsure</option>
              <option value="CORRECT_SURE">Correct and Sure</option>
              <option value="CORRECT_CONFIDENT">Correct and Confident</option>
              <option value="INCORRECT_UNSURE">Incorrect and Unsure</option>
              <option value="INCORRECT_SURE">Incorrect and Sure</option>
              <option value="INCORRECT_CONFIDENT">Incorrect and Confident</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Session
            <select
              value={sessionType}
              onChange={(event) => setSessionType(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              <option value="">All sessions</option>
              <option value="PRACTICE">Practice</option>
              <option value="REVIEW">Review</option>
              <option value="CALIBRATION">Calibration</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Review outcome
            <select
              value={reviewOutcome}
              onChange={(event) => setReviewOutcome(event.target.value)}
              className="min-h-[44px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              <option value="ALL">All</option>
              <option value="NOT_APPLICABLE">Not Review</option>
              <option value="OPENED_REPAIR">Opened Repair</option>
              <option value="OPENED_CONFIRMATION">Opened Confirmation</option>
              <option value="ADVANCED">Advanced stage</option>
              <option value="COMPLETED">Completed cycle</option>
              <option value="REDIRECTED">Redirected</option>
              <option value="OTHER">Other Review</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="mt-4 inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
        >
          {busy ? "Loading…" : "Apply filters"}
        </button>
        {message ? (
          <p className="mt-3 text-sm text-[#B42318]" role="status">
            {message}
          </p>
        ) : null}
      </section>

      {evidence ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[16px] border border-[#D9E1E5] bg-white p-5">
              <h3 className="text-base font-semibold text-[#163A59]">
                Clinical evidence
              </h3>
              <p className="mt-2 text-sm text-[#5C6B74]">
                {evidence.matched_attempts} matching attempts overall.
              </p>
              <p className="mt-3 text-lg font-medium text-[#163A59]">
                Accuracy {accuracyLine(evidence.clinical)}
              </p>
            </div>
            <div className="rounded-[16px] border border-[#D9E1E5] bg-white p-5">
              <h3 className="text-base font-semibold text-[#163A59]">
                Physiology evidence
              </h3>
              <p className="mt-2 text-sm text-[#5C6B74]">
                Applied Pathophysiology answers only.
              </p>
              <p className="mt-3 text-lg font-medium text-[#163A59]">
                Accuracy {accuracyLine(evidence.physiology)}
              </p>
            </div>
          </section>

          <section className="overflow-x-auto rounded-[16px] border border-[#D9E1E5] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#D9E1E5] bg-[#F7F9FA] text-[#163A59]">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Session</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Topic</th>
                  <th className="px-4 py-3 font-semibold">Result</th>
                  <th className="px-4 py-3 font-semibold">Review outcome</th>
                </tr>
              </thead>
              <tbody>
                {evidence.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-[#5C6B74]"
                    >
                      No attempts match these filters.
                    </td>
                  </tr>
                ) : (
                  evidence.rows.map((row) => (
                    <tr
                      key={row.attempt_id}
                      className="border-b border-[#EEF2F4] text-[#24313A]"
                    >
                      <td className="px-4 py-3">{whenLabel(row.committed_at)}</td>
                      <td className="px-4 py-3">
                        {row.session_type} · {row.format}
                      </td>
                      <td className="px-4 py-3">{row.role}</td>
                      <td className="px-4 py-3">
                        {row.topic_name ?? "Unmapped"}
                      </td>
                      <td className="px-4 py-3">
                        {row.correct ? "Correct" : "Incorrect"} ·{" "}
                        {row.confidence.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        {row.review_outcome.replaceAll("_", " ")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}
