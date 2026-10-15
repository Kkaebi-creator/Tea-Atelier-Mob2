import React, { useRef, useState } from "react";
import { nativeGoogleCredential } from "../config/googleSignIn";

type Props = {
  onCredential: (credential: string) => void | Promise<void>;
  disabled?: boolean;
};

export default function NativeGoogleSignInButton({
  onCredential,
  disabled,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const signIn = async () => {
    if (disabled || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const credential = await nativeGoogleCredential();
      await onCredential(credential);
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== "USER_CANCELLED") {
        setError("Google sign-in couldn't finish. Please try again.");
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="tea-google-button" style={{ width: "100%" }}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void signIn()}
        aria-busy={busy}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          width: "100%",
          minHeight: 44,
          padding: "10px 12px",
          border: "1px solid #747775",
          borderRadius: 4,
          background: "#fff",
          color: "#1f1f1f",
          fontFamily: "Roboto, Arial, sans-serif",
          fontSize: 14,
          fontWeight: 500,
          cursor: disabled || busy ? "default" : "pointer",
          opacity: disabled || busy ? 0.65 : 1,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 18 18"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="#4285F4"
            d="M17.64 9.20455c0-.63864-.05727-1.25273-.16364-1.84182H9v3.483h4.84364c-.20864 1.125-.84273 2.07818-1.79591 2.71682v2.25818h2.90909c1.70273-1.56773 2.68318-3.87682 2.68318-6.61618Z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.46727-.80591 5.95636-2.17909l-2.90909-2.25818c-.80591.54-1.83682.85909-3.04727.85909-2.34409 0-4.32818-1.58318-5.03591-3.71045H.956818v2.33182C2.43773 15.9868 5.48182 18 9 18Z"
          />
          <path
            fill="#FBBC05"
            d="M3.96409 10.7114A5.409 5.409 0 0 1 3.68182 9c0-.59318.10227-1.17.28227-1.71136V4.95682H.956818A9.002 9.002 0 0 0 0 9c0 1.45227.347727 2.82727.956818 4.0432l3.00727-2.3318Z"
          />
          <path
            fill="#EA4335"
            d="M9 3.57955c1.32136 0 2.50773.45409 3.44045 1.34591l2.58137-2.58137C13.4632.891818 11.4259 0 9 0 5.48182 0 2.43773 2.01318.956818 4.95682l3.00727 2.33182C4.67182 5.16136 6.65591 3.57955 9 3.57955Z"
          />
        </svg>
        <span>{busy ? "Signing in…" : "Sign in with Google"}</span>
      </button>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
