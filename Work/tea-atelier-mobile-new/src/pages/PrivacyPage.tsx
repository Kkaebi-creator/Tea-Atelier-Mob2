import React from "react";
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import PageIntro from "../components/PageIntro";

const PrivacyPage: React.FC = () => (
  <IonPage className="tea-info-page">
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonMenuButton
            menu="tea-navigation"
            aria-label="Open navigation menu"
          />
        </IonButtons>
        <IonTitle>Privacy Policy</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <div className="tea-info-inner">
        <PageIntro
          eyebrow="Your privacy matters"
          title="Privacy, plainly stated."
          description="Tea Atelier uses your account information to authenticate you, process orders, save delivery details, and provide order updates."
        />
        <div className="tea-settings-card">
          <h2>Information we use</h2>
          <p>
            We use your name, email, phone number, delivery address, cart, and
            order information to provide the shopping service.
          </p>
        </div>
        <div className="tea-settings-card">
          <h2>Storage and security</h2>
          <p>
            The app saves sign-in session information on this device using
            Capacitor Preferences. You can clear your session by signing out.
            Authentication and account security are handled by the Tea Atelier
            service.
          </p>
        </div>
        <div className="tea-settings-card">
          <h2>Your choices</h2>
          <p>
            You can update your profile, manage saved addresses, enable
            two-factor authentication, and sign out from Account settings.
          </p>
        </div>
        <p className="tea-policy-date">Last updated: September 2026</p>
      </div>
    </IonContent>
  </IonPage>
);

export default PrivacyPage;
