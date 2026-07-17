import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const user = db
    .prepare("SELECT id, username, name, created_at FROM users WHERE id = ?")
    .get(session.userId) as
    | { id: string; username: string; name: string; created_at: string }
    | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile = db
    .prepare("SELECT onboarding_step FROM user_profiles WHERE user_id = ?")
    .get(session.userId) as { onboarding_step: string } | undefined;

  return NextResponse.json({
    ...user,
    onboarding_step: profile?.onboarding_step || "upload",
  });
}
