import React from "react";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import PageIntro from "../components/PageIntro";

export default function AboutProductsPage() {
  return (
    <IonPage className="tea-info-page tea-about-products-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>About Our Products</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-info-inner">
          <PageIntro eyebrow="Our collection" title="Tea, your way." />
          <figure className="tea-history-image">
            <img
              src="/images/atelier/matcha.jpg"
              alt="Matcha and tea preparation essentials"
            />
          </figure>
          <section className="tea-history-story" aria-label="About our products">
            <p>
              At Tea Atelier, we bring together matcha, leaf teas, tea accessories,
              and much more for your everyday tea and matcha cravings! Whether you
              enjoy whisking a cup of matcha, steeping your favorite leaves, or
              trying something new, our collection exists to help you prepare and
              enjoy tea your way.
            </p>
            <IonButton
              fill="clear"
              className="tea-action-button tea-history-shop-link"
              routerLink="/shop"
              routerDirection="forward"
            >
              Explore the collection →
            </IonButton>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}
