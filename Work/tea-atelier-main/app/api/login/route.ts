import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth-server";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";
import * as OTPAuth from "otpauth";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(req: Request) {
  const { email, password, totpCode } = await req.json();

  if (!email || !password) {
    return addCorsHeaders(NextResponse.json({ error: "Email and password are required." }, { status: 400 }));
  }

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];

  if (!user) {
    return addCorsHeaders(NextResponse.json({ error: "Invalid email or password." }, { status: 401 }));
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return addCorsHeaders(NextResponse.json({ error: "Invalid email or password." }, { status: 401 }));
  }

  if (user.totp_enabled) {
    if (!totpCode) {
      return addCorsHeaders(NextResponse.json({ requiresTotp: true }, { status: 200 }));
    }

    const totp = new OTPAuth.TOTP({
      issuer: "Tea Atelier",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totp_secret),
    });

    const delta = totp.validate({ token: totpCode, window: 1 });
    if (delta === null) {
      return addCorsHeaders(NextResponse.json({ error: "Invalid authentication code." }, { status: 401 }));
    }
  }

  const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

  return addCorsHeaders(NextResponse.json({
    token,
    user: { name: `${user.first_name} ${user.last_name}`, email: user.email, role: user.role },
  }));
}