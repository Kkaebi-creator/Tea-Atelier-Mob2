import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import ProductDetailPage from "./ProductDetailPage";

const fixture = vi.hoisted(() => ({
  token: "test-session" as string | null,
  navigate: vi.fn(),
  add: vi.fn(),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "1" }),
  useNavigate: () => fixture.navigate,
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ token: fixture.token }),
}));
vi.mock("../context/CartContext", () => ({
  useCart: () => ({ addToCart: fixture.add }),
}));
afterEach(() => {
  cleanup();
  fixture.token = "test-session";
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("failed product fetch displays a retry action that loads the product", async () => {
  const product = {
    id: "1",
    name: "Review Tea",
    description: "Tea",
    image: "",
    category: "Tea",
    price: 100,
    availability: "In Stock",
    stockQuantity: 1,
  };
  let productRequests = 0;
  const fetch = vi.fn(async (url) => {
    if (String(url).endsWith("/api/products/1")) {
      if (++productRequests === 1) throw new TypeError("Failed to fetch");
      return new Response(JSON.stringify({ product }));
    }
    return new Response(
      '{"reviews":[],"summary":{"total":0,"average":0},"totalPages":1}',
    );
  });
  vi.stubGlobal("fetch", fetch);
  render(<ProductDetailPage />);
  await screen.findByText("Network error. Please try again.");
  expect(screen.queryByText("Product not found.")).toBeNull();
  fireEvent.click(screen.getByText("Try again"));
  await screen.findAllByText("Review Tea");
  expect(productRequests).toBe(2);
  expect(screen.queryByText("Network error. Please try again.")).toBeNull();
});

test("guest purchase intent goes to sign-in and preserves the product without a cart mutation", async () => {
  fixture.token = null;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (url) =>
        new Response(
          JSON.stringify(
            String(url).endsWith("/api/products/1")
              ? {
                  product: {
                    id: "1",
                    name: "Guest Tea",
                    image: "",
                    description: "",
                    category: "Tea",
                    price: 100,
                    availability: "In Stock",
                    stockQuantity: 1,
                  },
                }
              : {
                  reviews: [],
                  summary: { total: 0, average: 0 },
                  totalPages: 1,
                },
          ),
        ),
    ),
  );
  render(<ProductDetailPage />);
  fireEvent.click(await screen.findByText("Sign in to add to cart"));
  expect(fixture.navigate).toHaveBeenCalledWith("/login", {
    state: { from: { pathname: "/product/1" } },
  });
  expect(fixture.add).not.toHaveBeenCalled();
});
