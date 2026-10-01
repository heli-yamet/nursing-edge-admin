import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { ManualGrantForm } from "@/components/ManualGrantForm";
import { adminApi } from "@/lib/site";

type GrantAttempt = {
  audit_id: string;
  email: string;
  occurred_at?: string;
  outcome: "GRANTED" | "REJECTED";
  reason: string | null;
};

function outcomeLabel(outcome: GrantAttempt["outcome"]): string {
  return outcome === "GRANTED" ? "Granted" : "Rejected";
}

function whenLabel(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString();
}

export default async function ManualAccessPage() {
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

  const listResponse = await fetch(adminApi("/api/admin/access-grants"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const list = (await listResponse.json()) as {
    ok?: boolean;
    grants?: GrantAttempt[];
  };
  const grants = list.ok ? (list.grants ?? []) : [];

  return (
    <AdminShell current="access">
      <h1 className="text-[28px] leading-tight font-semibold text-[#163A59] sm:text-[32px]">
        Manual access
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#24313A]">
        Grant access to an email that has not paid. No invitation is sent. The
        person registers themselves, and the grant links when they verify that
        email. If they already have an account, it links the next time they
        sign in.
      </p>
      <ManualGrantForm />
      {grants.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-[#163A59]">Recent grants</h2>
          <div className="mt-4 overflow-auto rounded-[10px] border border-[#D9E1E5] bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#F7F9FA] text-[#163A59]">
                <tr>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.audit_id} className="border-t border-[#D9E1E5]">
                    <td className="px-3 py-2 align-top">{grant.email}</td>
                    <td className="px-3 py-2 align-top">{whenLabel(grant.occurred_at)}</td>
                    <td className="px-3 py-2 align-top">
                      {outcomeLabel(grant.outcome)}
                      {grant.reason ? (
                        <span className="mt-1 block text-[#66727A]">{grant.reason}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AdminShell>
  );
}
