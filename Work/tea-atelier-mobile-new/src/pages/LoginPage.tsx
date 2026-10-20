import React, { useRef, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonInput,
  IonButton,
  IonText,
} from "@ionic/react";
import { API_URL } from "../config/api";
import { fetchApi, requestError } from "../config/request";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import AuthBackButton from "../components/AuthBackButton";
import { Link, useLocation } from "react-router-dom";
import TeaLoader from "../components/TeaLoader";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const pending = useRef(false);
  const [stage, setStage] = useState("");

  const finishSignIn = async (data: unknown) => {
    const session = data as {
      token?: string;
      user?: Parameters<typeof login>[1];
    } | null;
    if (
      !session ||
      typeof session.token !== "string" ||
      !session.token.trim() ||
      !session.user ||
      typeof session.user.email !== "string" ||
      typeof session.user.name !== "string" ||
      !["customer", "admin"].includes(session.user.role)
    ) {
      throw new Error(
        "Sign-in returned an incomplete response. Please try again.",
      );
    }
    setStage("Opening your atelier…");
    try {
      await login(session.token, session.user);
    } catch {
      throw new Error(
        "We couldn't save your sign-in on this device. Please try again.",
      );
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    if (pending.current) return;
    pending.current = true;
    setError("");
    setIsLoading(true);
    setStage("Signing in with Google…");
    try {
      const res = await fetchApi(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Google sign-in failed. Please try again.",
        );
      await finishSignIn(data);
    } catch (failure) {
      setError(
        requestError(
          failure,
          "Google sign-in couldn't finish. Please try again.",
        ),
      );
    } finally {
      pending.current = false;
      setIsLoading(false);
      setStage("");
    }
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (pending.current) return;
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (requiresTotp && !/^\d{6}$/.test(totpCode.trim())) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    pending.current = true;
    setIsLoading(true);
    setStage(requiresTotp ? "Verifying your code…" : "Signing in…");
    try {
      const res = await fetchApi(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          totpCode: requiresTotp ? totpCode.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Unable to sign in. Please try again.",
        );
      if (data?.requiresTotp === true) {
        setRequiresTotp(true);
        return;
      }
      await finishSignIn(data);
    } catch (failure) {
      setError(requestError(failure, "Unable to sign in. Please try again."));
    } finally {
      pending.current = false;
      setIsLoading(false);
      setStage("");
    }
  };

  return (
    <IonPage className="tea-auth-page">
      <IonHeader>
        <IonToolbar>
          <AuthBackButton />
          <IonTitle>Sign In</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="auth-container">
          <p className="tea-auth-brand">Tea Atelier</p>
          <div className="tea-auth-intro">
            <p className="tea-info-eyebrow">Small rituals. Beautiful tea.</p>
            <h1>Welcome back.</h1>
            <p>Your favorite rituals are right where you left them.</p>
          </div>

          {error && (
            <IonText className="error-text" role="alert">
              {error}
            </IonText>
          )}

          <form
            className="auth-form"
            aria-busy={isLoading}
            onSubmit={handleSubmit}
          >
            <div className="tea-field">
              <IonInput
                disabled={isLoading}
                label="Email"
                labelPlacement="stacked"
                type="email"
                value={email}
                onIonInput={(e) => {
                  setEmail(e.detail.value || "");
                  setRequiresTotp(false);
                  setTotpCode("");
                  setError("");
                }}
                autocomplete="email"
                placeholder="you@example.com"
              />
            </div>

            <div className="tea-field">
              <IonInput
                disabled={isLoading}
                label="Password"
                labelPlacement="stacked"
                type="password"
                value={password}
                onIonInput={(e) => setPassword(e.detail.value || "")}
                autocomplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {requiresTotp && (
              <>
                <p className="tea-auth-step" role="status">
                  One more step. Enter the code from your authenticator app.
                </p>
                <div className="tea-field">
                  <IonInput
                    disabled={isLoading}
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    label="Authenticator Code"
                    labelPlacement="stacked"
                    type="text"
                    value={totpCode}
                    onIonInput={(e) => setTotpCode(e.detail.value || "")}
                    placeholder="6-digit code"
                    maxlength={6}
                  />
                </div>
              </>
            )}

            <IonButton
              type="submit"
              className="auth-button"
              expand="block"
              disabled={isLoading}
            >
              {isLoading ? (
                <TeaLoader label={stage || "Signing in…"} />
              ) : requiresTotp ? (
                "Verify & sign in"
              ) : (
                "Sign In"
              )}
            </IonButton>

            <div className="tea-auth-divider">
              <span>or continue with</span>
            </div>
            <GoogleSignInButton
              disabled={isLoading}
              onCredential={handleGoogleCredential}
            />

            <p className="auth-link">
              Don't have an account?{" "}
              <Link
                to="/register"
                state={location.state}
                replace
                aria-disabled={isLoading}
                onClick={(event) => {
                  if (isLoading) event.preventDefault();
                }}
              >
                Register
              </Link>
            </p>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
