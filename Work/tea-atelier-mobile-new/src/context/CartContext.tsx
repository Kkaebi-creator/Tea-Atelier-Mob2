import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { fetchApi, ensureOk, requestError } from "../config/request";
import { API_URL } from "../config/api";
import { useAuth } from "./AuthContext";

export type CartItem = {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    category: string;
    availability: string;
    stockQuantity: number;
  };
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  itemCount: number;
  isLoading: boolean;
  error: string;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const refresh = async () => {
    if (!token) { setItems([]); setError(""); return; }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetchApi(`${API_URL}/api/cart`, { headers: authHeaders() });
      await ensureOk(res, "Unable to load cart.");
      setItems(await res.json());
    } catch (error) {
      setError(requestError(error, "Unable to load cart."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [token]);

  const cartRequest = async (url: string, options: RequestInit) => {
    setError("");
    try {
      const response = await fetchApi(url, options);
      await ensureOk(response, "Unable to update cart.");
    } catch (error) {
      const message = requestError(error, "Unable to update cart.");
      setError(message);
      throw new Error(message);
    }
  };

  const addToCart = async (productId: string, quantity = 1) => {
    if (!token) throw new Error("Please sign in to add items to cart.");
    await cartRequest(`${API_URL}/api/cart`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    await refresh();
  };

  const clearCart = async () => {
    if (!token) return;
    await cartRequest(`${API_URL}/api/cart`, { method: "DELETE", headers: authHeaders() });
    setItems([]);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!token || quantity < 1) return;
    const previous = items;
    setItems((current) => current.map((item) => item.product.id === productId ? { ...item, quantity } : item));
    try {
      await cartRequest(`${API_URL}/api/cart/${productId}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
    } catch {
      setItems(previous);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!token) return;
    const previous = items;
    setItems((current) => current.filter((item) => item.product.id !== productId));
    try {
      await cartRequest(`${API_URL}/api/cart/${productId}`, { method: "DELETE", headers: authHeaders() });
    } catch {
      setItems(previous);
    }
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, isLoading, error, addToCart, updateQuantity, removeFromCart, clearCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
