import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { adminApi } from "@/lib/site";

export default async function DashboardPage() {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    redirect("/signin");
  }

  const response = await fetch(adminApi("/api/admin/me"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = (await response.json()) as {
    ok?: boolean;
    admin?: { email: string; role: string };
  };

  if (!data.ok || !data.admin) {
    redirect("/signin");
  }

  const admin = data.admin;

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium tracking-wide text-[#0B7F86]">
        {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
      </p>
      <h1 className="mt-2 text-[28px] leading-tight font-semibold text-[#163A59] sm:text-[32px]">
        Dashboard
      </h1>
      <p className="mt-4 text-base leading-7 text-[#24313A]">
        Signed in as {admin.email}.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/access"
          className="inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C]"
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
      <p className="mt-4 text-base leading-7 text-[#66727A]">
        Other console views are not built yet. Publish is not available on this
        screen.
      </p>
      <SignOutButton />
    </main>
  );
}
