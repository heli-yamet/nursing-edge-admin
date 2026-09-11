import { cookies } from "next/headers";
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
        Signed in as {admin.email}. Console views are not built yet.
      </p>
      <SignOutButton />
    </main>
  );
}
