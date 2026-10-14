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

const AboutPage: React.FC = () => (
  <IonPage className="tea-info-page">
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonMenuButton
            menu="tea-navigation"
            aria-label="Open navigation menu"
          />
        </IonButtons>
        <IonTitle>About Tea Atelier</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <div className="tea-info-inner">
        <PageIntro
          eyebrow="Our atelier"
          title="A quieter way to shop for tea."
          description="Tea Atelier brings a considered collection of teas into one simple mobile experience."
        />
        <div className="tea-auth-intro">
          <p className="tea-info-eyebrow">Small rituals. Beautiful tea.</p>
          <h2>Find your daily steep.</h2>
          <p>Discover, order, and keep track of your favorites.</p>
        </div>
        <div className="tea-info-grid">
          <div>
            <strong>Discover</strong>
            <p>Browse a curated collection and find your next daily steep.</p>
          </div>
          <div>
            <strong>Order</strong>
            <p>
              Adjust your cart, choose what to check out, and place orders with
              ease.
            </p>
          </div>
          <div>
            <strong>Keep track</strong>
            <p>
              Review order history, saved addresses, and account preferences in
              one place.
            </p>
          </div>
        </div>
      </div>
    </IonContent>
  </IonPage>
);

export default AboutPage;
