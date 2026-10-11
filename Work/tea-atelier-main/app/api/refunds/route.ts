import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { ensureCustomerFeatureTables } from "@/lib/db/customer-features";
import { getUserId } from "@/lib/api-auth";
import { addCorsHeaders, handleCorsOptions } from "@/lib/cors";

export async function OPTIONS() { return handleCorsOptions(); }

export async function GET(req: Request) {
  const userId = getUserId(req);
  if (!userId) return addCorsHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  await ensureCustomerFeatureTables();
  const orderId = new URL(req.url).searchParams.get("orderId");
  const result = await pool.query(
    `SELECT refund_id, order_id, reason, refund_status, created_at, updated_at
     FROM refund_requests
     WHERE user_id = $1 AND ($2::int IS NULL OR order_id = $2)
     ORDER BY created_at DESC`,
    [userId, orderId]
  );
  return addCorsHeaders(NextResponse.json({ refunds: result.rows }));
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return addCorsHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  await ensureCustomerFeatureTables();
  const { orderId, reason } = await req.json();
  if (!orderId || !reason?.trim()) return addCorsHeaders(NextResponse.json({ error: "Order and refund reason are required." }, { status: 400 }));

  const ownership = await pool.query(
    "SELECT order_id, order_status FROM orders WHERE order_id = $1 AND user_id = $2",
    [orderId, userId]
  );
  const order = ownership.rows[0];
  if (!order) return addCorsHeaders(NextResponse.json({ error: "Order not found." }, { status: 404 }));
  if (["DELIVERED", "CANCELLED"].includes(String(order.order_status).toUpperCase())) {
    return addCorsHeaders(NextResponse.json({ error: "This order is no longer eligible for a refund request." }, { status: 400 }));
  }

  const result = await pool.query(
    `INSERT INTO refund_requests (user_id, order_id, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, order_id)
     DO UPDATE SET reason = EXCLUDED.reason, updated_at = now()
     RETURNING refund_id, order_id, reason, refund_status, created_at, updated_at`,
    [userId, orderId, reason.trim()]
  );
  return addCorsHeaders(NextResponse.json({ refund: result.rows[0] }));
}
