import { cookies } from "next/headers";
import { adminApi } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { question_version_ids?: unknown };
  const response = await fetch(adminApi("/api/admin/question-publishes"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question_version_ids: body.question_version_ids ?? [],
    }),
    cache: "no-store",
  });
  const data = await response.json();
  return Response.json(data, { status: response.status });
}
