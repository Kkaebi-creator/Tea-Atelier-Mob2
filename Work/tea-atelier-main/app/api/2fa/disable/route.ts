import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() { return handleCorsOptions(); }

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return addCorsHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

  await pool.query(
    "UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE user_id = $1",
    [userId]
  );

  return addCorsHeaders(NextResponse.json({ success: true }));
}