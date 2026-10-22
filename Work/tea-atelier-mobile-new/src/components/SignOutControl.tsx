import React, { useLayoutEffect, useRef, useState } from "react";
import { IonButton, IonIcon, IonItem, IonLabel, IonModal } from "@ionic/react";
import { logOutOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TeaLoader from "./TeaLoader";

export default function SignOutControl({
  asItem = false,
}: {
  asItem?: boolean;
}) {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const latestToken = useRef(token);
  latestToken.current = token;
  const epoch = useRef(0);
  useLayoutEffect(() => {
    const sessionEpoch = ++epoch.current;
    setOpen(false);
    setWorking(false);
    setError("");
    busy.current = false;
    return () => {
      epoch.current = sessionEpoch + 1;
      busy.current = false;
    };
  }, [token]);
  const ask = () => {
    if (!token || busy.current) return;
    setError("");
    setOpen(true);
  };
  const confirm = async () => {
    if (!token || busy.current) return;
    busy.current = true;
    setWorking(true);
    setError("");
    const current = epoch.current;
    const isCurrent = () =>
      current === epoch.current && latestToken.current === token;
    try {
      await logout();
      // A successful logout can unmount this control as the guest page appears.
      if (!latestToken.current || latestToken.current === token) {
        busy.current = false;
        setWorking(false);
        setOpen(false);
        navigate("/shop", { replace: true });
      }
    } catch {
      if (isCurrent())
        setError("We couldn't sign you out on this device. Please try again.");
    } finally {
      if (isCurrent()) {
        busy.current = false;
        setWorking(false);
      }
    }
  };
  const cancel = () => {
    if (!busy.current) setOpen(false);
  };
  return (
    <>
      {asItem ? (
        <IonItem lines="none" button onClick={ask}>
          <IonIcon icon={logOutOutline} slot="start" color="danger" />
          <IonLabel color="danger">Sign out</IonLabel>
        </IonItem>
      ) : (
        <IonButton fill="outline" color="danger" onClick={ask}>
          Sign out
        </IonButton>
      )}
      <IonModal
        isOpen={open}
        className="tea-signout-modal"
        backdropDismiss={!working}
        canDismiss={async () => !busy.current}
        onDidDismiss={() => setOpen(false)}
        aria-label="Confirm sign out"
      >
        <div className="tea-signout-dialog">
          <span className="tea-signout-symbol" aria-hidden="true">
            <IonIcon icon={logOutOutline} />
          </span>
          <h2>Sign out of Tea Atelier?</h2>
          <p>You can keep browsing and sign back in whenever you're ready.</p>
          {error && (
            <p className="tea-signout-error" role="alert">
              {error}
            </p>
          )}
          <div className="tea-signout-actions">
            <IonButton fill="outline" disabled={working} onClick={cancel}>
              Cancel
            </IonButton>
            <IonButton disabled={working} onClick={() => void confirm()}>
              {working ? <TeaLoader label="Signing out…" /> : "Sign out"}
            </IonButton>
          </div>
        </div>
      </IonModal>
    </>
  );
}
