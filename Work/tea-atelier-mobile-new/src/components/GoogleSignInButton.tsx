import React, { useEffect, useRef } from "react";

type GoogleCredentialResponse = { credential: string };
type GoogleApi = {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (element: HTMLElement, options: { theme: string; size: string; width: number }) => void;
    };
  };
};

declare global {
  interface Window { google?: GoogleApi; }
}

const GoogleSignInButton: React.FC<{ onCredential: (credential: string) => void }> = ({ onCredential }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !buttonRef.current) return;

    const render = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => callbackRef.current(credential) });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: buttonRef.current.offsetWidth,
      });
    };

    if (window.google) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, []);

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null;
  return <div className="tea-google-button" ref={buttonRef} />;
};

export default GoogleSignInButton;
