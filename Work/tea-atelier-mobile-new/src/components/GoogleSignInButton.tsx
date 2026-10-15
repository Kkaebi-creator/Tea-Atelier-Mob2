import React, { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import NativeGoogleSignInButton from "./NativeGoogleSignInButton";

type GoogleCredentialResponse = { credential: string };
type GoogleApi = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        element: HTMLElement,
        options: {
          theme: string;
          size: string;
          width: number;
          click_listener: () => void;
        },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleApi;
  }
}

type ButtonRegistration = {
  host: HTMLElement;
  onCredential: (credential: string) => void;
  busy: boolean;
};
type GoogleSession = {
  buttons: Set<ButtonRegistration>;
  active: ButtonRegistration | null;
};
const sessions = new WeakMap<GoogleApi, GoogleSession>();

// Google Identity Services has one global callback, even when Ionic keeps both
// authentication pages mounted. Initialize once and dispatch to the clicked button.
function googleSession(api: GoogleApi, clientId: string): GoogleSession {
  const existing = sessions.get(api);
  if (existing) return existing;
  const session: GoogleSession = { buttons: new Set(), active: null };
  sessions.set(api, session);
  api.accounts.id.initialize({
    client_id: clientId,
    callback: ({ credential }) => {
      const target =
        session.active ??
        [...session.buttons].find(
          (button) => button.host.isConnected && button.host.offsetWidth > 0,
        );
      session.active = null;
      if (target && session.buttons.has(target)) {
        target.busy = false;
        target.onCredential(credential);
      }
    },
  });
  return session;
}

const WebGoogleSignInButton: React.FC<{
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
}> = ({ onCredential, disabled }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const host = buttonRef.current;
    if (!clientId || !host) return;

    const registration: ButtonRegistration = {
      host,
      onCredential: (credential) => callbackRef.current(credential),
      busy: false,
    };
    let session: GoogleSession | undefined;
    let lastWidth = 0;
    let frame = 0;
    let disposed = false;
    const render = () => {
      frame = 0;
      if (disposed) return;
      const width = Math.min(400, host.offsetWidth);
      if (width <= 0) {
        lastWidth = 0;
        return;
      }
      // Replacing Google's iframe while its popup is open can break the
      // credential return channel. Keep the opener alive for the whole attempt.
      if (registration.busy || !window.google || width === lastWidth) return;
      session = googleSession(window.google, clientId);
      session.buttons.add(registration);
      lastWidth = width;
      host.replaceChildren();
      window.google.accounts.id.renderButton(host, {
        theme: "outline",
        size: "large",
        width,
        click_listener: () => {
          registration.busy = true;
          if (session) session.active = registration;
        },
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    };
    const observer = new ResizeObserver((entries) => {
      if (entries.some((entry) => entry.contentRect.width === 0)) lastWidth = 0;
      schedule();
    });
    observer.observe(host);
    window.addEventListener("resize", schedule);

    // A page navigation ends a canceled attempt and permits sizing on re-entry.
    const onLeave = () => {
      registration.busy = false;
      if (session?.active === registration) session.active = null;
    };
    const page = host.closest("ion-page, .ion-page");
    page?.addEventListener("ionViewDidLeave", onLeave);

    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (window.google) {
      schedule();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", schedule);
    }

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      page?.removeEventListener("ionViewDidLeave", onLeave);
      cancelAnimationFrame(frame);
      script?.removeEventListener("load", schedule);
      session?.buttons.delete(registration);
      if (session?.active === registration) session.active = null;
    };
  }, []);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;
  return (
    <div
      className="tea-google-button"
      inert={disabled}
      ref={buttonRef}
      style={{ width: "100%", display: "flex", justifyContent: "center" }}
    />
  );
};

const GoogleSignInButton: React.FC<{
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
}> = ({ onCredential, disabled }) => {
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;
  if (Capacitor.getPlatform() === "android") {
    return (
      <NativeGoogleSignInButton
        onCredential={onCredential}
        disabled={disabled}
      />
    );
  }
  return (
    <WebGoogleSignInButton onCredential={onCredential} disabled={disabled} />
  );
};

export default GoogleSignInButton;
