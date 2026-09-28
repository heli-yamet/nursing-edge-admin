type EligibilityReport = {
  imported: number;
  published: number;
  mvp_eligible: number;
  unavailable_invalid: number;
  unsupported_interaction: number;
  launch_eligible_minimum: number;
  launch_gate_met: boolean;
};

export function EligibilitySummary({
  report,
}: {
  report: EligibilityReport | null;
}) {
  if (!report) {
    return null;
  }

  const launchLine = report.launch_gate_met
    ? `Launch gate: MVP-eligible is at least ${report.launch_eligible_minimum}.`
    : `Launch gate: MVP-eligible is below ${report.launch_eligible_minimum}. This is a report only; selection does not hard-code that number.`;

  return (
    <section className="mt-10 rounded-[10px] border border-[#D9E1E5] bg-white px-4 py-4">
      <h2 className="text-xl font-semibold text-[#163A59]">Eligibility</h2>
      <p className="mt-3 text-base leading-7 text-[#24313A]">
        Imported: {report.imported}. Published: {report.published}. MVP-eligible:{" "}
        {report.mvp_eligible}. Unavailable or invalid: {report.unavailable_invalid}.
        Unsupported interaction type: {report.unsupported_interaction}.
      </p>
      <p className="mt-2 text-base leading-7 text-[#24313A]">{launchLine}</p>
      <p className="mt-2 text-base leading-7 text-[#66727A]">
        Eligible means published, active, valid, complete, and MCQ or SATA. Staged
        items and paused published versions are imported but not eligible.
        Learners still do not see questions.
      </p>
    </section>
  );
}
