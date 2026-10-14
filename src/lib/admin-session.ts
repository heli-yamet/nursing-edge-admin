import { adminApi } from "@/lib/site";

const COOKIE = "admin_token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function saveAdminToken(token: string): void {
  document.cookie = `${COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}`;
}

export function clearAdminToken(): void {
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
}

export function readAdminToken(): string {
  const parts = document.cookie.split("; ");
  for (const part of parts) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (part.slice(0, separator) === COOKIE) {
      return decodeURIComponent(part.slice(separator + 1));
    }
  }
  return "";
}

export async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = readAdminToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(adminApi(path), {
    ...init,
    headers,
  });
}
