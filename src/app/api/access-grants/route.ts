import { cookies } from "next/headers";
import { adminApi } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const response = await fetch(adminApi("/api/admin/access-grants"), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  return Response.json(data, { status: response.status });
}

export async function POST(req: Request) {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { email?: string };
  const response = await fetch(adminApi("/api/admin/access-grants"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: body.email ?? "" }),
    cache: "no-store",
  });
  const data = await response.json();
  return Response.json(data, { status: response.status });
}
