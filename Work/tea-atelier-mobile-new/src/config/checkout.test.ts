import { webcrypto } from "node:crypto";
import { TextEncoder } from "node:util";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { placeOrder, openPaymentSource } from "./checkout";

const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }) => ({ value: storage.get(key) || null })),
    set: vi.fn(async ({ key, value }) => {
      storage.set(key, value);
    }),
    remove: vi.fn(async ({ key }) => {
      storage.delete(key);
    }),
  },
}));
const payload = {
  street: "Test street",
  city: "Test city",
  province: "Test province",
  paymentMethod: "cod",
  shippingMethod: "standard",
  selectedProductIds: ["1"],
};
beforeEach(() => {
  storage.clear();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("TextEncoder", TextEncoder);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("lost order response retries with the same valid UUID and selection", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockResolvedValueOnce(new Response('{"orderId":4}'));
  vi.stubGlobal("fetch", fetch);
  await expect(
    placeOrder("token", "test@example.invalid", payload),
  ).rejects.toThrow("Failed to fetch");
  await expect(
    placeOrder("token", "test@example.invalid", payload),
  ).resolves.toEqual({ orderId: 4 });
  const first = fetch.mock.calls[0][1];
  const second = fetch.mock.calls[1][1];
  expect(first.headers["Idempotency-Key"]).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  expect(second.headers["Idempotency-Key"]).toBe(
    first.headers["Idempotency-Key"],
  );
  expect(JSON.parse(second.body).selectedProductIds).toEqual(["1"]);
  expect(storage.size).toBe(0);
});

test("changed checkout details start a different request key", async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetch);
  await expect(
    placeOrder("token", "test@example.invalid", payload),
  ).rejects.toThrow();
  await expect(
    placeOrder("token", "test@example.invalid", {
      ...payload,
      city: "Another city",
    }),
  ).rejects.toThrow();
  expect(fetch.mock.calls[1][1].headers["Idempotency-Key"]).not.toBe(
    fetch.mock.calls[0][1].headers["Idempotency-Key"],
  );
  expect([...storage.values()].join("")).not.toContain("Test street");
});

test("payment initiation uses the dedicated endpoint for the existing order", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response('{"checkoutUrl":"https://payments.example/checkout"}'),
    );
  vi.stubGlobal("fetch", fetch);
  await expect(openPaymentSource("token", 4, "gcash")).resolves.toEqual({
    checkoutUrl: "https://payments.example/checkout",
  });
  expect(fetch.mock.calls[0][0]).toMatch(/\/api\/payments\/paymongo\/source$/);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    orderId: 4,
    type: "gcash",
  });
});

test("payment API errors are exposed without creating another order", async () => {
  const fetch = vi.fn().mockResolvedValue(
    new Response('{"error":"Payment initiation is unavailable."}', {
      status: 503,
    }),
  );
  vi.stubGlobal("fetch", fetch);
  await expect(openPaymentSource("token", 4, "gcash")).rejects.toThrow(
    "Payment initiation is unavailable.",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
