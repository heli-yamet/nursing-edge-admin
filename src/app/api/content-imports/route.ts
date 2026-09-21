import { File as NodeFile } from "node:buffer";
import { cookies } from "next/headers";
import { Agent, fetch, FormData as UndiciFormData } from "undici";
import { adminApi } from "@/lib/site";

export const runtime = "nodejs";
export const maxDuration = 900;

const importAgent = new Agent({
  headersTimeout: 15 * 60 * 1000,
  bodyTimeout: 15 * 60 * 1000,
});

export async function GET(req: Request) {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const batchId = new URL(req.url).searchParams.get("batch_id");
  const path = batchId
    ? `/api/admin/content-imports?batch_id=${encodeURIComponent(batchId)}`
    : "/api/admin/content-imports";

  const response = await fetch(adminApi(path), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    dispatcher: importAgent,
  });
  const data = await response.json();
  return Response.json(data, { status: response.status });
}

export async function POST(req: Request) {
  const token = (await cookies()).get("admin_token")?.value;
  if (!token) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const incoming = await req.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { ok: false, error: "Choose a C2 .xlsx workbook" },
      { status: 400 },
    );
  }

  const forward = new UndiciFormData();
  forward.append(
    "file",
    new NodeFile([Buffer.from(await file.arrayBuffer())], file.name, {
      type: file.type,
    }),
  );

  const response = await fetch(adminApi("/api/admin/content-imports"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: forward,
    dispatcher: importAgent,
  });
  const data = await response.json();
  return Response.json(data, { status: response.status });
}
