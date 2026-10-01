import type { ReactNode } from "react";
import { AdminNav, type AdminNavItem } from "@/components/AdminNav";

export function AdminShell({
  current,
  children,
}: {
  current: AdminNavItem;
  children: ReactNode;
}) {
  return (
    <>
      <AdminNav current={current} />
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pt-10 pb-16 sm:px-6">
        {children}
      </main>
    </>
  );
}
