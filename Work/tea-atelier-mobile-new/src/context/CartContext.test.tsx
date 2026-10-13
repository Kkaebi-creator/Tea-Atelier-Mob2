import React from 'react';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';

vi.mock('./AuthContext', () => ({ useAuth: () => ({ token: 'test-session' }) }));
let cart: ReturnType<typeof useCart>;
function Probe() { cart = useCart(); return <div>{cart.error}</div>; }
const items = [{ product: { id: '1', name: 'Tea', price: 100, image: '', category: 'Tea', availability: 'In Stock', stockQuantity: 1 }, quantity: 1 }];
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('rejected add-to-cart reports the stock error instead of succeeding', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('[]')).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Only 1 in stock.' }), { status: 400 })));
  render(<CartProvider><Probe /></CartProvider>);
  await waitFor(() => expect(cart.isLoading).toBe(false));
  await act(async () => { await expect(cart.addToCart('1')).rejects.toThrow('Only 1 in stock.'); });
  expect(cart.error).toBe('Only 1 in stock.');
});

test('failed clear-cart keeps existing items', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(items))).mockResolvedValueOnce(new Response('{}', { status: 500 })));
  render(<CartProvider><Probe /></CartProvider>);
  await waitFor(() => expect(cart.items).toHaveLength(1));
  await act(async () => { await expect(cart.clearCart()).rejects.toThrow('Unable to update cart.'); });
  expect(cart.items).toEqual(items);
});

test('failed quantity update restores previous quantity and reports an error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(items))).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Stock changed.' }), { status: 400 })));
  render(<CartProvider><Probe /></CartProvider>);
  await waitFor(() => expect(cart.items).toHaveLength(1));
  await act(() => cart.updateQuantity('1', 2));
  expect(cart.items[0].quantity).toBe(1);
  expect(cart.error).toBe('Stock changed.');
});
