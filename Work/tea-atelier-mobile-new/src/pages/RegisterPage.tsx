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
import { fetchApi } from "../config/request";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import AuthBackButton from "../components/AuthBackButton";
import { Link, useLocation } from "react-router-dom";
import TeaLoader from "../components/TeaLoader";

const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  type Session = {
    token: Parameters<typeof login>[0];
    user: Parameters<typeof login>[1];
  };
  const [pendingSession, setPendingSession] = useState<Session | null>(null);
  const submitting = useRef(false);

  const saveSession = async (session: Session) => {
    // Keep a successful signup in memory so a storage retry never creates another account.
    setPendingSession(session);
    try {
      await login(session.token, session.user);
      setPendingSession(null);
    } catch {
      setError(
        "Your account is ready, but we couldn't save your sign-in on this device. Tap Retry sign-in, or use Sign In below. You don't need to register again.",
      );
    }
  };

  const submit = async (credential?: string) => {
    if (submitting.current) return;
    setError("");
    const payload = {
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim(),
    };
    if (!credential && !pendingSession) {
      if (
        !payload.firstName ||
        !payload.lastName ||
        !payload.email ||
        !payload.password
      ) {
        setError("Enter your first name, last name, email, and password.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
        setError("Enter a valid email address.");
        return;
      }
      if (
        payload.password.length < 8 ||
        !/[A-Z]/.test(payload.password) ||
        !/[a-z]/.test(payload.password) ||
        !/[0-9]/.test(payload.password)
      ) {
        setError(
          "Use at least 8 characters with uppercase and lowercase letters and a number.",
        );
        return;
      }
      if (new TextEncoder().encode(payload.password).length > 72) {
        setError("Password is too long. Use no more than 72 UTF-8 bytes.");
        return;
      }
    }
    submitting.current = true;
    setIsLoading(true);
    try {
      if (pendingSession) {
        await saveSession(pendingSession);
        return;
      }
      const res = await fetchApi(
        `${API_URL}${credential ? "/api/auth/google" : "/api/signup"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credential ? { credential } : payload),
        },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status >= 500)
          throw new Error("Registration service unavailable");
        setError(
          typeof data?.error === "string"
            ? data.error
            : credential
              ? "Google sign-in failed. Please try again."
              : "Unable to create account. Check your details and try again.",
        );
        return;
      }
      // A successful HTTP response alone cannot establish a signed-in session.
      if (
        typeof data?.token !== "string" ||
        !data.token.trim() ||
        !data.user ||
        typeof data.user.email !== "string" ||
        typeof data.user.name !== "string" ||
        !["customer", "admin"].includes(data.user.role)
      ) {
        throw new Error("Incomplete sign-in response");
      }
      await saveSession(data);
    } catch {
      setError(
        credential
          ? "We couldn't complete Google sign-in. Check your connection and try again."
          : "We couldn't confirm registration. Your account may have been created. Try Sign In below before registering again.",
      );
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  const set = (field: keyof typeof form) => (e: CustomEvent) =>
    setForm((prev) => ({ ...prev, [field]: e.detail.value ?? "" }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void submit();
  };

  return (
    <IonPage className="tea-auth-page">
      <IonHeader>
        <IonToolbar>
          <AuthBackButton />
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="auth-container">
          <p className="tea-auth-brand">Tea Atelier</p>
          <div className="tea-auth-intro">
            <p className="tea-info-eyebrow">Small rituals. Beautiful tea.</p>
            <h1>A little beginning.</h1>
            <p>Make yourself at home in the atelier.</p>
          </div>

          {error && (
            <IonText className="error-text" role="alert">
              {error}
            </IonText>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="tea-field">
              <IonInput
                autocomplete="given-name"
                disabled={isLoading || !!pendingSession}
                label="First Name"
                labelPlacement="stacked"
                value={form.firstName}
                onIonInput={set("firstName")}
                placeholder="First name"
              />
            </div>

            <div className="tea-field">
              <IonInput
                autocomplete="family-name"
                disabled={isLoading || !!pendingSession}
                label="Last Name"
                labelPlacement="stacked"
                value={form.lastName}
                onIonInput={set("lastName")}
                placeholder="Last name"
              />
            </div>

            <div className="tea-field">
              <IonInput
                autocomplete="email"
                disabled={isLoading || !!pendingSession}
                label="Email"
                labelPlacement="stacked"
                type="email"
                value={form.email}
                onIonInput={set("email")}
                placeholder="you@example.com"
              />
            </div>

            <div className="tea-field">
              <IonInput
                autocomplete="tel"
                disabled={isLoading || !!pendingSession}
                label="Phone (Optional)"
                labelPlacement="stacked"
                type="tel"
                value={form.phoneNumber}
                onIonInput={set("phoneNumber")}
                placeholder="Your phone number"
              />
            </div>

            <div className="tea-field">
              <IonInput
                autocomplete="new-password"
                disabled={isLoading || !!pendingSession}
                helperText="At least 8 characters, with uppercase, lowercase, and a number."
                label="Password"
                labelPlacement="stacked"
                type="password"
                value={form.password}
                onIonInput={set("password")}
                placeholder="Create a password (min 8 characters)"
              />
            </div>

            <IonButton
              type="submit"
              className="auth-button"
              expand="block"
              disabled={isLoading}
            >
              {isLoading ? (
                <TeaLoader label="Signing you in" />
              ) : pendingSession ? (
                "Retry sign-in"
              ) : (
                "Create Account"
              )}
            </IonButton>

            <div className="tea-auth-divider">
              <span>or continue with</span>
            </div>
            <GoogleSignInButton
              disabled={isLoading || !!pendingSession}
              onCredential={(credential) => submit(credential)}
            />

            <p className="auth-link">
              Already have an account?{" "}
              <Link to="/login" state={location.state} replace>
                Sign In
              </Link>
            </p>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RegisterPage;
