import { pool } from "@/lib/db";

let tablesReady: Promise<void> | null = null;

export function ensureCustomerFeatureTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS product_reviews (
          review_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          order_id INT NOT NULL REFERENCES orders(order_id),
          product_id INT NOT NULL REFERENCES products(product_id),
          rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT now(),
          UNIQUE (user_id, order_id, product_id)
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS refund_requests (
          refund_id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(user_id),
          order_id INT NOT NULL REFERENCES orders(order_id),
          reason TEXT NOT NULL,
          refund_status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
          created_at TIMESTAMP DEFAULT now(),
          updated_at TIMESTAMP DEFAULT now(),
          UNIQUE (user_id, order_id)
        )
      `);
    })().catch((error) => {
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}
