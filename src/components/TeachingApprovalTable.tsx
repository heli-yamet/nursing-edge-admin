"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterMenu } from "@/components/FilterMenu";
import { useImportFocus } from "@/components/import-focus";
import { adminFetch, readAdminToken } from "@/lib/admin-session";

export type AdminTeachingRow = {
  teaching_id: string;
  teaching_revision: number;
  question_version: string;
  permanent_item_id: string;
  workbook_status: string;
  decision: "unapproved" | "approved" | "banned";
  admin_id: string | null;
  acted_at: string | null;
};

type DecisionFilter = "ALL" | "unapproved" | "approved" | "banned";

const DECISION_FILTERS: { id: DecisionFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "unapproved", label: "Unapproved" },
  { id: "approved", label: "Approved" },
  { id: "banned", label: "Banned" },
];

function QuestionJump({
  questionVersionId,
}: {
  questionVersionId: string;
}) {
  const focus = useImportFocus();
  if (!questionVersionId || !focus) {
    return <span className="font-mono text-xs">{questionVersionId}</span>;
  }
  return (
    <button
      type="button"
      className="font-mono text-xs underline decoration-[#163A59] underline-offset-2 hover:text-[#0B7F86]"
      onClick={() => focus.showQuestion(questionVersionId)}
    >
      {questionVersionId}
    </button>
  );
}

function rowKey(row: AdminTeachingRow): string {
  return `${row.teaching_id}:${row.teaching_revision}`;
}

function statusLabel(status: string): string {
  if (status === "REVIEWED_CANDIDATE_NOT_APPROVED") {
    return "Candidate";
  }
  return status || "—";
}

function decisionLabel(decision: AdminTeachingRow["decision"]): string {
  if (decision === "approved") {
    return "Approved";
  }
  if (decision === "banned") {
    return "Banned";
  }
  return "Unapproved";
}

function formatActedAt(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function TeachingApprovalTable({
  teachings,
  loadError,
}: {
  teachings: AdminTeachingRow[];
  loadError: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [decision, setDecision] = useState<DecisionFilter>("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const visible = useMemo(
    () =>
      teachings.filter((row) => {
        if (decision !== "ALL" && row.decision !== decision) {
          return false;
        }
        return true;
      }),
    [teachings, decision],
  );
  const visibleIds = visible.map(rowKey);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const someVisibleSelected =
    !allVisibleSelected && visibleIds.some((id) => selected.includes(id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
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

  function chooseDecision(next: DecisionFilter) {
    setDecision(next);
    setSelected([]);
  }

  async function act(action: "approve" | "ban") {
    const chosen = teachings.filter((row) => selected.includes(rowKey(row)));
    if (chosen.length === 0) {
      setMessage("Select teaching rows.");
      return;
    }
    if (!readAdminToken()) {
      setMessage("Sign in again before changing teaching.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await adminFetch("/api/admin/teaching-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          teachings: chosen.map((row) => ({
            teaching_id: row.teaching_id,
            teaching_revision: row.teaching_revision,
          })),
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        reason?: string | null;
        error?: string;
      };
      if (payload.ok) {
        setMessage(
          action === "approve"
            ? `Approved ${chosen.length} ${chosen.length === 1 ? "row" : "rows"}.`
            : `Banned ${chosen.length} ${chosen.length === 1 ? "row" : "rows"}.`,
        );
        setSelected([]);
        router.refresh();
        return;
      }
      setMessage(
        payload.reason ?? payload.error ?? "Could not update teaching.",
      );
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="pt-6 text-xl font-semibold text-[#163A59]">
        Pre-commit teaching
      </h1>
      <p className="mt-2 text-base leading-7 text-[#24313A]">
        {teachings.length} stored{" "}
        {teachings.length === 1 ? "row" : "rows"}. Approve records you, that
        revision, and the time. Interview uses only an approved revision for the
        served question version. Imported candidates stay unapproved until you
        act.
      </p>
      {loadError ? (
        <p className="mt-4 text-base leading-7 text-[#8C3A3A]" role="status">
          {loadError}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || selected.length === 0}
          onClick={() => void act("approve")}
          className="inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
        >
          {busy ? "Working…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={busy || selected.length === 0}
          onClick={() => void act("ban")}
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#8C3A3A] bg-white px-5 text-base font-medium text-[#8C3A3A] hover:bg-[#F7F9FA] disabled:opacity-60"
        >
          {busy ? "Working…" : "Ban"}
        </button>
      </div>
      {message ? (
        <p className="mt-4 text-base leading-7 text-[#24313A]" role="status">
          {message}
        </p>
      ) : null}
      <p className="mt-6 text-sm text-[#24313A]">{selected.length} selected</p>
      <div className="mt-2 rounded-[10px] border border-[#D9E1E5] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#F7F9FA] text-[#163A59]">
            <tr>
              <th className="px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all shown teaching rows"
                  title="Select all shown teaching rows"
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
              <th className="px-3 py-2 font-medium">Teaching</th>
              <th className="px-3 py-2 font-medium">Revision</th>
              <th className="px-3 py-2 font-medium">Question version</th>
              <th className="px-3 py-2 font-medium">Permanent item</th>
              <th className="px-3 py-2 font-medium">Workbook</th>
              <th className="px-3 py-2 font-medium">
                <FilterMenu
                  label="Status"
                  value={decision}
                  options={DECISION_FILTERS}
                  onChange={chooseDecision}
                />
              </th>
              <th className="px-3 py-2 font-medium">Admin</th>
              <th className="px-3 py-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const id = rowKey(row);
              return (
                <tr key={id} className="border-t border-[#D9E1E5]">
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.teaching_id} revision ${row.teaching_revision}`}
                      checked={selected.includes(id)}
                      onChange={() => toggle(id)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {row.teaching_id}
                  </td>
                  <td className="px-3 py-2 align-top">{row.teaching_revision}</td>
                  <td className="px-3 py-2 align-top">
                    <QuestionJump questionVersionId={row.question_version} />
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs">
                    {row.permanent_item_id}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {statusLabel(row.workbook_status)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {decisionLabel(row.decision)}
                  </td>
                  <td className="px-3 py-2 align-top" title={row.admin_id ?? ""}>
                    {row.admin_id ?? ""}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {formatActedAt(row.acted_at)}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-[#24313A]" colSpan={9}>
                  No teaching rows to show.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
