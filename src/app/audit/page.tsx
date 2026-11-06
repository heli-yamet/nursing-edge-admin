import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { AuditPanel } from "@/components/AuditPanel";
import { adminApi } from "@/lib/site";

export default async function AuditPage() {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    redirect("/signin");
  }

  const meResponse = await fetch(adminApi("/api/admin/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const me = (await meResponse.json()) as {
    ok?: boolean;
    admin?: { role: string };
  };
  if (!me.ok || !me.admin) {
    redirect("/signin");
  }

  return (
    <AdminShell current="audit">
      <h1 className="text-[28px] font-semibold leading-tight text-[#163A59] sm:text-[32px]">
        Audit
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[#24313A]">
        Publish, pause, delete, access grants, imports, link decisions, teaching
        decisions, and learner exports. This list is read-only. It does not
        change attempts, Review cycles, Interview records, or answer keys.
      </p>
      <div className="mt-6">
        <AuditPanel operator={me.admin.role === "SUPER_ADMIN"} />
      </div>
    </AdminShell>
  );
}
