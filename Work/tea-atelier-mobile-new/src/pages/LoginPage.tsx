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

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [requiresTotp, setRequiresTotp] = useState(false);
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

  const handleSubmit = async () => {
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      if (data.requiresTotp) { setRequiresTotp(true); return; }
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
          <IonTitle>Sign In</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="auth-container">
          <h2 className="auth-title">Tea Atelier</h2>

          {error && <IonText className="error-text">{error}</IonText>}

          <div className="auth-form">
            <label className="field-label">Email</label>
            <IonItem className="soft-field">
              <IonInput
                type="email"
                value={email}
                onIonChange={(e) => setEmail(e.detail.value!)}
                placeholder="you@example.com"
              />
            </IonItem>

            <label className="field-label">Password</label>
            <IonItem className="soft-field">
              <IonInput
                type="password"
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
                placeholder="••••••••"
              />
            </IonItem>

            {requiresTotp && (
              <>
                <label className="field-label">Authenticator Code</label>
                <IonItem className="soft-field">
                  <IonInput
                    type="text"
                    value={totpCode}
                    onIonChange={(e) => setTotpCode(e.detail.value!)}
                    placeholder="6-digit code"
                    maxlength={6}
                  />
                </IonItem>
              </>
            )}

            <IonButton className="auth-button" expand="block" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? <IonSpinner name="crescent" /> : "Sign In"}
            </IonButton>

            <div className="tea-auth-divider"><span>or continue with</span></div>
            <GoogleSignInButton onCredential={handleGoogleCredential} />

            <p className="auth-link">
              Don't have an account? <IonRouterLink routerLink="/register">Register</IonRouterLink>
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
