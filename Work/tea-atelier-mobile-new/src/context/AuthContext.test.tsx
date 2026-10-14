import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Preferences } from "@capacitor/preferences";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("@capacitor/preferences", () => ({
  Preferences: { get: vi.fn(), remove: vi.fn(), set: vi.fn() },
}));
const user = { name: "Test customer" };
let session: ReturnType<typeof useAuth>;
function Probe() {
  session = useAuth();
  return <div>{session.sessionError || session.user?.name || "No user"}</div>;
}
beforeEach(() => {
  vi.mocked(Preferences.get).mockResolvedValue({ value: "test-session" });
  vi.mocked(Preferences.remove).mockResolvedValue();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test("temporary server failure preserves saved session and can be retried", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response("{}", { status: 500 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ user })));
  vi.stubGlobal("fetch", fetch);
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText(/Unable to check your saved sign-in/);
  expect(Preferences.remove).not.toHaveBeenCalled();
  await act(() => session.retrySession());
  expect(screen.getByText("Test customer")).toBeDefined();
  expect(session.token).toBe("test-session");
});

test("network failure preserves saved session and ends loading", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
  );
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText(/Unable to check your saved sign-in/);
  expect(session.isLoading).toBe(false);
  expect(Preferences.remove).not.toHaveBeenCalled();
});

test("invalid session is removed on HTTP 401", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
  );
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() =>
    expect(Preferences.remove).toHaveBeenCalledWith({ key: "auth_token" }),
  );
  expect(session.token).toBeNull();
  expect(session.sessionError).toBe("");
});
