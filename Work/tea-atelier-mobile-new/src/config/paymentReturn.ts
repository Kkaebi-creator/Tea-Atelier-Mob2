const androidReturnOrigin = "https://ourtea-atelier.com";

function confirmationPath(orderId: string): string | null {
  if (!/^[1-9]\d*$/.test(orderId) || !Number.isSafeInteger(Number(orderId)))
    return null;
  return `/order-confirmation/${orderId}`;
}

// A return link identifies an order only. Payment status always comes from the API.
export function paymentReturnPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== androidReturnOrigin || url.username || url.password)
      return null;
    const match = /^\/payment-return\/android\/([1-9]\d*)$/.exec(url.pathname);
    return match ? confirmationPath(match[1]) : null;
  } catch {
    return null;
  }
}

export function postLoginPath(state: unknown): string {
  const pathname = (state as { from?: { pathname?: unknown } } | null)?.from
    ?.pathname;
  if (typeof pathname !== "string") return "/shop";
  if (
    [
      "/shop",
      "/cart",
      "/orders",
      "/account",
      "/notifications",
      "/contact",
      "/settings",
    ].includes(pathname)
  )
    return pathname;
  const match = /^\/(product|orders|order-confirmation)\/([1-9]\d*)$/.exec(
    pathname,
  );
  return match && Number.isSafeInteger(Number(match[2])) ? pathname : "/shop";
}

// Authentication always has a way back to a guest-accessible screen.
// Never send a guest straight back to a protected payment or order-detail route.
export function authBackPath(state: unknown): string {
  const pathname = (state as { from?: { pathname?: unknown } } | null)?.from
    ?.pathname;
  if (typeof pathname !== "string") return "/shop";
  if (
    [
      "/shop",
      "/cart",
      "/orders",
      "/account",
      "/contact",
      "/settings",
      "/notifications",
      "/about",
      "/privacy",
      "/developers",
    ].includes(pathname)
  )
    return pathname;
  const product = /^\/product\/([1-9]\d*)$/.exec(pathname);
  return product && Number.isSafeInteger(Number(product[1]))
    ? pathname
    : "/shop";
}
