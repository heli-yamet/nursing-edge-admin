type ImportedQuestion = {
  question_id: string;
  question_version_id: string;
  workbook_row: string;
  format: string;
  publication_status: "STAGED" | "PUBLISHED";
};

function statusLabel(status: ImportedQuestion["publication_status"]): string {
  return status === "PUBLISHED" ? "Published" : "Staged";
}

export function ImportedQuestionsTable({
  questions,
}: {
  questions: ImportedQuestion[];
}) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold text-[#163A59]">Imported questions</h2>
      <p className="mt-2 text-base leading-7 text-[#24313A]">
        {questions.length} question {questions.length === 1 ? "version" : "versions"}{" "}
        in the bank. Not published from this screen.
      </p>
      <div className="mt-4 max-h-[480px] overflow-auto rounded-[10px] border border-[#D9E1E5] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-[#F7F9FA] text-[#163A59]">
            <tr>
              <th className="px-3 py-2 font-medium">Row</th>
              <th className="px-3 py-2 font-medium">Question version</th>
              <th className="px-3 py-2 font-medium">Permanent item</th>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => (
              <tr
                key={question.question_version_id}
                className="border-t border-[#D9E1E5]"
              >
                <td className="px-3 py-2 align-top">{question.workbook_row}</td>
                <td className="px-3 py-2 align-top font-mono text-xs">
                  {question.question_version_id}
                </td>
                <td className="px-3 py-2 align-top font-mono text-xs">
                  {question.question_id}
                </td>
                <td className="px-3 py-2 align-top">{question.format}</td>
                <td className="px-3 py-2 align-top">
                  {statusLabel(question.publication_status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
