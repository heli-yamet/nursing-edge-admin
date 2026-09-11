import { AdminAuthForm } from "@/components/AdminAuthForm";

export default function SignInPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium tracking-wide text-[#0B7F86]">
        Product Owner
      </p>
      <h1 className="mt-2 text-[28px] leading-tight font-semibold text-[#163A59] sm:text-[32px]">
        Sign in
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-[#24313A]">
        Enter your email and password, then verify the code sent to you.
      </p>
      <AdminAuthForm mode="signin" />
    </main>
  );
}
