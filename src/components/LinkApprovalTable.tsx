"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FilterMenu } from "@/components/FilterMenu";
import { useImportFocus } from "@/components/import-focus";
import { adminFetch, readAdminToken } from "@/lib/admin-session";

export type AdminLinkRow = {
  link_kind: "transfer" | "support";
  link_id: string;
  link_revision: number;
  workbook_status: string;
  from_ref: string;
  to_ref: string;
  from_question_version: string | null;
  to_question_version: string | null;
  decision: "unapproved" | "approved" | "banned";
  admin_id: string | null;
  acted_at: string | null;
};

type KindFilter = "ALL" | "transfer" | "support";
type DecisionFilter = "ALL" | "unapproved" | "approved" | "banned";

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "transfer", label: "Clinical" },
  { id: "support", label: "Physiology" },
];

const DECISION_FILTERS: { id: DecisionFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "unapproved", label: "Unapproved" },
  { id: "approved", label: "Approved" },
  { id: "banned", label: "Banned" },
];

function QuestionJump({
  label,
  questionVersionId,
}: {
  label: string;
  questionVersionId: string | null;
}) {
  const focus = useImportFocus();
  if (!label) {
    return null;
  }
  if (!questionVersionId || !focus) {
    return <>{label}</>;
  }
  return (
    <button
      type="button"
      className="underline decoration-[#163A59] underline-offset-2 hover:text-[#0B7F86]"
      onClick={() => focus.showQuestion(questionVersionId)}
    >
      {label}
    </button>
  );
}

function rowKey(row: AdminLinkRow): string {
  return `${row.link_kind}:${row.link_id}:${row.link_revision}`;
}

function kindLabel(kind: AdminLinkRow["link_kind"]): string {
  return kind === "transfer" ? "Clinical" : "Physiology";
}

function statusLabel(status: string): string {
  if (status === "REVIEWED_CANDIDATE_NOT_APPROVED") {
    return "Candidate";
  }
  if (status === "RETIRED_NOT_APPROVED") {
    return "Retired";
  }
  return status || "—";
}

function decisionLabel(decision: AdminLinkRow["decision"]): string {
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

export function LinkApprovalTable({
  links,
  loadError,
}: {
  links: AdminLinkRow[];
  loadError: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [kind, setKind] = useState<KindFilter>("ALL");
  const [decision, setDecision] = useState<DecisionFilter>("ALL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const visible = useMemo(
    () =>
      links.filter((link) => {
        if (kind !== "ALL" && link.link_kind !== kind) {
          return false;
        }
        if (decision !== "ALL" && link.decision !== decision) {
          return false;
        }
        return true;
      }),
    [links, kind, decision],
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

  function chooseKind(next: KindFilter) {
    setKind(next);
    setSelected([]);
  }

  function chooseDecision(next: DecisionFilter) {
    setDecision(next);
    setSelected([]);
  }

  async function act(action: "approve" | "ban") {
    const chosen = links.filter((link) => selected.includes(rowKey(link)));
    if (chosen.length === 0) {
      setMessage("Select links.");
      return;
    }
    if (!readAdminToken()) {
      setMessage("Sign in again before changing links.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await adminFetch("/api/admin/link-decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          links: chosen.map((link) => ({
            link_kind: link.link_kind,
            link_id: link.link_id,
            link_revision: link.link_revision,
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
            ? `Approved ${chosen.length} ${chosen.length === 1 ? "link" : "links"}.`
            : `Banned ${chosen.length} ${chosen.length === 1 ? "link" : "links"}.`,
        );
        setSelected([]);
        router.refresh();
        return;
      }
      setMessage(payload.reason ?? payload.error ?? "Could not update links.");
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h1 className="pt-6 text-xl font-semibold text-[#163A59]">
        Imported links
      </h1>
      <p className="mt-2 text-base leading-7 text-[#24313A]">
        {links.length} stored {links.length === 1 ? "link" : "links"}. Clinical
        rows show map ids. Physiology rows show question versions. Approve
        records you, that revision, and the time. Ban clears that approval and
        records the ban. Other revisions stay as they are.
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
                  aria-label="Select all shown links"
                  title="Select all shown links"
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
              <th className="px-3 py-2 font-medium">
                <FilterMenu
                  label="Kind"
                  value={kind}
                  options={KIND_FILTERS}
                  onChange={chooseKind}
                />
              </th>
              <th className="px-3 py-2 font-medium">Link</th>
              <th className="px-3 py-2 font-medium">Revision</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">To</th>
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
            {visible.map((link) => {
              const id = rowKey(link);
              return (
                <tr key={id} className="border-t border-[#D9E1E5]">
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      aria-label={`Select ${link.link_id} revision ${link.link_revision}`}
                      checked={selected.includes(id)}
                      onChange={() => toggle(id)}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">{kindLabel(link.link_kind)}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {link.link_id}
                  </td>
                  <td className="px-3 py-2 align-top">{link.link_revision}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    <QuestionJump
                      label={link.from_ref}
                      questionVersionId={link.from_question_version}
                    />
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    <QuestionJump
                      label={link.to_ref}
                      questionVersionId={link.to_question_version}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    {decisionLabel(link.decision)}
                  </td>
                  <td className="px-3 py-2 align-top" title={link.admin_id ?? ""}>
                    {link.admin_id ?? ""}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    {formatActedAt(link.acted_at)}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-[#24313A]" colSpan={10}>
                  No links to show.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
