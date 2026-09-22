type ImportBatch = {
  batch_id: string;
  created_at?: string;
  source: string;
  line_count: number;
  passed_count: number;
  failed_count: number;
  unchanged_count: number;
};

export function PriorBatches({ batches }: { batches: ImportBatch[] }) {
  if (batches.length === 0) {
    return null;
  }

  return (
    <details className="group mt-12 rounded-[10px] border border-[#D9E1E5] bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-xl font-semibold text-[#163A59] select-none [&::-webkit-details-marker]:hidden">
        <span>Prior batches</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="h-5 w-5 shrink-0 text-[#0B7F86] transition-transform duration-200 group-open:rotate-180"
        >
          <path
            fill="currentColor"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
          />
        </svg>
      </summary>
      <ul className="space-y-3 border-t border-[#D9E1E5] px-4 py-4">
        {batches.map((batch) => (
          <li
            key={batch.batch_id}
            className="rounded-[10px] border border-[#D9E1E5] bg-[#F7F9FA] px-4 py-3 text-base leading-7 text-[#24313A]"
          >
            {batch.source}: {batch.passed_count} passed, {batch.failed_count}{" "}
            failed, {batch.unchanged_count} unchanged of {batch.line_count}.
          </li>
        ))}
      </ul>
    </details>
  );
}
