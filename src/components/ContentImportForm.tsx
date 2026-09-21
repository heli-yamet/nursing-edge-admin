"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

type ImportResponse = {
  ok?: boolean;
  error?: string;
  published?: boolean;
  batch?: ImportBatch;
  lines?: ImportLine[];
};

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
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage("Choose a C2 .xlsx workbook.");
      return;
    }

    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      const response = await fetch("/api/content-imports", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as ImportResponse;
      if (!payload.ok || !payload.batch) {
        setMessage(payload.error ?? "Import failed.");
        return;
      }
      setResult(payload);
      router.refresh();
    } catch {
      setMessage("Import failed.");
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
        <button
          type="submit"
          disabled={busy}
          className="mt-4 inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
        >
          {busy ? "Importing…" : "Upload and stage"}
        </button>
      </form>
      <p className="mt-3 text-base leading-7 text-[#66727A]">
        The file is parsed in memory and discarded. Rows are staged only. They are
        not published and are not learner-visible.
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
          </p>
          <div className="mt-4 max-h-[480px] overflow-auto rounded-[10px] border border-[#D9E1E5] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#F7F9FA] text-[#163A59]">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Question version</th>
                  <th className="px-3 py-2 font-medium">Permanent item</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody>
                {(result.lines ?? []).map((line) => (
                  <tr key={line.line_id} className="border-t border-[#D9E1E5]">
                    <td className="px-3 py-2 align-top">{line.workbook_row}</td>
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
