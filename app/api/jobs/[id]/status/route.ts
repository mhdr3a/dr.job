import { NextRequest, NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/auth";
import db from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUserFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  const allowed = ["new", "saved", "dismissed", "applied"];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const match = db
    .prepare("SELECT id FROM job_matches WHERE id = ? AND user_id = ?")
    .get(id, session.userId);
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.prepare("UPDATE job_matches SET status = ? WHERE id = ?").run(status, id);
  return NextResponse.json({ ok: true });
}
