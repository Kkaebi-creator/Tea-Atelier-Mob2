import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

import { pool } from "../lib/db";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
} from "../lib/auth-server";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from "../lib/email";
import cloudinary from "../lib/cloudinary";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const googleClient = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getUserId(req: Request): number | null {
  const auth = req.headers["authorization"] as string | undefined;
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    return verifyToken(auth.slice(7)).userId;
  } catch {
    return null;
  }
}

function requireAuth(req: Request, res: Response): number | null {
  const id = getUserId(req);
  if (!id) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return id;
}

function requireAdmin(
  req: Request,
  res: Response
): { userId: number; email: string; role: string } | null {
  const auth = req.headers["authorization"] as string | undefined;
  const token = auth?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Not authenticated." });
    return null;
  }
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== "admin") {
      res.status(403).json({ error: "Admins only." });
      return null;
    }
    return decoded;
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

app.post("/api/login", async (req: Request, res: Response) => {
  const { email, password, totpCode } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password." });

  if (user.totp_enabled) {
    if (!totpCode) return res.status(200).json({ requiresTotp: true });
    const totp = new OTPAuth.TOTP({
      issuer: "Tea Atelier",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totp_secret),
    });
    if (totp.validate({ token: totpCode, window: 1 }) === null) {
      return res.status(401).json({ error: "Invalid authentication code." });
    }
  }

  const token = signToken({ userId: user.user_id, email: user.email, role: user.role });
  return res.json({
    token,
    user: { name: `${user.first_name} ${user.last_name}`, email: user.email, role: user.role },
  });
});

app.post("/api/signup", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phoneNumber, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const existing = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    if (phoneNumber) {
      const existingPhone = await pool.query(
        "SELECT user_id FROM users WHERE phone_number = $1",
        [phoneNumber]
      );
      if (existingPhone.rows.length > 0) {
        return res.status(409).json({ error: "An account with this phone number already exists." });
      }
    }

    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, verification_token, verification_token_expires)
       VALUES ($1, $2, $3, $4, $5, 'customer', $6, $7)
       RETURNING user_id, first_name, last_name, email, phone_number, role`,
      [firstName, lastName, email, phoneNumber || null, passwordHash, verificationToken, tokenExpires]
    );
    const user = result.rows[0];
    const token = signToken({ userId: user.user_id, email: user.email, role: user.role });

    sendVerificationEmail(user.email, verificationToken).catch(console.error);

    return res.json({
      token,
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone_number,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Unable to create account." });
  }
});

app.get("/api/whoami", async (req: Request, res: Response) => {
  const auth = req.headers["authorization"] as string | undefined;
  const token = auth?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Not authenticated." });

  try {
    const decoded = verifyToken(token);
    const result = await pool.query(
      "SELECT user_id, first_name, last_name, email, role, phone_number, is_verified FROM users WHERE user_id = $1",
      [decoded.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "User not found." });

    return res.json({
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        phone: user.phone_number,
        isVerified: user.is_verified,
      },
    });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});

app.patch("/api/user", async (req: Request, res: Response) => {
  const auth = req.headers["authorization"] as string | undefined;
  const token = auth?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized." });

  try {
    const decoded = verifyToken(token);
    const { firstName, lastName, phoneNumber } = req.body;
    if (!firstName || !lastName) {
      return res.status(400).json({ error: "First and last name are required." });
    }

    const result = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone_number = $3
       WHERE user_id = $4
       RETURNING user_id, first_name, last_name, email, phone_number, role`,
      [firstName, lastName, phoneNumber || null, decoded.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found." });

    const user = result.rows[0];
    return res.json({
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone_number,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return res.status(500).json({ error: "Unable to update profile." });
  }
});

app.post("/api/forgot-password", async (req: Request, res: Response) => {
  const { email } = req.body;
  const genericMsg = { message: "If an account exists for that email, a reset link has been sent." };
  try {
    const { rows } = await pool.query("SELECT user_id FROM users WHERE email = $1", [email]);
    if (rows.length === 0) return res.json(genericMsg);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      "UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE user_id = $3",
      [tokenHash, expires, rows[0].user_id]
    );
    await sendPasswordResetEmail(email, rawToken);
    return res.json(genericMsg);
  } catch (error) {
    console.error("forgot-password error:", error);
    return res.status(500).json({ error: "Something went wrong." });
  }
});

app.post("/api/reset-password", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "Invalid request." });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const { rows } = await pool.query(
    "SELECT user_id, reset_token_expires FROM users WHERE reset_token_hash = $1",
    [tokenHash]
  );

  if (rows.length === 0 || new Date(rows[0].reset_token_expires) < new Date()) {
    return res.status(400).json({ error: "This reset link is invalid or has expired." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    "UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE user_id = $2",
    [passwordHash, rows[0].user_id]
  );
  return res.json({ message: "Password updated successfully." });
});

app.post("/api/resend-verification", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const userResult = await pool.query(
    "SELECT email, is_verified FROM users WHERE user_id = $1",
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.is_verified) return res.status(400).json({ error: "Your email is already verified." });

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await pool.query(
    "UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE user_id = $3",
    [verificationToken, tokenExpires, userId]
  );

  try {
    await sendVerificationEmail(user.email, verificationToken);
  } catch {
    return res.status(500).json({ error: "Unable to send email. Please try again later." });
  }
  return res.json({ success: true });
});

app.get("/api/verify-email", async (req: Request, res: Response) => {
  const token = req.query["token"] as string;
  if (!token) return res.status(400).json({ error: "Missing verification token." });

  const result = await pool.query(
    "SELECT user_id, verification_token_expires FROM users WHERE verification_token = $1",
    [token]
  );
  const user = result.rows[0];
  if (!user) return res.status(400).json({ error: "Invalid verification link." });
  if (new Date(user.verification_token_expires) < new Date()) {
    return res.status(400).json({ error: "This verification link has expired." });
  }

  await pool.query(
    "UPDATE users SET is_verified = true, verification_token = NULL, verification_token_expires = NULL WHERE user_id = $1",
    [user.user_id]
  );
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Google Auth
// ---------------------------------------------------------------------------

app.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing Google credential." });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(401).json({ error: "Invalid Google credential." });

    const { email, given_name, family_name, sub: googleId, email_verified } = payload;
    if (!email_verified) return res.status(401).json({ error: "Google email not verified." });

    const existing = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    let user;

    if (existing.rows.length > 0) {
      user = existing.rows[0];
      if (!user.google_id) {
        await pool.query("UPDATE users SET google_id = $1 WHERE user_id = $2", [googleId, user.user_id]);
      }
    } else {
      const result = await pool.query(
        `INSERT INTO users (first_name, last_name, email, password_hash, role, google_id, is_verified)
         VALUES ($1, $2, $3, NULL, 'customer', $4, true)
         RETURNING user_id, first_name, last_name, email, role`,
        [given_name || "Google", family_name || "User", email, googleId]
      );
      user = result.rows[0];
      sendWelcomeEmail(user.email, user.first_name).catch(console.error);
    }

    if (user.role === "admin") {
      return res.status(403).json({ error: "Administrators must sign in through the admin portal." });
    }

    const token = signToken({ userId: user.user_id, email: user.email, role: user.role });
    return res.json({
      token,
      user: {
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone_number || null,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({ error: "Unable to sign in with Google." });
  }
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

app.get("/api/products", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT product_id, product_name, product_desc, product_image, category, price, status, stock_quantity
       FROM products WHERE is_archived = false ORDER BY product_id DESC`
    );
    const products = result.rows.map((row) => ({
      id: String(row.product_id),
      name: row.product_name,
      description: row.product_desc,
      image: row.product_image,
      category: row.category,
      price: parseFloat(row.price),
      availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
      stockQuantity: row.stock_quantity,
    }));
    return res.json({ products });
  } catch {
    return res.status(500).json({ error: "Unable to load products." });
  }
});

app.get("/api/products/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT product_id, product_name, product_desc, product_image, category, price, status, stock_quantity
       FROM products WHERE product_id = $1 AND is_archived = false`,
      [req.params.id]
    );
    const row = result.rows[0];
    if (!row) return res.status(404).json({ error: "Product not found." });
    return res.json({
      product: {
        id: String(row.product_id),
        name: row.product_name,
        description: row.product_desc,
        image: row.product_image,
        category: row.category,
        price: parseFloat(row.price),
        availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
        stockQuantity: row.stock_quantity,
      },
    });
  } catch {
    return res.status(500).json({ error: "Unable to load product." });
  }
});

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

app.get("/api/cart", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const result = await pool.query(
    `SELECT p.product_id, p.product_name, p.category, p.price, p.product_image,
            p.product_desc, p.status, p.stock_quantity, c.quantity AS cart_quantity
     FROM cart c JOIN products p ON p.product_id = c.product_id WHERE c.user_id = $1`,
    [userId]
  );
  return res.json(
    result.rows.map((row) => ({
      product: {
        id: String(row.product_id),
        name: row.product_name,
        category: row.category,
        price: parseFloat(row.price),
        image: row.product_image,
        description: row.product_desc,
        availability: row.status === "IN STOCK" ? "In Stock" : "Out of Stock",
        stockQuantity: row.stock_quantity,
      },
      quantity: row.cart_quantity,
    }))
  );
});

app.post("/api/cart", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: "productId is required" });

  const productResult = await pool.query(
    "SELECT stock_quantity FROM products WHERE product_id = $1",
    [productId]
  );
  const product = productResult.rows[0];
  if (!product) return res.status(404).json({ error: "Product not found." });

  const existing = await pool.query(
    "SELECT quantity FROM cart WHERE user_id = $1 AND product_id = $2",
    [userId, productId]
  );
  const currentQty = existing.rows[0]?.quantity || 0;
  if (currentQty + quantity > product.stock_quantity) {
    return res.status(400).json({ error: `Only ${product.stock_quantity} in stock.` });
  }

  if (existing.rows.length > 0) {
    await pool.query(
      "UPDATE cart SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3",
      [quantity, userId, productId]
    );
  } else {
    await pool.query(
      "INSERT INTO cart (user_id, product_id, quantity) VALUES ($1, $2, $3)",
      [userId, productId, quantity]
    );
  }
  return res.json({ success: true });
});

app.delete("/api/cart", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  await pool.query("DELETE FROM cart WHERE user_id = $1", [userId]);
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

app.get("/api/orders", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const page = parseInt((req.query["page"] as string) || "1", 10);
  const pageSize = 4;
  const offset = (page - 1) * pageSize;

  const countResult = await pool.query(
    "SELECT COUNT(*) FROM orders WHERE user_id = $1",
    [userId]
  );
  const totalPages = Math.ceil(parseInt(countResult.rows[0].count, 10) / pageSize);

  const ordersResult = await pool.query(
    `SELECT order_id, shipping_cost, total_amount, order_status, payment_method, recipient_name, created_at
     FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [userId, pageSize, offset]
  );

  const orders = await Promise.all(
    ordersResult.rows.map(async (order) => {
      const itemsResult = await pool.query(
        `SELECT oi.quantity, oi.price, p.product_name, p.product_image
         FROM order_items oi JOIN products p ON p.product_id = oi.product_id
         WHERE oi.order_id = $1`,
        [order.order_id]
      );
      return {
        id: order.order_id,
        status: order.order_status,
        paymentMethod: order.payment_method,
        recipientName: order.recipient_name,
        shippingCost: parseFloat(order.shipping_cost),
        totalAmount: parseFloat(order.total_amount),
        createdAt: order.created_at,
        items: itemsResult.rows.map((item) => ({
          name: item.product_name,
          image: item.product_image,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })),
      };
    })
  );

  return res.json({ orders, totalPages, currentPage: page });
});

app.post("/api/orders", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { street, city, province, deliveryFee, paymentMethod, phone, fullName } = req.body;
  if (!street || !city || !province) {
    return res.status(400).json({ error: "All address fields are required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cartResult = await client.query(
      `SELECT c.product_id, c.quantity, p.price, p.stock_quantity, p.product_name
       FROM cart c JOIN products p ON p.product_id = c.product_id WHERE c.user_id = $1`,
      [userId]
    );
    if (cartResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Your cart is empty." });
    }

    for (const item of cartResult.rows) {
      if (item.quantity > item.stock_quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Only ${item.stock_quantity} left of ${item.product_name}.` });
      }
    }

    const addressResult = await client.query(
      `INSERT INTO user_address (user_id, address_line1, address_line2)
       VALUES ($1, $2, $3) RETURNING address_id`,
      [userId, street, `${city}, ${province}`]
    );
    const addressId = addressResult.rows[0].address_id;

    const subtotal = cartResult.rows.reduce(
      (sum: number, item: { price: string; quantity: number }) =>
        sum + parseFloat(item.price) * item.quantity,
      0
    );
    const shippingCost = parseFloat(deliveryFee) || 0;
    const totalAmount = subtotal + shippingCost;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, address_id, shipping_cost, total_amount, order_status, payment_method, contact_phone, recipient_name)
       VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7) RETURNING order_id`,
      [userId, addressId, shippingCost, totalAmount, paymentMethod || "cod", phone || null, fullName || null]
    );
    const orderId = orderResult.rows[0].order_id;

    for (const item of cartResult.rows) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)",
        [orderId, item.product_id, item.quantity, item.price]
      );
      await client.query(
        "UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2",
        [item.quantity, item.product_id]
      );
    }

    await client.query("DELETE FROM cart WHERE user_id = $1", [userId]);
    await client.query("COMMIT");

    return res.json({
      orderId,
      subtotal: subtotal.toFixed(2),
      deliveryFee: shippingCost.toFixed(2),
      total: totalAmount.toFixed(2),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Unable to place order." });
  } finally {
    client.release();
  }
});

app.get("/api/orders/:orderId", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const orderResult = await pool.query(
    `SELECT order_id, user_id, shipping_cost, total_amount, order_status,
            created_at, payment_method, contact_phone, recipient_name
     FROM orders WHERE order_id = $1`,
    [req.params.orderId]
  );
  const order = orderResult.rows[0];
  if (!order || order.user_id !== userId) {
    return res.status(404).json({ error: "Order not found" });
  }

  const itemsResult = await pool.query(
    `SELECT oi.product_id, oi.quantity, oi.price, p.product_name, p.product_image
     FROM order_items oi JOIN products p ON p.product_id = oi.product_id
     WHERE oi.order_id = $1`,
    [req.params.orderId]
  );
  const subtotal = itemsResult.rows.reduce(
    (sum: number, row: { price: string; quantity: number }) =>
      sum + parseFloat(row.price) * row.quantity,
    0
  );

  return res.json({
    orderId: order.order_id,
    recipientName: order.recipient_name,
    orderStatus: order.order_status,
    paymentMethod: order.payment_method,
    createdAt: order.created_at,
    subtotal,
    deliveryFee: parseFloat(order.shipping_cost),
    total: parseFloat(order.total_amount),
    items: itemsResult.rows.map((row) => ({
      productId: row.product_id,
      name: row.product_name,
      image: row.product_image,
      quantity: row.quantity,
      price: parseFloat(row.price),
    })),
  });
});

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

app.get("/api/addresses", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { rows } = await pool.query(
    `SELECT address_id, address_line1, address_line2, address_line3, default_address, default_billing
     FROM user_address WHERE user_id = $1 AND is_deleted = false
     ORDER BY default_address DESC, address_id ASC`,
    [userId]
  );
  return res.json({ addresses: rows });
});

app.post("/api/addresses", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { addressLine1, addressLine2, addressLine3 } = req.body;
  if (!addressLine1?.trim()) {
    return res.status(400).json({ error: "Address line 1 is required." });
  }

  const result = await pool.query(
    `INSERT INTO user_address (user_id, address_line1, address_line2, address_line3, default_address, default_billing, is_deleted)
     VALUES ($1, $2, $3, $4, false, false, false)
     RETURNING address_id, address_line1, address_line2, address_line3, default_address, default_billing`,
    [userId, addressLine1.trim(), addressLine2?.trim() || null, addressLine3?.trim() || null]
  );
  return res.json({ address: result.rows[0] });
});

app.delete("/api/addresses/:id", async (req: Request, res: Response) => {
  const auth = req.headers["authorization"] as string | undefined;
  const token = auth?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized." });

  try {
    const decoded = verifyToken(token);
    const result = await pool.query(
      "UPDATE user_address SET is_deleted = true WHERE address_id = $1 AND user_id = $2 RETURNING address_id",
      [req.params.id, decoded.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Address not found." });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Unable to delete address." });
  }
});

// ---------------------------------------------------------------------------
// 2FA
// ---------------------------------------------------------------------------

app.get("/api/2fa/status", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const result = await pool.query("SELECT totp_enabled FROM users WHERE user_id = $1", [userId]);
  return res.json({ enabled: result.rows[0]?.totp_enabled || false });
});

app.post("/api/2fa/setup", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const userResult = await pool.query("SELECT email FROM users WHERE user_id = $1", [userId]);
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: "User not found." });

  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: "Tea Atelier",
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  await pool.query("UPDATE users SET totp_secret = $1 WHERE user_id = $2", [secret.base32, userId]);
  const qrDataUrl = await QRCode.toDataURL(totp.toString());
  return res.json({ qrCode: qrDataUrl, secret: secret.base32 });
});

app.post("/api/2fa/confirm", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Code is required." });

  const userResult = await pool.query("SELECT totp_secret FROM users WHERE user_id = $1", [userId]);
  const user = userResult.rows[0];
  if (!user?.totp_secret) return res.status(400).json({ error: "No pending 2FA setup found." });

  const totp = new OTPAuth.TOTP({
    issuer: "Tea Atelier",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(user.totp_secret),
  });
  if (totp.validate({ token: code, window: 1 }) === null) {
    return res.status(400).json({ error: "Invalid code. Please try again." });
  }

  await pool.query("UPDATE users SET totp_enabled = true WHERE user_id = $1", [userId]);
  return res.json({ success: true });
});

app.post("/api/2fa/disable", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  await pool.query(
    "UPDATE users SET totp_enabled = false, totp_secret = NULL WHERE user_id = $1",
    [userId]
  );
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

app.get("/api/admin/overview", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const [lowStockResult, statsResult, topProductsResult] = await Promise.all([
    pool.query(
      "SELECT product_id, product_name, stock_quantity FROM products WHERE is_archived = false ORDER BY stock_quantity ASC LIMIT 5"
    ),
    pool.query(`
      SELECT
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS revenue,
        (SELECT COUNT(*) FROM products) AS total_products,
        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers
    `),
    pool.query(`
      SELECT p.product_id, p.product_name, SUM(oi.quantity) AS units_sold, SUM(oi.quantity * oi.price) AS revenue
      FROM order_items oi JOIN products p ON p.product_id = oi.product_id
      GROUP BY p.product_id, p.product_name ORDER BY revenue DESC LIMIT 5
    `),
  ]);

  const stats = statsResult.rows[0];
  return res.json({
    stats: {
      totalOrders: parseInt(stats.total_orders, 10),
      revenue: parseFloat(stats.revenue),
      totalProducts: parseInt(stats.total_products, 10),
      totalCustomers: parseInt(stats.total_customers, 10),
    },
    topProducts: topProductsResult.rows.map((row) => ({
      id: row.product_id,
      name: row.product_name,
      revenue: parseFloat(row.revenue),
      unitsSold: parseInt(row.units_sold, 10),
    })),
    lowStock: lowStockResult.rows.map((row) => ({
      id: row.product_id,
      name: row.product_name,
      stockQuantity: parseInt(row.stock_quantity, 10),
    })),
  });
});

app.get("/api/admin/products", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const result = await pool.query(
    `SELECT product_id, product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity, is_archived
     FROM products ORDER BY product_id DESC`
  );
  return res.json({
    products: result.rows.map((row) => ({
      id: String(row.product_id),
      name: row.product_name,
      description: row.product_desc,
      image: row.product_image,
      category: row.category,
      subCategory: row.sub_category,
      type: row.type,
      price: parseFloat(row.price),
      availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
      stockQuantity: row.stock_quantity,
      isArchived: row.is_archived,
    })),
  });
});

app.post("/api/admin/products", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { name, category, subCategory, type, price, image, description, stockQuantity } = req.body;
  const status = stockQuantity > 0 ? "IN STOCK" : "NO STOCK";

  const result = await pool.query(
    `INSERT INTO products (product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING product_id, product_name, product_desc, product_image, category, sub_category, type, price, status, stock_quantity`,
    [name, description, image, category, subCategory || null, type || null, price, status, stockQuantity]
  );
  const row = result.rows[0];
  return res.json({
    product: {
      id: String(row.product_id),
      name: row.product_name,
      description: row.product_desc,
      image: row.product_image,
      category: row.category,
      subCategory: row.sub_category,
      type: row.type,
      price: parseFloat(row.price),
      availability: row.status === "NO STOCK" ? "Out of Stock" : "In Stock",
      stockQuantity: row.stock_quantity,
    },
  });
});

app.get("/api/admin/customers", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const result = await pool.query(`
    SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone_number,
           u.is_verified, u.date_created,
           COUNT(o.order_id) AS order_count,
           COALESCE(SUM(o.total_amount), 0) AS total_spent
    FROM users u LEFT JOIN orders o ON o.user_id = u.user_id
    WHERE u.role = 'customer'
    GROUP BY u.user_id ORDER BY u.date_created DESC
  `);
  return res.json({
    customers: result.rows.map((row) => ({
      id: row.user_id,
      name: `${row.first_name} ${row.last_name}`,
      email: row.email,
      phone: row.phone_number,
      isVerified: row.is_verified,
      orderCount: parseInt(row.order_count, 10),
      totalSpent: parseFloat(row.total_spent),
      joinedAt: row.date_created,
    })),
  });
});

app.get("/api/admin/orders", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const result = await pool.query(`
    SELECT o.order_id, o.total_amount, o.order_status, o.payment_method,
           o.recipient_name, o.created_at, u.email AS customer_email,
           COUNT(oi.order_items_id) AS item_count
    FROM orders o JOIN users u ON u.user_id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.order_id
    GROUP BY o.order_id, u.email ORDER BY o.created_at DESC
  `);
  return res.json({
    orders: result.rows.map((row) => ({
      id: row.order_id,
      customerEmail: row.customer_email,
      recipientName: row.recipient_name,
      totalAmount: parseFloat(row.total_amount),
      status: row.order_status,
      paymentMethod: row.payment_method,
      itemCount: parseInt(row.item_count, 10),
      createdAt: row.created_at,
    })),
  });
});

app.post(
  "/api/admin/upload",
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    if (!req.file) return res.status(400).json({ error: "No file provided." });

    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "tea-atelier" }, (err, result) => {
          if (err || !result) reject(err);
          else resolve(result as { secure_url: string });
        })
        .end(req.file!.buffer);
    });

    return res.json({ url: uploadResult.secure_url });
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
