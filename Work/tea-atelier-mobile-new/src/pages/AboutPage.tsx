import React from "react";
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

const AboutPage: React.FC = () => (
  <IonPage className="tea-info-page">
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start"><IonBackButton defaultHref="/shop" /></IonButtons>
        <IonTitle>About the App</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <div className="tea-info-inner">
        <div className="tea-info-mark">TA</div>
        <p className="tea-info-eyebrow">Tea Atelier · Since 2026</p>
        <h1>A quieter way to shop for tea.</h1>
        <p className="tea-info-lead">Tea Atelier brings a considered collection of teas into one simple mobile experience.</p>
        <div className="tea-info-grid">
          <div><strong>Discover</strong><p>Browse a curated collection and find your next daily steep.</p></div>
          <div><strong>Order</strong><p>Adjust your cart, choose what to check out, and place orders with ease.</p></div>
          <div><strong>Keep track</strong><p>Review order history, saved addresses, and account preferences in one place.</p></div>
        </div>
      </div>
    </IonContent>
  </IonPage>
);

export default AboutPage;
