import { STATUS_SITE_URL } from "@/lib/site";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center px-5 py-16 sm:px-6">
      <p className="text-sm font-medium tracking-wide text-[#0B7F86]">
        Product Owner
      </p>
      <h1 className="mt-2 text-[28px] leading-tight font-semibold text-[#163A59] sm:text-[32px]">
        Nursing Edge Admin
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-[#24313A]">
        Authorized operators use this console. Register, then sign in. Super
        Admin is created from the configured backend email.
      </p>
      <p className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/register"
          className="inline-flex min-h-[48px] items-center rounded-[10px] bg-[#0B7F86] px-5 text-base font-medium text-white hover:bg-[#08666C]"
        >
          Register
        </Link>
        <Link
          href="/signin"
          className="inline-flex min-h-[48px] items-center rounded-[10px] border border-[#D9E1E5] bg-white px-5 text-base font-medium text-[#163A59]"
        >
          Sign in
        </Link>
      </p>
      {STATUS_SITE_URL ? (
        <p className="mt-6">
          <a
            href={STATUS_SITE_URL}
            className="text-base font-medium text-[#0B7F86] underline"
          >
            View status and changelog
          </a>
        </p>
      ) : null}
    </main>
  );
}
