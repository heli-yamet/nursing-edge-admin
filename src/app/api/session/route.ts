import { cookies } from "next/headers";

const COOKIE = "admin_token";

export async function POST(req: Request) {
  const body = (await req.json()) as { token?: string };
  const token = body.token ?? "";
  if (!token) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(COOKIE);
  return Response.json({ ok: true });
}
