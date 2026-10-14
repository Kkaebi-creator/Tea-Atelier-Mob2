import PageFrame from "../components/PageFrame";
import React, { useEffect, useState } from "react";
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonMenuButton,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import PageIntro from "../components/PageIntro";
import TeaLoader from "../components/TeaLoader";

const SettingsPage: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { token, user, logout } = useAuth();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/2fa/status`, { headers: authHeaders })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setTwoFactorEnabled(data.enabled);
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load security settings.",
        ),
      )
      .finally(() => setIsLoading(false));
  }, [token]);

  const resendVerification = async () => {
    setIsWorking(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/resend-verification`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to resend verification email.");
      setMessage("A new verification email has been sent.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to resend verification email.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const startTwoFactor = async () => {
    setIsWorking(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/2fa/setup`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to start 2FA setup.");
      setQrCode(data.qrCode);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start 2FA setup.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const confirmTwoFactor = async () => {
    setIsWorking(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/2fa/confirm`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Invalid authenticator code.");
      setTwoFactorEnabled(true);
      setQrCode("");
      setCode("");
      setMessage("Two-factor authentication is enabled.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to confirm 2FA.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const disableTwoFactor = async () => {
    setShowDisable(false);
    setIsWorking(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/2fa/disable`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to disable 2FA.");
      setTwoFactorEnabled(false);
      setMessage("Two-factor authentication is disabled.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to disable 2FA.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <PageFrame embedded={embedded} className="tea-info-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          <PageIntro
            eyebrow="Account preferences"
            title="Make it yours."
            description="Manage email verification, account security, and your session on this device."
          />
          {message && (
            <IonText color="success">
              <p role="status">{message}</p>
            </IonText>
          )}
          {error && (
            <IonText color="danger">
              <p role="alert">{error}</p>
            </IonText>
          )}
          {isLoading ? (
            <div className="tea-state">
              <TeaLoader size="page" label="Loading settings" />
            </div>
          ) : (
            <>
              <section className="tea-settings-card">
                <div className="tea-settings-heading">
                  <h2>Email verification</h2>
                  <span
                    className={
                      user?.isVerified
                        ? "tea-status-pill verified"
                        : "tea-status-pill"
                    }
                  >
                    {user?.isVerified ? "Verified" : "Not verified"}
                  </span>
                </div>
                <p>
                  {user?.isVerified
                    ? "Your email address is verified."
                    : "Verify your email to help protect your account."}
                </p>
                {!user?.isVerified && (
                  <IonButton
                    fill="outline"
                    onClick={resendVerification}
                    disabled={isWorking}
                  >
                    {isWorking ? <TeaLoader /> : "Resend verification email"}
                  </IonButton>
                )}
              </section>
              <section className="tea-settings-card">
                <div className="tea-settings-heading">
                  <h2>Two-factor authentication</h2>
                  <span
                    className={
                      twoFactorEnabled
                        ? "tea-status-pill verified"
                        : "tea-status-pill"
                    }
                  >
                    {twoFactorEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p>
                  Use an authenticator app for an additional layer of account
                  security.
                </p>
                {twoFactorEnabled ? (
                  <IonButton
                    fill="outline"
                    color="danger"
                    onClick={() => setShowDisable(true)}
                    disabled={isWorking}
                  >
                    Disable 2FA
                  </IonButton>
                ) : !qrCode ? (
                  <IonButton
                    fill="outline"
                    onClick={startTwoFactor}
                    disabled={isWorking}
                  >
                    {isWorking ? <TeaLoader /> : "Set up 2FA"}
                  </IonButton>
                ) : (
                  <div className="tea-2fa-setup">
                    <img
                      src={qrCode}
                      alt="Scan this QR code with your authenticator app"
                    />
                    <div className="tea-field">
                      <IonInput
                        label="Authenticator code"
                        labelPlacement="stacked"
                        inputMode="numeric"
                        autocomplete="one-time-code"
                        maxlength={6}
                        value={code}
                        onIonChange={(event) =>
                          setCode(event.detail.value || "")
                        }
                        placeholder="6-digit code"
                      />
                    </div>
                    <IonButton
                      expand="block"
                      onClick={confirmTwoFactor}
                      disabled={isWorking || code.length !== 6}
                    >
                      {isWorking ? <TeaLoader /> : "Confirm 2FA"}
                    </IonButton>
                  </div>
                )}
              </section>
              <section className="tea-settings-card">
                <h2>Session</h2>
                <p>Sign out of Tea Atelier on this device.</p>
                <IonButton fill="outline" color="danger" onClick={logout}>
                  Sign out
                </IonButton>
              </section>
            </>
          )}
        </div>
      </IonContent>
      <IonAlert
        isOpen={showDisable}
        header="Disable 2FA?"
        message="Your account will no longer require an authenticator code at login."
        buttons={[
          {
            text: "Cancel",
            role: "cancel",
            handler: () => setShowDisable(false),
          },
          { text: "Disable", role: "destructive", handler: disableTwoFactor },
        ]}
        onDidDismiss={() => setShowDisable(false)}
      />
    </PageFrame>
  );
};

export default SettingsPage;
