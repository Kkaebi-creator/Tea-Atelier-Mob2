import React, { useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonItem, IonLabel, IonInput, IonButton, IonText, IonSpinner,
  IonRouterLink,
} from "@ionic/react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";

const RegisterPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phoneNumber: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Google sign-in failed."); return; }
      await login(data.token, data.user);
      navigate("/shop", { replace: true });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const set = (field: string) => (e: CustomEvent) =>
    setForm((prev) => ({ ...prev, [field]: e.detail.value! }));

  const handleSubmit = async () => {
    setError("");
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      await login(data.token, data.user);
      navigate("/shop", { replace: true });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage className="tea-auth-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="auth-container">
          <h2 className="auth-title">Tea Atelier</h2>

          {error && <IonText className="error-text">{error}</IonText>}

          <div className="auth-form">
            <label className="field-label">First Name</label>
            <IonItem className="soft-field">
              <IonInput value={form.firstName} onIonChange={set("firstName")} placeholder="First name" />
            </IonItem>

            <label className="field-label">Last Name</label>
            <IonItem className="soft-field">
              <IonInput value={form.lastName} onIonChange={set("lastName")} placeholder="Last name" />
            </IonItem>

            <label className="field-label">Email</label>
            <IonItem className="soft-field">
              <IonInput type="email" value={form.email} onIonChange={set("email")} placeholder="you@example.com" />
            </IonItem>

            <label className="field-label">Phone (Optional)</label>
            <IonItem className="soft-field">
              <IonInput type="tel" value={form.phoneNumber} onIonChange={set("phoneNumber")} placeholder="+1 234 567 8900" />
            </IonItem>

            <label className="field-label">Password</label>
            <IonItem className="soft-field">
              <IonInput type="password" value={form.password} onIonChange={set("password")} placeholder="Create a password (min 8 characters)" />
            </IonItem>

            <IonButton className="auth-button" expand="block" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <IonSpinner name="crescent" /> : "Create Account"}
            </IonButton>

            <div className="tea-auth-divider"><span>or continue with</span></div>
            <GoogleSignInButton onCredential={handleGoogleCredential} />

            <p className="auth-link">
              Already have an account? <IonRouterLink routerLink="/login">Sign In</IonRouterLink>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RegisterPage;
