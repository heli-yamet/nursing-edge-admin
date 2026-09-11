"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/site";

type Mode = "signup" | "signin";

type CheckResponse = {
  check: boolean;
  code: boolean | null;
};

type SignUpResponse = {
  result: "exists" | "code" | "success" | "invalid_request" | "error";
  rateLimited?: boolean;
};

type SignInResponse = {
  result:
    | "credentials"
    | "code"
    | "pending"
    | "success"
    | "invalid_request"
    | "error";
  token?: string;
  rateLimited?: boolean;
};

function isEightDigits(value: string): boolean {
  return /^\d{8}$/.test(value);
}

export function AdminAuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendWait, setSendWait] = useState(0);
  const [tryWait, setTryWait] = useState(0);

  useEffect(() => {
    if (sendWait <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setSendWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [sendWait]);

  useEffect(() => {
    if (tryWait <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setTryWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [tryWait]);

  const verifyEnabled = useMemo(
    () => isEightDigits(code) && tryWait === 0 && !busy,
    [busy, code, tryWait],
  );

  async function requestCode() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(adminApi("/api/admin/check-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, method: mode }),
      });
      const data = (await response.json()) as CheckResponse;

      if (!data.check) {
        setMessage(
          mode === "signup"
            ? "This email already has an account. Sign in instead."
            : "No admin account exists for this email. Register instead.",
        );
        return;
      }

      if (data.code === false) {
        setSendWait(60);
        setMessage("Please wait 1 minute before sending another code.");
        return;
      }

      setStep("code");
      setSendWait(60);
      setMessage("We sent an 8-digit code to your email.");
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!verifyEnabled) {
      return;
    }
    setBusy(true);
    setMessage("");
    setTryWait(3);
    try {
      if (mode === "signup") {
        const response = await fetch(adminApi("/api/admin/sign-up"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, code }),
        });
        const data = (await response.json()) as SignUpResponse;
        if (data.rateLimited) {
          setMessage("Try again in 3 seconds.");
          return;
        }
        if (data.result === "exists") {
          setMessage("This email already has an account. Sign in instead.");
          return;
        }
        if (data.result === "code") {
          setMessage("That code does not match. Try again.");
          return;
        }
        if (data.result === "success") {
          router.push("/signin");
          return;
        }
        setMessage("Sign up failed. Try again.");
        return;
      }

      const response = await fetch(adminApi("/api/admin/sign-in"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code }),
      });
      const data = (await response.json()) as SignInResponse;
      if (data.rateLimited) {
        setMessage("Try again in 3 seconds.");
        return;
      }
      if (data.result === "credentials") {
        setMessage("Email or password does not match.");
        return;
      }
      if (data.result === "code") {
        setMessage("That code does not match. Try again.");
        return;
      }
      if (data.result === "pending") {
        setMessage(
          "This account is waiting for Super Admin approval. You cannot sign in yet.",
        );
        return;
      }
      if (data.result === "success" && data.token) {
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: data.token }),
        });
        router.push("/dashboard");
        return;
      }
      setMessage("Sign in failed. Try again.");
    } catch {
      setMessage("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const locked = step === "code";

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (step === "credentials") {
          void requestCode();
        } else {
          void verify();
        }
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-[#163A59]">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          readOnly={locked}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 min-h-[48px] w-full rounded-[10px] border border-[#D9E1E5] bg-white px-3 text-base text-[#24313A] read-only:bg-[#F7F9FA]"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-[#163A59]">Password</span>
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
          readOnly={locked}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 min-h-[48px] w-full rounded-[10px] border border-[#D9E1E5] bg-white px-3 text-base text-[#24313A] read-only:bg-[#F7F9FA]"
        />
      </label>

      {step === "code" ? (
        <label className="block">
          <span className="text-sm font-medium text-[#163A59]">
            8-digit code
          </span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 8))
            }
            className="mt-2 min-h-[48px] w-full rounded-[10px] border border-[#D9E1E5] bg-white px-3 text-base tracking-[0.3em] text-[#24313A]"
          />
        </label>
      ) : null}

      {message ? (
        <p className="text-sm leading-6 text-[#B84A4A]" role="alert">
          {message}
        </p>
      ) : null}

      {step === "credentials" ? (
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
        >
          {mode === "signup" ? "Register" : "Continue"}
        </button>
      ) : (
        <div className="space-y-3">
          <button
            type="submit"
            disabled={!verifyEnabled}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C] disabled:opacity-60"
          >
            {tryWait > 0 ? `Try ${tryWait}s later` : "Verify"}
          </button>
          <button
            type="button"
            disabled={busy || sendWait > 0}
            onClick={() => void requestCode()}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-[10px] border border-[#D9E1E5] bg-white px-5 text-base font-medium text-[#163A59] disabled:opacity-60"
          >
            {sendWait > 0
              ? `Wait ${sendWait}s to send code again`
              : "Send code again"}
          </button>
        </div>
      )}

      <p className="text-sm text-[#66727A]">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link className="text-[#0B7F86] underline" href="/signin">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <Link className="text-[#0B7F86] underline" href="/register">
              Register
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
