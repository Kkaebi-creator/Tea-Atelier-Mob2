import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import PaymentReturnListener from "./PaymentReturnListener";

const fixture = vi.hoisted(() => ({
  native: true,
  navigate: vi.fn(),
  addListener: vi.fn(),
  getLaunchUrl: vi.fn(),
  remove: vi.fn(),
  close: vi.fn(),
  callback: null as null | ((event: { url: string }) => void),
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => fixture.navigate }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => fixture.native },
}));
vi.mock("@capacitor/app", () => ({
  App: { addListener: fixture.addListener, getLaunchUrl: fixture.getLaunchUrl },
}));
vi.mock("@capacitor/browser", () => ({ Browser: { close: fixture.close } }));
beforeEach(() => {
  fixture.native = true;
  fixture.callback = null;
  fixture.remove.mockResolvedValue(undefined);
  fixture.close.mockResolvedValue(undefined);
  fixture.getLaunchUrl.mockResolvedValue(undefined);
  fixture.addListener.mockImplementation(async (_name, callback) => {
    fixture.callback = callback;
    return { remove: fixture.remove };
  });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test("cold launch opens the existing order from a trusted Android link", async () => {
  fixture.getLaunchUrl.mockResolvedValue({
    url: "https://ourtea-atelier.com/payment-return/android/150?payment=returned",
  });
  render(<PaymentReturnListener />);
  await waitFor(() =>
    expect(fixture.navigate).toHaveBeenCalledWith("/order-confirmation/150", {
      replace: true,
    }),
  );
  expect(fixture.close).toHaveBeenCalledTimes(1);
});

test("warm return requests a recheck even when the order page is already open", async () => {
  const recheck = vi.fn();
  window.addEventListener("tea-payment-return", recheck);
  render(<PaymentReturnListener />);
  await waitFor(() => expect(fixture.getLaunchUrl).toHaveBeenCalled());
  act(() =>
    fixture.callback!({
      url: "https://ourtea-atelier.com/payment-return/android/150?payment=failed",
    }),
  );
  expect(fixture.navigate).toHaveBeenCalledWith("/order-confirmation/150", {
    replace: true,
  });
  expect(recheck).toHaveBeenCalledTimes(1);
  window.removeEventListener("tea-payment-return", recheck);
});

test("a late launch URL cannot replace a newer warm return event", async () => {
  let resolveLaunch!: (value: { url: string }) => void;
  fixture.getLaunchUrl.mockReturnValue(
    new Promise((resolve) => {
      resolveLaunch = resolve;
    }),
  );
  render(<PaymentReturnListener />);
  await waitFor(() => expect(fixture.getLaunchUrl).toHaveBeenCalled());
  act(() =>
    fixture.callback!({
      url: "https://ourtea-atelier.com/payment-return/android/151",
    }),
  );
  await act(async () =>
    resolveLaunch({
      url: "https://ourtea-atelier.com/payment-return/android/150",
    }),
  );
  expect(fixture.navigate).toHaveBeenCalledTimes(1);
  expect(fixture.navigate).toHaveBeenCalledWith("/order-confirmation/151", {
    replace: true,
  });
});

test("malformed return events never navigate or close the browser", async () => {
  render(<PaymentReturnListener />);
  await waitFor(() => expect(fixture.getLaunchUrl).toHaveBeenCalled());
  act(() =>
    fixture.callback!({ url: "https://evil.test/payment-return/android/150" }),
  );
  expect(fixture.navigate).not.toHaveBeenCalled();
  expect(fixture.close).not.toHaveBeenCalled();
});

test("unmount removes a listener that finishes registering late", async () => {
  let resolveListener!: (value: { remove: typeof fixture.remove }) => void;
  fixture.addListener.mockReturnValue(
    new Promise((resolve) => {
      resolveListener = resolve;
    }),
  );
  const view = render(<PaymentReturnListener />);
  view.unmount();
  await act(async () => resolveListener({ remove: fixture.remove }));
  expect(fixture.remove).toHaveBeenCalledTimes(1);
  expect(fixture.getLaunchUrl).not.toHaveBeenCalled();
});

test("web browsers do not install native listeners", () => {
  fixture.native = false;
  render(<PaymentReturnListener />);
  expect(fixture.addListener).not.toHaveBeenCalled();
});

test("normal route navigation does not reread and replay the cold-launch URL", async () => {
  fixture.getLaunchUrl.mockResolvedValue({
    url: "https://ourtea-atelier.com/payment-return/android/150",
  });
  const view = render(<PaymentReturnListener />);
  await waitFor(() => expect(fixture.navigate).toHaveBeenCalled());
  const initialNavigate = fixture.navigate;
  fixture.navigate = vi.fn();
  view.rerender(<PaymentReturnListener />);
  await act(async () => {});
  expect(fixture.getLaunchUrl).toHaveBeenCalledTimes(1);
  act(() =>
    fixture.callback!({
      url: "https://ourtea-atelier.com/payment-return/android/151",
    }),
  );
  expect(fixture.navigate).toHaveBeenCalledWith("/order-confirmation/151", {
    replace: true,
  });
  fixture.navigate = initialNavigate;
});
