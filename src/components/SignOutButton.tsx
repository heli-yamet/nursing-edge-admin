"use client";

import { useRouter } from "next/navigation";
import { clearAdminToken } from "@/lib/admin-session";

export function SignOutButton() {
  const router = useRouter();

  function signOut() {
    clearAdminToken();
    router.push("/signin");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="inline-flex min-h-[48px] items-center rounded-[10px] px-3 text-base font-medium text-[#66727A] hover:bg-[#F7F9FA] hover:text-[#163A59]"
    >
      Sign out
    </button>
  );
}
