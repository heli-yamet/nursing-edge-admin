"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, readAdminToken } from "@/lib/admin-session";

const ACTIONS = [
  ["ALL", "All actions"],
  ["publish", "Publish"],
  ["pause", "Pause"],
  ["delete", "Delete"],
  ["access_grant", "Access grant"],
  ["import", "Import"],
  ["link_decision", "Link decision"],
  ["teaching_decision", "Teaching decision"],
  ["export", "Learner export"],
] as const;

const OUTCOMES = [
  "ALL",
  "PUBLISHED",
  "PAUSED",
  "RESUMED",
  "DELETED",
  "REJECTED",
  "GRANTED",
  "PASSED",
  "PARTIAL",
  "FAILED",
  "approved",
  "banned",
  "EXPORTED",
] as const;

type AuditEntry = {
  entry_id: string;
  occurred_at: string;
  actor_admin_id: string | null;
  actor_label: string;
  action: string;
  outcome: string;
  detail: string;
};

function whenLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function actionLabel(action: string): string {
  return ACTIONS.find(([id]) => id === action)?.[1] ?? action;
}

export function AuditPanel({ operator }: { operator: boolean }) {
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState<(typeof ACTIONS)[number][0]>("ALL");
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number]>("ALL");
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [learnerId, setLearnerId] = useState("");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!readAdminToken()) {
      setMessage("Sign in again to load the audit list.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const params = new URLSearchParams();
      if (actor.trim()) {
        params.set("actor", actor.trim());
      }
      if (from) {
        params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
      }
      if (to) {
        params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
      }
      if (action !== "ALL") {
        params.set("action", action);
      }
      if (outcome !== "ALL") {
        params.set("outcome", outcome);
      }
      const response = await adminFetch(`/api/admin/audit?${params}`);
      const payload = (await response.json()) as {
        ok?: boolean;
        reason?: string;
        audit?: { entries: AuditEntry[]; matched: number };
      };
      if (!payload.ok || !payload.audit) {
        setEntries(null);
        setMessage(payload.reason ?? "Could not load the audit list.");
        return;
      }
      setEntries(payload.audit.entries);
    } catch {
      setEntries(null);
      setMessage("Could not load the audit list.");
    } finally {
      setBusy(false);
    }
  }, [action, actor, from, outcome, to]);

  useEffect(() => {
    void load();
    // Initial load only; filters apply on button click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function downloadExport() {
    const id = learnerId.trim();
    if (!id) {
      setMessage("Enter a learner id.");
      return;
    }
    if (!readAdminToken()) {
      setMessage("Sign in again to download a learner export.");
      return;
    }
    setExporting(true);
    setMessage(null);
    try {
      const response = await adminFetch(
        `/api/admin/learner-export?learner_id=${encodeURIComponent(id)}`,
      );
      if (!response.ok) {
        const payload = (await response.json()) as { reason?: string };
        setMessage(payload.reason ?? "Could not download the learner export.");
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `learner-${id.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80) || "export"}.json`;
      link.click();
      URL.revokeObjectURL(url);
      await load();
    } catch {
      setMessage("Could not download the learner export.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[16px] border border-[#D9E1E5] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#163A59]">
          Learner export
        </h2>
        {operator ? (
          <>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5C6B74]">
              Operator only. The file is keyed on the learner id from Learners.
              It contains attempts, Review cycles, and Interview deliveries.
              It leaves out name, email, and answer keys. Each download is
              recorded in this list.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm text-[#24313A]">
                Learner id
                <input
                  value={learnerId}
                  onChange={(event) => setLearnerId(event.target.value)}
                  className="min-h-[48px] rounded-[10px] border border-[#D9E1E5] px-3"
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                onClick={() => void downloadExport()}
                disabled={exporting}
                className="inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
              >
                {exporting ? "Downloading…" : "Download export"}
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm leading-6 text-[#5C6B74]">
            Learner export is available on the operator account.
          </p>
        )}
      </section>

      <section className="rounded-[16px] border border-[#D9E1E5] bg-white p-5">
        <h2 className="text-lg font-semibold text-[#163A59]">Filters</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Actor
            <input
              value={actor}
              onChange={(event) => setActor(event.target.value)}
              placeholder="Email or admin id"
              className="min-h-[48px] rounded-[10px] border border-[#D9E1E5] px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            From
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-[48px] rounded-[10px] border border-[#D9E1E5] px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            To
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-[48px] rounded-[10px] border border-[#D9E1E5] px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Action
            <select
              value={action}
              onChange={(event) =>
                setAction(event.target.value as (typeof ACTIONS)[number][0])
              }
              className="min-h-[48px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              {ACTIONS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#24313A]">
            Outcome
            <select
              value={outcome}
              onChange={(event) =>
                setOutcome(event.target.value as (typeof OUTCOMES)[number])
              }
              className="min-h-[48px] rounded-[10px] border border-[#D9E1E5] px-3"
            >
              {OUTCOMES.map((id) => (
                <option key={id} value={id}>
                  {id === "ALL" ? "All outcomes" : id}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
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

      {entries ? (
        <section className="overflow-x-auto rounded-[16px] border border-[#D9E1E5] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#D9E1E5] bg-[#F7F9FA] text-[#163A59]">
              <tr>
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Outcome</th>
                <th className="px-4 py-3 font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-[#5C6B74]">
                    No audit rows match these filters.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.entry_id}
                    className="border-b border-[#EEF2F4] text-[#24313A]"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {whenLabel(entry.occurred_at)}
                    </td>
                    <td className="px-4 py-3">{entry.actor_label}</td>
                    <td className="px-4 py-3">{actionLabel(entry.action)}</td>
                    <td className="px-4 py-3">{entry.outcome}</td>
                    <td className="px-4 py-3">{entry.detail}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
