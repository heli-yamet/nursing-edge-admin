import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { LearnersPanel } from "@/components/LearnersPanel";
import { adminApi } from "@/lib/site";

export default async function LearnersPage() {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    redirect("/signin");
  }

  const meResponse = await fetch(adminApi("/api/admin/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const me = (await meResponse.json()) as { ok?: boolean };
  if (!me.ok) {
    redirect("/signin");
  }

  return (
    <AdminShell current="learners">
      <h1 className="text-[28px] leading-tight font-semibold text-[#163A59] sm:text-[32px]">
        Learners
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#24313A]">
        Search by email for a read-only snapshot of access, Calibration, Practice
        and Review activity, and a timeline of committed attempts. Review Trace
        opens from timeline entries tied to a Review cycle. Nothing here changes
        learner records.
      </p>
      <div className="mt-8">
        <LearnersPanel />
      </div>
    </AdminShell>
  );
}
