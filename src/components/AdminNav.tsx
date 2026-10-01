import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

const ITEMS = [
  ["dashboard", "/dashboard", "Dashboard"],
  ["access", "/access", "Manual access"],
  ["imports", "/imports", "Content Imports"],
] as const;

export type AdminNavItem = (typeof ITEMS)[number][0];

export function AdminNav({ current }: { current: AdminNavItem }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#D9E1E5] bg-white">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
        <span className="text-lg font-semibold text-[#163A59]">
          Nursing Edge Admin
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <nav aria-label="Admin" className="flex flex-wrap gap-1">
            {ITEMS.map(([id, href, label]) => {
              const active = current === id;
              return (
                <Link
                  key={id}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[48px] items-center justify-center rounded-[10px] border-b-2 px-3 text-base font-medium ${
                    active
                      ? "border-[#0B7F86] bg-[#E8F5F5] font-semibold text-[#08666C]"
                      : "border-transparent text-[#163A59] hover:bg-[#F7F9FA]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
