"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-session";
import { useDialogFocus } from "@/lib/dialog-focus";

type Job = {
  job_id: string;
  kind: "backup" | "restore";
  status: "running" | "completed" | "failed";
  backup_name: string;
  percent: number;
  message: string;
  error: string | null;
};

export function DatabaseJobOverlay() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [visible, setVisible] = useState(false);
  const advancing = useRef(false);
  const terminal = useRef(false);
  const jobRef = useRef<Job | null>(null);

  const publishJob = (next: Job | null) => {
    jobRef.current = next;
    setJob(next);
  };

  const poll = useCallback(async () => {
    const me = await adminFetch("/api/admin/me");
    const meData = (await me.json()) as { ok?: boolean; admin?: { role: string } };
    if (!meData.ok || meData.admin?.role !== "SUPER_ADMIN") {
      return;
    }

    if (terminal.current && jobRef.current) {
      publishJob(jobRef.current);
      setVisible(true);
      return;
    }

    const listResponse = await adminFetch("/api/admin/database-backups");
    const listData = (await listResponse.json()) as {
      ok?: boolean;
      active_job?: Job | null;
    };
    const active = listData.active_job ?? null;

    if (!active || active.status !== "running") {
      if (!terminal.current) {
        setVisible(false);
        publishJob(null);
      }
      return;
    }

    publishJob(active);
    setVisible(true);

    if (advancing.current) {
      return;
    }
    advancing.current = true;
    try {
      const advance = await adminFetch("/api/admin/database-backups/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: active.job_id }),
      });
      const advanceData = (await advance.json()) as { ok?: boolean; job?: Job | null };
      if (advanceData.job) {
        publishJob(advanceData.job);
        setVisible(true);
        if (advanceData.job.status !== "running") {
          terminal.current = true;
        }
      }
    } finally {
      advancing.current = false;
    }
  }, []);

  useEffect(() => {
    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 1500);
    return () => window.clearInterval(id);
  }, [poll]);

  const close = () => {
    terminal.current = false;
    setVisible(false);
    publishJob(null);
  };

  const jobStillRunning = visible && job?.status === "running";

  useDialogFocus({
    active: visible && job !== null,
    panelRef,
    onClose: jobStillRunning ? () => undefined : close,
  });

  if (!visible || !job) {
    return null;
  }

  const running = job.status === "running";
  const title = job.kind === "backup" ? "Database backup" : "Database restore";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#163A59]/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="database-job-title"
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-xl border border-[#D9E1E5] bg-white p-6 shadow-lg"
      >
        <h2 id="database-job-title" className="text-lg font-semibold text-[#163A59]">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[#4A5F73]">{job.backup_name}</p>
        <p className="mt-3 text-sm text-[#163A59]">{job.message}</p>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[#E8EEF1]">
          <div
            className="h-full rounded-full bg-[#0B7F86] transition-all"
            style={{ width: `${Math.max(0, Math.min(100, job.percent))}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-[#08666C]">{job.percent}%</p>
        {job.error ? (
          <p className="mt-3 text-sm text-[#B42318]">{job.error}</p>
        ) : null}
        {!running ? (
          <button
            type="button"
            className="mt-5 min-h-[48px] w-full rounded-[10px] bg-[#0B7F86] text-base font-semibold text-white"
            onClick={close}
          >
            Close
          </button>
        ) : (
          <p className="mt-4 text-xs text-[#4A5F73]">
            Other backup and restore actions stay disabled until this job finishes.
          </p>
        )}
      </div>
    </div>
  );
}