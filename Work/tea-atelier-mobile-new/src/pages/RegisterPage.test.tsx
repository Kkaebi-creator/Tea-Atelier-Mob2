import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import RegisterPage from "./RegisterPage";

const { login } = vi.hoisted(() => ({ login: vi.fn() }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login }) }));
vi.mock("../components/AuthBackButton", () => ({ default: () => null }));
vi.mock("../components/GoogleSignInButton", () => ({ default: () => null }));
vi.mock("@ionic/react", () => {
  const Container = ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  );
  return {
    IonPage: Container,
    IonHeader: Container,
    IonToolbar: Container,
    IonTitle: Container,
    IonContent: Container,
    IonText: ({ children }: { children: React.ReactNode }) => (
      <div role="alert">{children}</div>
    ),
    IonButton: ({
      children,
      type,
      disabled,
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type={type} disabled={disabled}>
        {children}
      </button>
    ),
    IonInput: ({
      label,
      onIonInput,
      helperText,
      value,
      type,
      disabled,
      placeholder,
    }: {
      label: string;
      onIonInput: (e: unknown) => void;
      helperText?: string;
    } & React.InputHTMLAttributes<HTMLInputElement>) => (
      <label>
        {label}
        <input
          aria-label={label}
          value={value}
          type={type}
          disabled={disabled}
          placeholder={placeholder}
          onInput={(e) =>
            onIonInput({ detail: { value: e.currentTarget.value } })
          }
        />
        {helperText}
      </label>
    ),
  };
});
const user = {
  name: "Review Customer",
  firstName: "Review",
  lastName: "Customer",
  email: "fresh@example.invalid",
  phone: null,
  role: "customer",
  isVerified: false,
};
function setup(password = "LocalFixture1") {
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/register", state: { from: { pathname: "/checkout" } } },
      ]}
    >
      <RegisterPage />
    </MemoryRouter>,
  );
  for (const [label, value] of [
    ["First Name", " Review "],
    ["Last Name", " Customer "],
    ["Email", "fresh@example.invalid"],
    ["Password", password],
  ]) {
    fireEvent.input(screen.getByLabelText(label), { target: { value } });
  }
}
function submit() {
  fireEvent.submit(
    screen.getByRole("button", { name: "Create Account" }).closest("form")!,
  );
}
beforeEach(() => {
  login.mockReset();
  login.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test("submits current input without blur, trims names, and saves session before route-owned navigation", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ token: "session", user })),
    );
  vi.stubGlobal("fetch", fetch);
  setup();
  submit();
  await waitFor(() =>
    expect(login).toHaveBeenCalledWith("session", user, "signup"),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    firstName: "Review",
    lastName: "Customer",
    email: user.email,
    phoneNumber: "",
    password: "LocalFixture1",
  });
  expect(
    screen.getByRole("link", { name: "Sign In" }).getAttribute("href"),
  ).toBe("/login");
});

test.each([
  "abcdefgh",
  "ABCDEFG1",
  "abcdefgh1",
  "Abcdefgh",
  "Ab1" + "é".repeat(35),
])(
  "rejects a password the backend cannot accept before sending: %s",
  async (password) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    setup(password);
    submit();
    expect(screen.getByRole("alert").textContent).toMatch(/uppercase|too long/);
    expect(fetch).not.toHaveBeenCalled();
  },
);

test("rapid submits create one request while registration is pending", async () => {
  let resolve!: (value: Response) => void;
  const fetch = vi.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  setup();
  const form = screen
    .getByRole("button", { name: "Create Account" })
    .closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () =>
    resolve(new Response(JSON.stringify({ token: "session", user }))),
  );
  expect(login).toHaveBeenCalledTimes(1);
});

test("a rejected email displays the server explanation and never signs in", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "An account with this email already exists.",
        }),
        { status: 409 },
      ),
    ),
  );
  setup();
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "An account with this email already exists.",
  );
  expect(login).not.toHaveBeenCalled();
});

test.each([
  new Response("<html>Bad gateway</html>", { status: 502 }),
  new Response(JSON.stringify({ user })),
  new Response(
    JSON.stringify({ token: "session", user: { name: "No email" } }),
  ),
  new Response("invalid JSON"),
])(
  "an uncertain result provides sign-in recovery instead of creating an invalid session",
  async (response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    setup();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your account may have been created",
    );
    expect(login).not.toHaveBeenCalled();
  },
);

test("a lost response does not automatically retry account creation", async () => {
  const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
  vi.stubGlobal("fetch", fetch);
  setup();
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Try Sign In below before registering again",
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(login).not.toHaveBeenCalled();
});

test("after account creation, storage failure retries only session saving", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ token: "session", user })),
    );
  vi.stubGlobal("fetch", fetch);
  login.mockRejectedValueOnce(new Error("Storage unavailable"));
  setup();
  submit();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your account is ready",
  );
  fireEvent.click(screen.getByRole("button", { name: "Retry sign-in" }));
  await waitFor(() => expect(login).toHaveBeenCalledTimes(2));
  expect(login).toHaveBeenLastCalledWith("session", user, "signup");
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("signup displays account creation progress and keeps the form locked until session saving completes", async () => {
  let finishRequest!: (value: Response) => void;
  let finishSession!: () => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((done) => {
          finishRequest = done;
        }),
    ),
  );
  login.mockImplementationOnce(
    () =>
      new Promise<void>((done) => {
        finishSession = done;
      }),
  );
  setup();
  submit();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Creating your account…",
  );
  expect(screen.getByLabelText("First Name")).toBeDisabled();
  await act(async () =>
    finishRequest(new Response(JSON.stringify({ token: "session", user }))),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Opening your atelier…");
  await act(async () => finishSession());
  expect(login).toHaveBeenCalledWith("session", user, "signup");
});
