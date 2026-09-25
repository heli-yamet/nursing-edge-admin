"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type GrantResponse = {
  ok?: boolean;
  outcome?: "GRANTED" | "REJECTED";
  email?: string;
  reason?: string | null;
  error?: string;
};

export function ManualGrantForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"info" | "error">("error");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/access-grants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as GrantResponse;
      if (payload.outcome === "GRANTED") {
        setTone("info");
        setMessage(`Access granted for ${payload.email}. No invitation was sent.`);
        setEmail("");
        router.refresh();
        return;
      }
      setTone("error");
      setMessage(payload.reason ?? payload.error ?? "Could not grant access.");
    } catch {
      setTone("error");
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-8" onSubmit={(event) => void onSubmit(event)}>
      <label className="block text-base font-medium text-[#163A59]" htmlFor="grant-email">
        Email
      </label>
      <input
        id="grant-email"
        type="email"
        autoComplete="off"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        className="mt-2 min-h-[48px] w-full rounded-[10px] border border-[#D9E1E5] bg-white px-3 text-base text-[#24313A]"
      />
      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
      >
        {busy ? "Granting…" : "Grant access"}
      </button>
      {message ? (
        <p
          className={`mt-4 text-base leading-7 ${tone === "info" ? "text-[#24313A]" : "text-[#9B2C2C]"}`}
          role={tone === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
