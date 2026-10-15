import React, { useEffect, useRef } from "react";

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
        options: { theme: string; size: string; width: number },
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleApi;
  }
}

const GoogleSignInButton: React.FC<{
  onCredential: (credential: string) => void;
}> = ({ onCredential }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const host = buttonRef.current;
    if (!clientId || !host) return;

    let lastWidth = 0;
    let frame = 0;
    let disposed = false;
    const render = () => {
      frame = 0;
      if (disposed) return;
      // Ionic caches hidden pages. Never let Google render with a zero width,
      // which makes it fall back to a narrow, content-sized button.
      const width = Math.min(400, host.offsetWidth);
      if (width <= 0) {
        lastWidth = 0;
        return;
      }
      if (!window.google || width === lastWidth) return;
      lastWidth = width;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => callbackRef.current(credential),
      });
      host.replaceChildren();
      window.google.accounts.id.renderButton(host, {
        theme: "outline",
        size: "large",
        width,
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

    let script: HTMLScriptElement | undefined;
    if (window.google) {
      schedule();
    } else {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = schedule;
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      // Keep the shared Google SDK available for the other authentication page.
      if (script) script.onload = null;
    };
  }, []);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;
  return (
    <div
      className="tea-google-button"
      ref={buttonRef}
      style={{ width: "100%", display: "flex", justifyContent: "center" }}
    />
  );
};

export default GoogleSignInButton;
