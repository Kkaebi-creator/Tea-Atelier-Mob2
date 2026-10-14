import { IonButton, IonContent, IonIcon, IonPage } from "@ionic/react";
import { leafOutline, arrowForwardOutline } from "ionicons/icons";
import { useAuth } from "../context/AuthContext";
import "./Home.css";
export default function Home() {
  const { token } = useAuth();
  return (
    <IonPage className="tea-home-page">
      <IonContent fullscreen>
        <section className="tea-home-hero">
          <div className="tea-home-topline">
            <span className="tea-wordmark">
              <IonIcon icon={leafOutline} />
              Tea Atelier
            </span>
            <span className="tea-home-edition">Your daily ritual</span>
          </div>
          <div className="tea-home-copy">
            <p className="tea-info-eyebrow">A moment, just for you</p>
            <h1>
              Good tea.
              <br />A little <em>slower.</em>
            </h1>
            <p className="tea-home-description">
              Thoughtfully selected leaves, matcha, and little essentials for a
              cup worth pausing for.
            </p>
            <IonButton routerLink={token ? "/shop" : "/register"}>
              {token ? "Browse the collection" : "Start exploring"}
              <IonIcon slot="end" icon={arrowForwardOutline} />
            </IonButton>
            {!token && (
              <p className="tea-home-signin">
                Already part of the atelier? <a href="/login">Sign in</a>
              </p>
            )}
          </div>
          <div className="tea-home-photo">
            <img
              src="/images/atelier/matcha.jpg"
              alt="Tea Atelier matcha with a bamboo whisk and tea bowl"
            />
            <span className="tea-home-photo-caption">
              The art of a good cup.
            </span>
          </div>
        </section>
        <section className="tea-home-note">
          <span>From leaf to ritual</span>
          <p>
            A familiar favorite.
            <br />
            Something new to love.
          </p>
          <span className="tea-home-note-small">
            Explore the collection, follow your orders, and make yourself at
            home.
          </span>
        </section>
      </IonContent>
    </IonPage>
  );
}
