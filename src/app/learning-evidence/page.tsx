import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { LearningEvidencePanel } from "@/components/LearningEvidencePanel";

export default async function LearningEvidencePage() {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    redirect("/signin");
  }

  return (
    <AdminShell current="evidence">
      <h1 className="text-[28px] font-semibold leading-tight text-[#163A59] sm:text-[32px]">
        Learning Evidence
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[#24313A]">
        Filter committed learner attempts across the population. This view is
        read-only and uses the same accuracy rules as learner Results and
        Progress.
      </p>
      <div className="mt-6">
        <LearningEvidencePanel />
      </div>
    </AdminShell>
  );
}
