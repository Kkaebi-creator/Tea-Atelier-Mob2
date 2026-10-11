import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";
import { sendVerificationEmail } from "@/lib/email";
import crypto from "crypto";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() { return handleCorsOptions(); }

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return addCorsHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

  const userResult = await pool.query(
    "SELECT email, is_verified FROM users WHERE user_id = $1",
    [userId]
  );
  const user = userResult.rows[0];

  if (!user) {
    return addCorsHeaders(NextResponse.json({ error: "User not found." }, { status: 404 }));
  }

  if (user.is_verified) {
    return addCorsHeaders(NextResponse.json({ error: "Your email is already verified." }, { status: 400 }));
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    "UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE user_id = $3",
    [verificationToken, tokenExpires, userId]
  );

  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch (error) {
    console.error("Failed to resend verification email:", error);
    return addCorsHeaders(NextResponse.json({ error: "Unable to send email. Please try again later." }, { status: 500 }));
  }

  return addCorsHeaders(NextResponse.json({ success: true }));
}