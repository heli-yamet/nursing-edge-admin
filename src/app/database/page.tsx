import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { DatabaseBackupPanel } from "@/components/DatabaseBackupPanel";
import { adminApi } from "@/lib/site";

export const metadata: Metadata = {
  title: "Database",
};

export default async function DatabasePage() {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    redirect("/signin");
  }

  const meResponse = await fetch(adminApi("/api/admin/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await meResponse.json()) as {
    ok?: boolean;
    admin?: { email: string; role: string };
  };

  if (!data.ok || !data.admin) {
    redirect("/signin");
  }

  if (data.admin.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <AdminShell current="database">
      <h1 className="text-2xl font-semibold text-[#163A59]">Database</h1>
      <p className="mt-2 max-w-2xl text-base text-[#4A5F73]">
        Back up and restore the MongoDB database configured on the learner API.
        Archives are stored privately in Vercel Blob under{" "}
        <span className="font-mono text-sm">backups/</span>.
      </p>
      <div className="mt-8">
        <DatabaseBackupPanel />
      </div>
    </AdminShell>
  );
}