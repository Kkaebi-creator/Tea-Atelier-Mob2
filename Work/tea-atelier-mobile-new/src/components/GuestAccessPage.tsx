import React from "react";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  bagHandleOutline,
  personOutline,
  receiptOutline,
} from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import PageFrame from "./PageFrame";
import PageIntro from "./PageIntro";
import "./GuestAccessPage.css";
const sections = {
  cart: {
    title: "Your Cart",
    heading: "A place for your next favorites.",
    description:
      "Sign in to add tea to your cart and keep your selection with your account.",
    icon: bagHandleOutline,
    path: "/cart",
  },
  orders: {
    title: "Your Orders",
    heading: "Your tea journey, all together.",
    description:
      "Sign in to see your orders, follow their progress, and find support for a purchase.",
    icon: receiptOutline,
    path: "/orders",
  },
  account: {
    title: "Your Account",
    heading: "Make yourself at home.",
    description:
      "Sign in to manage your profile, delivery addresses, and account preferences.",
    icon: personOutline,
    path: "/account",
  },
};
export type GuestSection = keyof typeof sections;
export default function GuestAccessPage({
  section,
  embedded = false,
}: {
  section: GuestSection;
  embedded?: boolean;
}) {
  const navigate = useNavigate();
  const content = sections[section];
  const authState = { from: { pathname: content.path } };
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
          <IonTitle>{content.title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-page-inner tea-guest-access">
          <PageIntro
            eyebrow="Your atelier"
            title={content.heading}
            description={content.description}
          />
          <section
            className="tea-card-panel tea-guest-card"
            aria-label={`${content.title} sign-in options`}
          >
            <div className="tea-guest-icon">
              <IonIcon icon={content.icon} aria-hidden="true" />
            </div>
            <h2>You're welcome to look around.</h2>
            <p className="tea-panel-copy">
              Browse the collection any time. Your account is here when you're
              ready.
            </p>
            <div className="tea-guest-actions">
              <IonButton
                expand="block"
                onClick={() => navigate("/login", { state: authState })}
              >
                Sign in
              </IonButton>
              <IonButton
                expand="block"
                fill="outline"
                onClick={() => navigate("/register", { state: authState })}
              >
                Create account
              </IonButton>
              <IonButton
                expand="block"
                fill="clear"
                onClick={() => navigate("/shop")}
              >
                Continue browsing
              </IonButton>
            </div>
          </section>
        </div>
      </IonContent>
    </PageFrame>
  );
}
