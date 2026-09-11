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
      className="mt-8 inline-flex min-h-[48px] items-center rounded-[10px] border border-[#D9E1E5] bg-white px-5 text-base font-medium text-[#163A59]"
    >
      Sign out
    </button>
  );
}
