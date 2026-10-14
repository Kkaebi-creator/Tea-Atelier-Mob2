import { afterEach, expect, test, vi } from "vitest";
import { fetchApi, ensureOk } from "./request";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("requests time out instead of leaving screens loading indefinitely", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ),
  );
  const result = expect(fetchApi("/api/products")).rejects.toThrow(
    "Request timed out. Please try again.",
  );
  await vi.advanceTimersByTimeAsync(15000);
  await result;
});

test("non-JSON server failures retain a useful error message", async () => {
  await expect(
    ensureOk(
      new Response("Bad gateway", { status: 502 }),
      "Unable to load cart.",
    ),
  ).rejects.toThrow("Unable to load cart.");
});
