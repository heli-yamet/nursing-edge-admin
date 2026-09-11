export function adminApi(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

export const STATUS_SITE_URL = process.env.NEXT_PUBLIC_STATUS_URL;
