import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import ProductDetailPage from './ProductDetailPage';

vi.mock('react-router-dom', () => ({ useParams: () => ({ id: '1' }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ token: 'test-session' }) }));
vi.mock('../context/CartContext', () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('failed product fetch displays a retry action that loads the product', async () => {
  const product = { id: '1', name: 'Review Tea', description: 'Tea', image: '', category: 'Tea', price: 100, availability: 'In Stock', stockQuantity: 1 };
  const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response(JSON.stringify({ product })));
  vi.stubGlobal('fetch', fetch);
  render(<ProductDetailPage />);
  await screen.findByText('Network error. Please try again.');
  expect(screen.queryByText('Product not found.')).toBeNull();
  fireEvent.click(screen.getByText('Try again'));
  await screen.findAllByText('Review Tea');
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Network error. Please try again.')).toBeNull();
});
