import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

  const authHeaders = () => ({ Authorization: `Bearer ${token}` });

  const refresh = async () => {
    if (!token) { setItems([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/cart`, { headers: authHeaders() });
      if (res.ok) setItems(await res.json());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [token]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!token) return;
    await fetch(`${API_URL}/api/cart`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    await refresh();
  };

  const clearCart = async () => {
    if (!token) return;
    await fetch(`${API_URL}/api/cart`, { method: "DELETE", headers: authHeaders() });
    setItems([]);
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!token || quantity < 1) return;
    const previous = items;
    setItems((current) => current.map((item) => item.product.id === productId ? { ...item, quantity } : item));
    try {
      const res = await fetch(`${API_URL}/api/cart/${productId}`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) setItems(previous);
    } catch {
      setItems(previous);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!token) return;
    const previous = items;
    setItems((current) => current.filter((item) => item.product.id !== productId));
    try {
      const res = await fetch(`${API_URL}/api/cart/${productId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) setItems(previous);
    } catch {
      setItems(previous);
    }
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, isLoading, addToCart, updateQuantity, removeFromCart, clearCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
