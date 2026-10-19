"use client";

import { uploadPresigned } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminFetch, readAdminToken } from "@/lib/admin-session";
import { adminApi } from "@/lib/site";

type ImportLine = {
  line_id: string;
  question_id: string;
  question_version_id: string;
  workbook_row: string;
  outcome: "PASSED" | "FAILED" | "UNCHANGED";
  errors: string[];
};

type ImportBatch = {
  batch_id: string;
  source: string;
  line_count: number;
  passed_count: number;
  failed_count: number;
  unchanged_count: number;
};

type DomainCounts = {
  passed: number;
  failed: number;
  unchanged: number;
};

type ImportDomains = {
  content: DomainCounts;
  mapping_and_exposure: DomainCounts;
  evidence_and_teaching: DomainCounts;
  runtime_binding: DomainCounts;
};

type ImportResponse = {
  ok?: boolean;
  error?: string;
  published?: boolean;
  batch?: ImportBatch;
  lines?: ImportLine[];
  domains?: ImportDomains;
  calibration?: { ok?: boolean; reason?: string | null };
};

const DOMAIN_LABELS: { key: keyof ImportDomains; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "mapping_and_exposure", label: "Mapping and exposure" },
  { key: "evidence_and_teaching", label: "Evidence and teaching" },
  { key: "runtime_binding", label: "Runtime binding" },
];

function contentImportBlobPath(fileName: string): string | null {
  const base = fileName.trim().replace(/\\/g, "/").split("/").pop() ?? "";
  if (!/^[^/\\]+\.xlsx$/i.test(base)) {
    return null;
  }
  return `content-imports/${base}`;
}

function outcomeLabel(outcome: ImportLine["outcome"]): string {
  if (outcome === "PASSED") {
    return "Passed";
  }
  if (outcome === "FAILED") {
    return "Failed";
  }
  return "Unchanged";
}

export function ContentImportForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportResponse | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const purpose =
      submitter instanceof HTMLButtonElement && submitter.value
        ? submitter.value
        : "bank";
    data.set("purpose", purpose);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage("Choose a C2 .xlsx workbook.");
      return;
    }

    if (!readAdminToken()) {
      setMessage("Sign in again before uploading a workbook.");
      return;
    }

    const blobPath = contentImportBlobPath(file.name);
    if (!blobPath) {
      setMessage("Choose a C2 .xlsx workbook.");
      return;
    }

    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const blob = await uploadPresigned(blobPath, file, {
        access: "private",
        handleUploadUrl: adminApi("/api/admin/content-import-uploads"),
        headers: { Authorization: `Bearer ${readAdminToken()}` },
        contentType:
          file.type ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const response = await adminFetch("/api/admin/content-imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: blob.url,
          pathname: blob.pathname,
          fileName: file.name,
          purpose,
        }),
      });
      const payload = (await response.json()) as ImportResponse;
      if (!payload.ok || !payload.batch) {
        setMessage(payload.error ?? "Import failed.");
        return;
      }
      setResult(payload);
      if (purpose === "calibration" && payload.calibration && !payload.calibration.ok) {
        setMessage(
          payload.calibration.reason ??
            "Imported and staged. Not saved as Calibration.",
        );
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={(event) => void onSubmit(event)} className="mt-8">
        <label className="block text-sm font-medium text-[#163A59]" htmlFor="file">
          C2 workbook
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy}
          className="mt-2 block w-full text-base text-[#24313A] file:mr-4 file:min-h-[48px] file:rounded-[10px] file:border file:border-[#D9E1E5] file:bg-white file:px-4 file:text-base file:font-medium file:text-[#163A59]"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            name="purpose"
            value="bank"
            disabled={busy}
            className="inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
          >
            {busy ? "Importing…" : "Upload and stage"}
          </button>
          <button
            type="submit"
            name="purpose"
            value="calibration"
            disabled={busy}
            className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#0B7F86] bg-white px-5 text-base font-medium text-[#0B7F86] hover:bg-[#F7F9FA] disabled:opacity-60"
          >
            {busy ? "Importing…" : "Upload as Calibration"}
          </button>
        </div>
      </form>
      <p className="mt-3 text-base leading-7 text-[#66727A]">
        The workbook is uploaded to private storage, parsed, and then deleted. Rows are staged only. They are
        not published and are not learner-visible. Upload as Calibration saves the
        successful rows as the Calibration set only when there are exactly 35.
      </p>
      {message ? (
        <p className="mt-4 text-base leading-7 text-[#9B2C2C]" role="alert">
          {message}
        </p>
      ) : null}
      {result?.batch ? (
        <section className="mt-10" aria-live="polite">
          <h2 className="text-xl font-semibold text-[#163A59]">Latest batch</h2>
          <p className="mt-2 text-base leading-7 text-[#24313A]">
            {result.batch.source}: {result.batch.passed_count} passed,{" "}
            {result.batch.failed_count} failed, {result.batch.unchanged_count}{" "}
            unchanged of {result.batch.line_count}. Not published.
            {result.calibration?.ok
              ? " Saved as the Calibration set. Ordinary Practice will not use these 35."
              : ""}
          </p>
          {result.domains ? (
            <ul className="mt-4 space-y-2 text-base leading-7 text-[#24313A]">
              {DOMAIN_LABELS.map((domain) => {
                const counts = result.domains?.[domain.key];
                if (!counts) {
                  return null;
                }
                return (
                  <li key={domain.key}>
                    {domain.label}: {counts.passed} passed, {counts.failed}{" "}
                    failed, {counts.unchanged} unchanged.
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="mt-4 rounded-[10px] border border-[#D9E1E5] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#F7F9FA] text-[#163A59]">
                <tr>
                  <th className="px-3 py-2 font-medium">Question version</th>
                  <th className="px-3 py-2 font-medium">Permanent item</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {(result.lines ?? []).map((line) => (
                  <tr key={line.line_id} className="border-t border-[#D9E1E5]">
                    <td className="px-3 py-2 align-top font-mono text-xs">
                      {line.question_version_id}
                    </td>
                    <td className="px-3 py-2 align-top font-mono text-xs">
                      {line.question_id}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {outcomeLabel(line.outcome)}
                    </td>
                    <td className="px-3 py-2 align-top text-[#9B2C2C]">
                      {line.errors.join("; ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
