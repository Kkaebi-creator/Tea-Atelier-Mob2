import { expect, test } from "vitest";
import { authBackPath, paymentReturnPath } from "./paymentReturn";

test("Android return identifies the order without accepting payment claims", () => {
  expect(
    paymentReturnPath(
      "https://ourtea-atelier.com/payment-return/android/150?payment=paid&token=untrusted",
    ),
  ).toBe("/order-confirmation/150");
});

test.each([
  "http://ourtea-atelier.com/payment-return/android/150",
  "https://ourtea-atelier.com.evil.test/payment-return/android/150",
  "https://user@ourtea-atelier.com/payment-return/android/150",
  "https://ourtea-atelier.com/order-confirmation/150",
  "https://ourtea-atelier.com/payment-return/android/0",
  "https://ourtea-atelier.com/payment-return/android/01",
  "https://ourtea-atelier.com/payment-return/android/9007199254740992",
  "https://ourtea-atelier.com/payment-return/android/150/extra",
  "intent://ourtea-atelier.com/payment-return/android/150",
])("rejects an untrusted or invalid return: %s", (url) => {
  expect(paymentReturnPath(url)).toBeNull();
});

test.each([
  "/shop",
  "/cart",
  "/orders",
  "/account",
  "/contact",
  "/settings",
  "/notifications",
  "/product/1",
  "/about",
  "/privacy",
  "/developers",
])("auth back returns to guest-accessible %s", (pathname) => {
  expect(authBackPath({ from: { pathname } })).toBe(pathname);
});
test.each([
  null,
  {},
  { from: { pathname: "/order-confirmation/150" } },
  { from: { pathname: "/checkout" } },
  { from: { pathname: "//evil.test" } },
  { from: { pathname: "/product/01" } },
  { from: { pathname: "/product/9007199254740992" } },
])(
  "auth back uses Shop instead of a protected or invalid destination: %j",
  (state) => {
    expect(authBackPath(state)).toBe("/shop");
  },
);
