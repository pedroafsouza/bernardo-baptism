import { NextRequest, NextResponse } from "next/server";
import { ADMIN_CONFIGURED, ADMIN_PASSWORD, ADMIN_SECRET, ADMIN_USER } from "@/lib/config";

/**
 * Exchanges the admin username/password for the session cookie the admin API
 * routes already understand, so the panel never has to hold the raw secret.
 */
export async function POST(req: NextRequest) {
  if (!ADMIN_CONFIGURED) {
    return NextResponse.json(
      { error: "Admin er ikke konfigureret (mangler ADMIN_USER/ADMIN_PASSWORD/ADMIN_SECRET)" },
      { status: 503 }
    );
  }

  const { username, password } = (await req.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };

  if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Forkert brugernavn eller adgangskode" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_secret", ADMIN_SECRET, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_secret", "", { path: "/", maxAge: 0 });
  return res;
}
