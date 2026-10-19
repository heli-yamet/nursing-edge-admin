import type { ReactNode } from "react";
import { AdminNav, type AdminNavItem } from "@/components/AdminNav";

export function AdminShell({
  current,
  children,
  fill = false,
}: {
  current: AdminNavItem;
  children: ReactNode;
  fill?: boolean;
}) {
  const shell = (
    <>
      <AdminNav current={current} />
      <main
        className={`mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-5 pt-6 sm:px-6 ${
          fill ? "min-h-0 gap-6 overflow-hidden pb-6" : "pb-16"
        }`}
      >
        {children}
      </main>
    </>
  );
  if (!fill) {
    return shell;
  }
  return <div className="flex h-dvh flex-col overflow-hidden">{shell}</div>;
}
