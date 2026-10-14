import React from "react";
import { IonButton, IonButtons, IonIcon } from "@ionic/react";
import { arrowBackOutline } from "ionicons/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { authBackPath } from "../config/paymentReturn";

export default function AuthBackButton() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <IonButtons slot="start">
      <IonButton
        fill="clear"
        aria-label="Back to browsing"
        onClick={() =>
          navigate(authBackPath(location.state), { replace: true })
        }
      >
        <IonIcon icon={arrowBackOutline} slot="start" aria-hidden="true" />
        Back
      </IonButton>
    </IonButtons>
  );
}
