import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { OverviewCards } from "@/components/OverviewCards";
import { adminApi } from "@/lib/site";

export default async function DashboardPage() {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    redirect("/signin");
  }

  const [meResponse, overviewResponse] = await Promise.all([
    fetch(adminApi("/api/admin/me"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
    fetch(adminApi("/api/admin/overview"), {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  const data = (await meResponse.json()) as {
    ok?: boolean;
    admin?: { email: string; role: string };
  };

  if (!data.ok || !data.admin) {
    redirect("/signin");
  }

  const overviewData = (await overviewResponse.json()) as {
    ok?: boolean;
    overview?: Parameters<typeof OverviewCards>[0]["overview"];
  };

  const admin = data.admin;

  return (
    <AdminShell current="dashboard">
      <p className="text-sm font-medium tracking-wide text-[#0B7F86]">
        {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
      </p>
      <h1 className="mt-2 text-[28px] leading-tight font-semibold text-[#163A59] sm:text-[32px]">
        Overview
      </h1>
      <p className="mt-4 text-base leading-7 text-[#24313A]">
        Signed in as {admin.email}.
      </p>

      {overviewData.ok && overviewData.overview ? (
        <div className="mt-8">
          <OverviewCards overview={overviewData.overview} />
        </div>
      ) : (
        <p className="mt-6 text-base text-[#B42318]">
          Overview counts could not be loaded.
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/learning-evidence"
          className="inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C]"
        >
          Learning Evidence
        </Link>
        <Link
          href="/audit"
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#D9E1E5] bg-white px-5 text-base font-medium text-[#163A59]"
        >
          Audit
        </Link>
        <Link
          href="/access"
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#D9E1E5] bg-white px-5 text-base font-medium text-[#163A59]"
        >
          Manual access
        </Link>
        <Link
          href="/imports"
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#D9E1E5] bg-white px-5 text-base font-medium text-[#163A59]"
        >
          Content Imports
        </Link>
      </div>
    </AdminShell>
  );
}
