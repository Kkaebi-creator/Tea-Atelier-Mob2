import { expect, test } from "vitest";
import { paymentReturnPath, postLoginPath } from "./paymentReturn";

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

test("login keeps only a valid local confirmation destination", () => {
  expect(postLoginPath({ from: { pathname: "/order-confirmation/150" } })).toBe(
    "/order-confirmation/150",
  );
  for (const state of [
    null,
    {},
    { from: { pathname: "//evil.test" } },
    { from: { pathname: "/order-confirmation/0" } },
  ]) {
    expect(postLoginPath(state)).toBe("/shop");
  }
});

test.each([
  "/product/1",
  "/orders/5",
  "/cart",
  "/orders",
  "/account",
  "/notifications",
  "/contact",
  "/settings",
])("sign-in resumes the allowed local destination %s", (pathname) => {
  expect(postLoginPath({ from: { pathname } })).toBe(pathname);
});
test.each([
  "https://evil.test",
  "//evil.test",
  "/product/0",
  "/product/01",
  "/product/9007199254740992",
  "/product/1?next=https://evil.test",
  "/orders/5/extra",
  "/login",
  "/checkout",
])("sign-in rejects unsafe or unsupported destination %s", (pathname) => {
  expect(postLoginPath({ from: { pathname } })).toBe("/shop");
});
