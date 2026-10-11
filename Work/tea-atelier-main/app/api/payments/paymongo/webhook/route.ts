import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { verifyPayMongoWebhook } from "@/lib/paymongo";

export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!verifyPayMongoWebhook(req.headers.get("paymongo-signature"), rawBody)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const eventType = payload?.data?.attributes?.type || "";
  const eventData = payload?.data?.attributes?.data?.attributes || {};
  const metadata = eventData.metadata || {};
  const orderId = Number(metadata.order_id);
  if (!Number.isInteger(orderId)) return NextResponse.json({ received: true });

  await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID'");
  await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymongo_checkout_session_id VARCHAR(120)");
  await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS paymongo_payment_id VARCHAR(120)");

  const paid = eventType.includes("paid") || eventType.includes("succeeded");
  const failed = eventType.includes("failed") || eventType.includes("cancelled");
  if (paid || failed) {
    await pool.query(
      `UPDATE orders
       SET payment_status = $1, paymongo_payment_id = COALESCE($2, paymongo_payment_id)
       WHERE order_id = $3`,
      [paid ? "PAID" : "FAILED", eventData.payment_intent_id || eventData.payment_id || null, orderId]
    );
  }

  return NextResponse.json({ received: true });
}
