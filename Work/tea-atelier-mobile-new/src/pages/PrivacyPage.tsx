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

const PrivacyPage: React.FC = () => (
  <IonPage className="tea-info-page">
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonMenuButton menu="tea-navigation" />
        </IonButtons>
        <IonTitle>Privacy Policy</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <div className="tea-info-inner">
        <p className="tea-info-eyebrow">Your privacy matters</p>
        <h1>Privacy, plainly stated.</h1>
        <p className="tea-info-lead">
          Tea Atelier uses your account information to authenticate you, process
          orders, save delivery details, and provide order updates.
        </p>
        <div className="tea-policy-section">
          <h2>Information we use</h2>
          <p>
            We use your name, email, phone number, delivery address, cart, and
            order information to provide the shopping service.
          </p>
        </div>
        <div className="tea-policy-section">
          <h2>Storage and security</h2>
          <p>
            Your session is stored securely on your device using Capacitor
            Preferences. Authentication and account security are handled by the
            Tea Atelier service.
          </p>
        </div>
        <div className="tea-policy-section">
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
