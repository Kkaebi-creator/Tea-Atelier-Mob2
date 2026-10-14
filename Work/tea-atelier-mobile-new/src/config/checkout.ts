import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import { API_URL } from './api';
import { fetchApi, ensureOk } from './request';

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

function requestKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function placeOrder(token: string, account: string, payload: Record<string, unknown>): Promise<{ orderId: number }> {
  const storageKey = `checkout_attempt_${await digest(account)}`;
  const fingerprint = await digest(JSON.stringify(payload));
  const { value } = await Preferences.get({ key: storageKey });
  let saved: { fingerprint?: string; key?: string } | null = null;
  try { saved = value ? JSON.parse(value) : null; } catch { /* Replace unusable local metadata. */ }
  const key = saved?.fingerprint === fingerprint && typeof saved.key === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.key)
    ? saved.key : requestKey();
  // Persist before sending; retry a lost response with the same UUID, including after restart.
  await Preferences.set({ key: storageKey, value: JSON.stringify({ fingerprint, key }) });
  const response = await fetchApi(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': key },
    body: JSON.stringify(payload),
  });
  await ensureOk(response, 'Unable to place order.');
  const result = await response.json();
  const orderId = Number(result.orderId);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) throw new Error('Unable to confirm the order response. Please try again.');
  // A confirmed response ends this attempt. Failure to clear metadata must not resubmit an order.
  await Preferences.remove({ key: storageKey }).catch(() => undefined);
  return { orderId };
}

export type PaymentStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'unknown';

export function readPaymentStatus(value: unknown): PaymentStatus {
  const status = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return ['pending', 'processing', 'paid', 'failed', 'cancelled'].includes(status)
    ? status as PaymentStatus : 'unknown';
}

export function resolvePaymentStatus(stored: unknown, verified?: PaymentStatus | null): PaymentStatus {
  const status = readPaymentStatus(stored);
  if (status === 'paid' || verified === 'paid') return 'paid';
  if (status === 'cancelled' || verified === 'cancelled') return 'cancelled';
  return verified ?? status;
}

export async function openPaymentSource(token: string, orderId: number, type: string): Promise<{ checkoutUrl?: string; paymentStatus?: PaymentStatus }> {
  const response = await fetchApi(`${API_URL}/api/payments/paymongo/source`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orderId, type, returnTarget: Capacitor.getPlatform() === 'android' ? 'android' : Capacitor.isNativePlatform() ? 'website' : 'mobile' }),
  });
  const result = await response.json().catch(() => null);
  const status = readPaymentStatus(result?.paymentStatus);
  // The backend uses 409 for an existing paid, processing or cancelled payment.
  // These are confirmed state changes, not permission to start another attempt.
  if (response.status === 409 && ['paid', 'processing', 'cancelled'].includes(status)) {
    return { paymentStatus: status };
  }
  if (!response.ok) {
    throw new Error(typeof result?.error === 'string' ? result.error : 'Unable to start payment.');
  }
  if (['paid', 'processing', 'cancelled'].includes(status)) return { paymentStatus: status };
  if (typeof result?.checkoutUrl !== 'string' || !result.checkoutUrl) {
    throw new Error('Payment link is unavailable. Please check payment status.');
  }
  return {
    checkoutUrl: result.checkoutUrl,
    ...(status !== 'unknown' ? { paymentStatus: status } : {}),
  };
}
