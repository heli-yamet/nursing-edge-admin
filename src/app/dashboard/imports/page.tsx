import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContentImportForm } from "@/components/ContentImportForm";
import { SignOutButton } from "@/components/SignOutButton";
import { adminApi } from "@/lib/site";

type ImportBatch = {
  batch_id: string;
  created_at?: string;
  source: string;
  line_count: number;
  passed_count: number;
  failed_count: number;
  unchanged_count: number;
};

export default async function ContentImportsPage() {
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

  const listResponse = await fetch(adminApi("/api/admin/content-imports"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const list = (await listResponse.json()) as {
    ok?: boolean;
    batches?: ImportBatch[];
  };
  const batches = list.ok ? (list.batches ?? []) : [];

  return (
    <main className="mx-auto w-full max-w-[960px] px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium tracking-wide text-[#0B7F86]">
        <Link href="/dashboard" className="underline">
          Dashboard
        </Link>
      </p>
      <h1 className="mt-2 text-[28px] leading-tight font-semibold text-[#163A59] sm:text-[32px]">
        Content Imports
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-[#24313A]">
        Upload a C2 workbook. Each question is validated and staged. Failed rows
        stay failed. Nothing is published from this screen.
      </p>
      <ContentImportForm />
      {batches.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-[#163A59]">Prior batches</h2>
          <ul className="mt-4 space-y-3">
            {batches.map((batch) => (
              <li
                key={batch.batch_id}
                className="rounded-[10px] border border-[#D9E1E5] bg-white px-4 py-3 text-base leading-7 text-[#24313A]"
              >
                {batch.source}: {batch.passed_count} passed, {batch.failed_count}{" "}
                failed, {batch.unchanged_count} unchanged of {batch.line_count}.
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <SignOutButton />
    </main>
  );
}
