import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import db from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password, name } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password required" }, { status: 400 });
  }

  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const id = uuid();

  db.prepare("INSERT INTO users (id, username, password_hash, name) VALUES (?, ?, ?, ?)").run(
    id, username, password_hash, name || null
  );

  db.prepare(
    "INSERT INTO user_profiles (id, user_id, onboarding_step) VALUES (?, ?, ?)"
  ).run(uuid(), id, "upload");

  const token = await signToken({ userId: id, username });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(setAuthCookie(token));
  return res;
}
