import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getUserId } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() { return handleCorsOptions(); }

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return addCorsHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

  const result = await pool.query("SELECT totp_enabled FROM users WHERE user_id = $1", [userId]);
  const user = result.rows[0];

  return addCorsHeaders(NextResponse.json({ enabled: user?.totp_enabled || false }));
}