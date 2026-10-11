import crypto from "crypto";

const PAYMONGO_API = "https://api.paymongo.com/v1";

function authHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export async function createPayMongoCheckoutSession(input: {
  orderId: number;
  items: { name: string; quantity: number; price: number }[];
  deliveryFee: number;
  customerEmail?: string | null;
}) {
  const secretKey = process.env.PAYMONGO_SECRET_KEY;
  if (!secretKey) throw new Error("PAYMONGO_SECRET_KEY is not configured.");

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!appUrl) throw new Error("APP_URL is not configured.");

  const lineItems = input.items.map((item) => ({
    currency: "PHP",
    amount: Math.round(item.price * 100),
    name: item.name,
    quantity: item.quantity,
  }));
  if (input.deliveryFee > 0) {
    lineItems.push({ currency: "PHP", amount: Math.round(input.deliveryFee * 100), name: "Delivery Fee", quantity: 1 });
  }

  const response = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
    method: "POST",
    headers: {
      Authorization: authHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: input.customerEmail ? { email: input.customerEmail } : undefined,
          line_items: lineItems,
          payment_method_types: ["gcash"],
          description: `Tea Atelier Order #${input.orderId}`,
          metadata: { order_id: String(input.orderId) },
          success_url: `${appUrl}/order-confirmation?orderId=${input.orderId}&payment=success`,
          cancel_url: `${appUrl}/checkout?payment=cancelled`,
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.errors?.[0]?.detail || "Unable to create PayMongo checkout session.");
  return {
    id: data.data.id as string,
    checkoutUrl: data.data.attributes.checkout_url as string,
  };
}

export function verifyPayMongoWebhook(signatureHeader: string | null, rawBody: string) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const parts = Object.fromEntries(signatureHeader.split(",").map((part) => part.split("=")));
  const timestamp = parts.t;
  const signature = parts.li || parts.te;
  if (!timestamp || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
