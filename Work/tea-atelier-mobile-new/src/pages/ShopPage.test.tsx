import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import ShopPage from "./ShopPage";
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ token: null }) }));
vi.mock("../context/CartContext", () => ({
  useCart: () => ({ itemCount: 0 }),
}));
const product = {
  id: "1",
  name: "Catalog Tea",
  description: "",
  image: "",
  category: "Tea",
  price: 100,
  availability: "In Stock",
  stockQuantity: 1,
};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("best sellers use the dedicated API in server order rather than catalog order", async () => {
  const fetch = vi.fn(
    async (url) =>
      new Response(
        JSON.stringify({
          products: String(url).endsWith("/best-sellers")
            ? [
                { ...product, id: "8", name: "Top Seller" },
                { ...product, id: "2", name: "Second Seller" },
              ]
            : [product],
        }),
      ),
  );
  vi.stubGlobal("fetch", fetch);
  render(<ShopPage />);
  await screen.findByText("Top Seller");
  await screen.findByText("Catalog Tea");
  const section = screen.getByRole("region", { name: "Best Sellers" });
  expect(
    within(section)
      .getAllByText(/Seller$/)
      .map((e) => e.textContent),
  ).toEqual(["Top Seller", "Second Seller"]);
  expect(
    fetch.mock.calls.some((call) =>
      String(call[0]).endsWith("/api/products/best-sellers"),
    ),
  ).toBe(true);
});
test("best seller failure leaves the catalog usable and retries only that request", async () => {
  let attempts = 0;
  const fetch = vi.fn(async (url) =>
    String(url).endsWith("/best-sellers") && ++attempts === 1
      ? new Response('{"error":"Best sellers unavailable."}', { status: 503 })
      : new Response(
          JSON.stringify({
            products: String(url).endsWith("/best-sellers")
              ? [{ ...product, name: "Recovered Seller" }]
              : [product],
          }),
        ),
  );
  vi.stubGlobal("fetch", fetch);
  render(<ShopPage />);
  await screen.findByText("Catalog Tea");
  await screen.findByText("Best sellers unavailable.");
  fireEvent.click(screen.getByText("Retry best sellers"));
  await screen.findByText("Recovered Seller");
  expect(
    fetch.mock.calls.filter((call) =>
      String(call[0]).endsWith("/api/products"),
    ),
  ).toHaveLength(1);
});
test("an empty best seller response does not label catalog products as best sellers", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url) =>
        new Response(
          JSON.stringify({
            products: String(url).endsWith("/best-sellers") ? [] : [product],
          }),
        ),
    ),
  );
  render(<ShopPage />);
  await screen.findByText("Catalog Tea");
  expect(screen.queryByRole("region", { name: "Best Sellers" })).toBeNull();
});
