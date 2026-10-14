export async function fetchApi(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(input, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("Request timed out. Please try again.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureOk(
  response: Response,
  fallback: string,
): Promise<void> {
  if (response.ok) return;
  const data = await response.json().catch(() => null);
  throw new Error(typeof data?.error === "string" ? data.error : fallback);
}

export function requestError(error: unknown, fallback: string): string {
  return error instanceof TypeError
    ? "Network error. Please try again."
    : error instanceof Error
      ? error.message
      : fallback;
}
