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
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  const result = await pool.query(
    `SELECT r.review_id, r.user_id, r.order_id, r.product_id, r.rating, r.review_text, r.created_at,
            u.first_name, u.last_name
     FROM product_reviews r
     JOIN users u ON u.user_id = r.user_id
     WHERE r.product_id = COALESCE($1::int, r.product_id)
     ORDER BY r.created_at DESC`,
    [productId]
  );
  return addCorsHeaders(NextResponse.json({ reviews: result.rows.map((row) => ({
    id: row.review_id,
    orderId: row.order_id,
    productId: row.product_id,
    rating: row.rating,
    text: row.review_text,
    author: row.user_id === userId ? "You" : `${row.first_name} ${row.last_name[0]}.`,
    createdAt: row.created_at,
  })) }));
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  if (!userId) return addCorsHeaders(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  await ensureCustomerFeatureTables();
  const { orderId, productId, rating, reviewText } = await req.json();
  if (!orderId || !productId || !rating || !reviewText?.trim()) {
    return addCorsHeaders(NextResponse.json({ error: "Order, product, rating, and review text are required." }, { status: 400 }));
  }
  if (rating < 1 || rating > 5) return addCorsHeaders(NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 }));

  const ownership = await pool.query(
    `SELECT oi.order_items_id FROM order_items oi
     JOIN orders o ON o.order_id = oi.order_id
     WHERE o.order_id = $1 AND o.user_id = $2 AND oi.product_id = $3`,
    [orderId, userId, productId]
  );
  if (ownership.rows.length === 0) return addCorsHeaders(NextResponse.json({ error: "You can only review products from your own orders." }, { status: 403 }));

  const result = await pool.query(
    `INSERT INTO product_reviews (user_id, order_id, product_id, rating, review_text)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, order_id, product_id)
     DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text, created_at = now()
     RETURNING review_id, order_id, product_id, rating, review_text, created_at`,
    [userId, orderId, productId, rating, reviewText.trim()]
  );
  return addCorsHeaders(NextResponse.json({ review: result.rows[0] }));
}
