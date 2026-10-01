"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/signin");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="inline-flex min-h-[48px] items-center rounded-[10px] px-3 text-base font-medium text-[#66727A] hover:bg-[#F7F9FA] hover:text-[#163A59]"
    >
      Sign out
    </button>
  );
}
