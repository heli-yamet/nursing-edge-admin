export function adminApi(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  return `${base.replace(/\/$/, "")}${path}`;
}

export const STATUS_SITE_URL = process.env.NEXT_PUBLIC_STATUS_URL;
