"use client";

import { useState } from "react";
import { adminFetch, readAdminToken } from "@/lib/admin-session";

function sessionTypeLabel(type: string): string {
  if (type === "REVIEW") {
    return "Review";
  }
  if (type === "CALIBRATION") {
    return "Calibration";
  }
  return "Practice";
}

type TimelineInterview = {
  delivery_id: string;
  label: string;
  delivered_at: string;
};

type TimelineAttempt = {
  kind: "attempt";
  at: string;
  attempt_id: string;
  session_id: string;
  session_type: string;
  position: number;
  question_label: string;
  correct: boolean;
  confidence: string;
  six_state_label: string;
  review_effect: string | null;
  cycle_id: string | null;
  interviews: TimelineInterview[];
  question_id: string;
  question_version_id: string;
};

type TimelineSkip = {
  kind: "support_skip";
  at: string;
  session_id: string;
  position: number;
  question_label: string;
  summary: string;
  cycle_id: string | null;
};

type TimelineEntry = TimelineAttempt | TimelineSkip;

type LearnerPayload = {
  learner_id: string;
  email: string;
  first_name: string;
  created_at: string;
  access_summary: string;
  calibration_summary: string;
  activity: {
    practice_sessions: number;
    review_sessions: number;
    calibration_sessions: number;
    committed_attempts: number;
    active_review_cycles: number;
    completed_review_cycles: number;
  };
  timeline: TimelineEntry[];
};

type ReviewTrace = {
  cycle_id: string;
  question_id: string;
  stage: string;
  state: string;
  due_at: string;
  active_window_expires_at: string;
  paused_duration_ms: number;
  paused_at: string | null;
  rule_set_version: string;
  triggering_attempt_id: string;
  triggering_six_state: string;
  closure_reason: string | null;
  source_attempt: {
    attempt_id: string;
    committed_at: string;
    six_state: string;
    session_type: string;
  } | null;
  transitions: {
    transition_id: string;
    attempt_id: string;
    occurred_at: string;
    from_stage: string | null;
    to_stage: string | null;
    reason: string;
    effect: string | null;
  }[];
  sessions: {
    session_id: string;
    created_at: string;
    state: string;
    order_seed: string | null;
    assignments: {
      position: number;
      question_version_id: string;
      kind_label: string;
      cycle_id: string | null;
      matches_trace_cycle: boolean;
    }[];
    deferred_owners: {
      cycle_id: string;
      stage: string;
      due_at: string;
      reason_label: string;
      matches_trace_cycle?: boolean;
    }[];
  }[];
};

function whenLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function LearnersPanel() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [learner, setLearner] = useState<LearnerPayload | null>(null);
  const [trace, setTrace] = useState<ReviewTrace | null>(null);
  const [traceBusy, setTraceBusy] = useState(false);
  const [showIds, setShowIds] = useState(false);

  async function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setLearner(null);
    setTrace(null);
    try {
      if (!readAdminToken()) {
        setMessage("Sign in again before searching.");
        return;
      }
      const params = new URLSearchParams({ email: email.trim() });
      const response = await adminFetch(`/api/admin/learners?${params}`);
      const payload = (await response.json()) as {
        ok?: boolean;
        reason?: string;
        error?: string;
        learner?: LearnerPayload;
      };
      if (!payload.ok || !payload.learner) {
        setMessage(payload.reason ?? payload.error ?? "Could not load that learner.");
        return;
      }
      setLearner(payload.learner);
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function openTrace(cycleId: string) {
    if (!learner) {
      return;
    }
    setTraceBusy(true);
    setTrace(null);
    try {
      const params = new URLSearchParams({
        learner_id: learner.learner_id,
        cycle_id: cycleId,
      });
      const response = await adminFetch(`/api/admin/review-trace?${params}`);
      const payload = (await response.json()) as {
        ok?: boolean;
        reason?: string;
        trace?: ReviewTrace;
      };
      if (!payload.ok || !payload.trace) {
        setMessage(payload.reason ?? "Could not load Review Trace.");
        return;
      }
      setTrace(payload.trace);
    } catch {
      setMessage("Could not load Review Trace.");
    } finally {
      setTraceBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSearch} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-[#163A59]">
          Learner email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-[48px] rounded-[10px] border border-[#D9E1E5] px-3 text-base font-normal text-[#24313A]"
            autoComplete="off"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-[48px] rounded-[10px] bg-[#0B7F86] px-5 text-base font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      {message ? (
        <p className="text-base text-[#8B2E2E]" role="status">
          {message}
        </p>
      ) : null}

      {learner ? (
        <section className="flex flex-col gap-6">
          <div className="rounded-[10px] border border-[#D9E1E5] bg-white p-5">
            <h2 className="text-xl font-semibold text-[#163A59]">
              {learner.first_name || learner.email}
            </h2>
            <p className="mt-1 text-base text-[#24313A]">{learner.email}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-[#66727A]">Access</dt>
                <dd className="text-base text-[#24313A]">{learner.access_summary}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#66727A]">Calibration</dt>
                <dd className="text-base text-[#24313A]">
                  {learner.calibration_summary}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#66727A]">Practice sessions</dt>
                <dd className="text-base text-[#24313A]">
                  {learner.activity.practice_sessions}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#66727A]">Review sessions</dt>
                <dd className="text-base text-[#24313A]">
                  {learner.activity.review_sessions}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#66727A]">Committed attempts</dt>
                <dd className="text-base text-[#24313A]">
                  {learner.activity.committed_attempts}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-[#66727A]">Review cycles</dt>
                <dd className="text-base text-[#24313A]">
                  {learner.activity.active_review_cycles} active,{" "}
                  {learner.activity.completed_review_cycles} complete
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setShowIds((value) => !value)}
              className="mt-4 text-sm font-medium text-[#0B7F86] underline"
            >
              {showIds ? "Hide technical ids" : "Show technical ids"}
            </button>
            {showIds ? (
              <p className="mt-2 font-mono text-xs text-[#66727A]">
                learner_id: {learner.learner_id}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[#163A59]">Activity timeline</h3>
            {learner.timeline.length === 0 ? (
              <p className="mt-2 text-base text-[#66727A]">No committed activity yet.</p>
            ) : (
              <ol className="mt-4 flex flex-col gap-3">
                {learner.timeline.map((entry) =>
                  entry.kind === "support_skip" ? (
                    <li
                      key={`skip-${entry.session_id}-${entry.position}`}
                      className="rounded-[10px] border border-[#D9E1E5] bg-[#F7F9FA] p-4"
                    >
                      <p className="text-sm text-[#66727A]">{whenLabel(entry.at)}</p>
                      <p className="mt-1 font-medium text-[#163A59]">Physiology support skipped</p>
                      <p className="mt-1 text-base text-[#24313A]">{entry.summary}</p>
                      <p className="mt-2 text-sm text-[#24313A]">{entry.question_label}</p>
                    </li>
                  ) : (
                    <li
                      key={entry.attempt_id}
                      className="rounded-[10px] border border-[#D9E1E5] bg-white p-4"
                    >
                      <p className="text-sm text-[#66727A]">{whenLabel(entry.at)}</p>
                      <p className="mt-1 text-base text-[#24313A]">
                        {sessionTypeLabel(entry.session_type)} ·{" "}
                        {entry.correct ? "Correct" : "Incorrect"} ·{" "}
                        {entry.six_state_label}
                      </p>
                      <p className="mt-2 text-sm text-[#24313A]">{entry.question_label}</p>
                      {entry.review_effect ? (
                        <p className="mt-2 text-sm font-medium text-[#08666C]">
                          {entry.review_effect}
                        </p>
                      ) : null}
                      {entry.interviews.length > 0 ? (
                        <ul className="mt-2 list-disc pl-5 text-sm text-[#24313A]">
                          {entry.interviews.map((step) => (
                            <li key={step.delivery_id}>
                              {step.label} · {whenLabel(step.delivered_at)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {entry.cycle_id ? (
                        <button
                          type="button"
                          disabled={traceBusy}
                          onClick={() => openTrace(entry.cycle_id!)}
                          className="mt-3 text-sm font-semibold text-[#0B7F86] underline disabled:opacity-60"
                        >
                          Review Trace
                        </button>
                      ) : null}
                      {showIds ? (
                        <p className="mt-2 font-mono text-xs text-[#66727A]">
                          attempt {entry.attempt_id} · version {entry.question_version_id}
                        </p>
                      ) : null}
                    </li>
                  ),
                )}
              </ol>
            )}
          </div>
        </section>
      ) : null}

      {trace ? (
        <section className="rounded-[10px] border border-[#0B7F86] bg-[#E8F5F5] p-5">
          <h3 className="text-lg font-semibold text-[#163A59]">Review Trace</h3>
          <p className="mt-2 text-base text-[#24313A]">
            {trace.stage} · {trace.state} · rule set {trace.rule_set_version}
          </p>
          <p className="mt-1 text-sm text-[#24313A]">
            Due {whenLabel(trace.due_at)} · active window ends{" "}
            {whenLabel(trace.active_window_expires_at)}
          </p>
          {trace.paused_duration_ms > 0 || trace.paused_at ? (
            <p className="mt-1 text-sm text-[#24313A]">
              Pause extension {trace.paused_duration_ms} ms
              {trace.paused_at ? ` · paused at ${whenLabel(trace.paused_at)}` : ""}
            </p>
          ) : null}
          {trace.closure_reason ? (
            <p className="mt-2 text-sm text-[#24313A]">
              Outcome: {trace.closure_reason}
            </p>
          ) : null}
          {trace.source_attempt ? (
            <p className="mt-3 text-sm text-[#24313A]">
              Source attempt ({trace.source_attempt.session_type}):{" "}
              {trace.source_attempt.six_state} at{" "}
              {whenLabel(trace.source_attempt.committed_at)}
            </p>
          ) : null}
          {trace.transitions.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-[#163A59]">Transitions</h4>
              <ul className="mt-2 flex flex-col gap-2">
                {trace.transitions.map((row) => (
                  <li key={row.transition_id} className="text-sm text-[#24313A]">
                    {whenLabel(row.occurred_at)}
                    {row.effect ? ` · ${row.effect}` : ""}
                    {showIds ? (
                      <span className="block font-mono text-xs text-[#66727A]">
                        {row.transition_id}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {trace.sessions.length > 0 ? (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-[#163A59]">Review sessions</h4>
              {trace.sessions.map((session) => (
                <div
                  key={session.session_id}
                  className="mt-3 rounded-[8px] border border-[#D9E1E5] bg-white p-3"
                >
                  <p className="text-sm text-[#24313A]">
                    Started {whenLabel(session.created_at)} · {session.state}
                  </p>
                  {session.order_seed ? (
                    <p className="mt-1 font-mono text-xs text-[#66727A]">
                      order seed: {session.order_seed}
                    </p>
                  ) : null}
                  <ol className="mt-2 list-decimal pl-5 text-sm text-[#24313A]">
                    {session.assignments.map((row) => (
                      <li key={row.position}>
                        {row.kind_label}
                        {row.matches_trace_cycle ? " (this cycle)" : ""}
                        {showIds ? (
                          <span className="block font-mono text-xs text-[#66727A]">
                            {row.question_version_id}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  {session.deferred_owners.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#66727A]">
                        Due but not selected
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-[#24313A]">
                        {session.deferred_owners.map((row) => (
                          <li key={row.cycle_id}>
                            {row.stage} due {whenLabel(row.due_at)} · {row.reason_label}
                            {row.cycle_id === trace.cycle_id ? " (this cycle)" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          {showIds ? (
            <p className="mt-3 font-mono text-xs text-[#66727A]">cycle_id: {trace.cycle_id}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
