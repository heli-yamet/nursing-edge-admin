"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/admin-session";
import { useDialogFocus } from "@/lib/dialog-focus";

type BackupRow = {
  backup_name: string;
  database: string;
  created_at: string;
  collection_count: number;
  document_count: number;
};

type Job = {
  job_id: string;
  status: string;
};

export function DatabaseBackupPanel() {
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [backupName, setBackupName] = useState("");
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [confirmInput, setConfirmInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const refresh = useCallback(async () => {
    const response = await adminFetch("/api/admin/database-backups");
    const data = (await response.json()) as {
      ok?: boolean;
      backups?: BackupRow[];
      default_backup_name?: string;
      active_job?: Job | null;
      error?: string;
    };
    if (!data.ok) {
      setError(data.error ?? "Could not load backups.");
      return;
    }
    setBackups(data.backups ?? []);
    setBackupName((current) => current || data.default_backup_name || "");
    const job = data.active_job ?? null;
    setActiveJob(job?.status === "running" ? job : null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const jobRunning = Boolean(activeJob);

  const openBackupModal = () => {
    setError(null);
    setBackupModalOpen(true);
    void refresh();
  };

  const openRestoreModal = () => {
    setError(null);
    setSelectedBackup(backups[0]?.backup_name ?? null);
    setConfirmInput("");
    setRestoreModalOpen(true);
    void refresh();
  };

  const selectBackup = (name: string) => {
    setSelectedBackup(name);
    setBackupName(name);
  };

  const startBackup = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/database-backups/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_name: backupName.trim() }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Backup could not start.");
        return;
      }
      setBackupModalOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const requestRestoreConfirm = (name?: string) => {
    const target = name ?? selectedBackup;
    if (!target) {
      setError("Select a backup to restore.");
      return;
    }
    setPendingRestore(target);
    setSelectedBackup(target);
    setConfirmInput("");
    setRestoreModalOpen(false);
    setConfirmModalOpen(true);
  };

  const startRestore = async () => {
    const target = pendingRestore ?? selectedBackup;
    if (!target) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/database-backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backup_name: target,
          confirm_name: confirmInput.trim(),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Restore could not start.");
        return;
      }
      setConfirmModalOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
  <div className="space-y-6">
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        disabled={jobRunning}
        onClick={openBackupModal}
        className="min-h-[48px] rounded-[10px] bg-[#0B7F86] px-5 text-base font-semibold text-white disabled:opacity-50"
      >
        Backup database
      </button>
      <button
        type="button"
        disabled={jobRunning || backups.length === 0}
        onClick={openRestoreModal}
        className="min-h-[48px] rounded-[10px] border border-[#0B7F86] bg-white px-5 text-base font-semibold text-[#08666C] disabled:opacity-50"
      >
        Restore database
      </button>
    </div>
    {error ? <p className="text-sm text-[#B42318]">{error}</p> : null}
    {jobRunning ? (
      <p className="text-sm text-[#4A5F73]">
        A job is running. Progress appears in the overlay on any admin page.
      </p>
    ) : null}

    {backupModalOpen ? (
      <Modal title="Backup database" onClose={() => setBackupModalOpen(false)}>
        <BackupList
          backups={backups}
          selected={backupName}
          onSelect={selectBackup}
          onDoubleSelect={selectBackup}
        />
        <label className="mt-4 block text-sm font-medium text-[#163A59]">
          Backup name
          <input
            className="mt-1 w-full rounded-[10px] border border-[#D9E1E5] px-3 py-2 text-base"
            value={backupName}
            onChange={(event) => setBackupName(event.target.value)}
          />
        </label>
        <p className="mt-2 text-xs text-[#4A5F73]">
          Selecting an existing name overwrites that backup in Vercel Blob.
        </p>
        <ModalActions
          primaryLabel="Start backup"
          onPrimary={() => void startBackup()}
          onCancel={() => setBackupModalOpen(false)}
          disabled={busy || !backupName.trim()}
        />
      </Modal>
    ) : null}

    {restoreModalOpen ? (
      <Modal title="Restore database" onClose={() => setRestoreModalOpen(false)}>
        <BackupList
          backups={backups}
          selected={selectedBackup}
          onSelect={setSelectedBackup}
          onDoubleSelect={(name) => requestRestoreConfirm(name)}
        />
        <ModalActions
          primaryLabel="Continue"
          onPrimary={() => requestRestoreConfirm()}
          onCancel={() => setRestoreModalOpen(false)}
          disabled={!selectedBackup}
        />
      </Modal>
    ) : null}

    {confirmModalOpen ? (
      <Modal
        title="Confirm restore"
        onClose={() => setConfirmModalOpen(false)}
      >
        <p className="text-sm text-[#4A5F73]">
          Restoring replaces data in the live MongoDB database configured on the
          learner API. Type the backup name to confirm:
        </p>
        <p className="mt-2 font-mono text-sm font-semibold text-[#163A59]">
          {pendingRestore ?? selectedBackup}
        </p>
        <input
          className="mt-3 w-full rounded-[10px] border border-[#D9E1E5] px-3 py-2 text-base"
          value={confirmInput}
          onChange={(event) => setConfirmInput(event.target.value)}
          placeholder="Type backup name"
        />
        <ModalActions
          primaryLabel="Restore"
          onPrimary={() => void startRestore()}
          onCancel={() => setConfirmModalOpen(false)}
          disabled={
            busy || confirmInput.trim() !== (pendingRestore ?? selectedBackup)
          }
          danger
        />
      </Modal>
    ) : null}
  </div>
  );
}

function BackupList({
  backups,
  selected,
  onSelect,
  onDoubleSelect,
}: {
  backups: BackupRow[];
  selected: string | null;
  onSelect: (name: string) => void;
  onDoubleSelect: (name: string) => void;
}) {
  if (backups.length === 0) {
    return <p className="text-sm text-[#4A5F73]">No stored backups yet.</p>;
  }
  return (
    <ul className="max-h-48 space-y-1 overflow-y-auto rounded-[10px] border border-[#D9E1E5] p-2">
      {backups.map((row) => {
        const active = row.backup_name === selected;
        return (
          <li key={row.backup_name}>
            <button
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                active ? "bg-[#E8F5F5] font-semibold text-[#08666C]" : "text-[#163A59]"
              }`}
              onClick={() => onSelect(row.backup_name)}
              onDoubleClick={() => onDoubleSelect(row.backup_name)}
            >
              <span className="block">{row.backup_name}</span>
              <span className="text-xs font-normal text-[#4A5F73]">
                {row.document_count} documents · {row.created_at || "—"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus({ active: true, panelRef, onClose });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#163A59]/40 px-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="database-modal-title"
        className="w-full max-w-lg rounded-xl border border-[#D9E1E5] bg-white p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalHeader title={title} onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  primaryLabel,
  onPrimary,
  onCancel,
  disabled,
  danger,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  onCancel: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <button
        type="button"
        className="min-h-[48px] rounded-[10px] px-4 text-base text-[#4A5F73]"
        onClick={onCancel}
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onPrimary}
        className={`min-h-[48px] rounded-[10px] px-5 text-base font-semibold text-white disabled:opacity-50 ${
          danger ? "bg-[#B42318]" : "bg-[#0B7F86]"
        }`}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <h2 id="database-modal-title" className="text-lg font-semibold text-[#163A59]">
        {title}
      </h2>
      <button
        type="button"
        aria-label="Close"
        className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-[10px] text-xl text-[#4A5F73] hover:bg-[#F7F9FA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B7F86]"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}