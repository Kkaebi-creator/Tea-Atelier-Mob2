import { IonButton, IonContent, IonPage } from '@ionic/react';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home: React.FC = () => {
  const { token } = useAuth();

  return (
    <IonPage className="tea-home-page">
      <IonContent fullscreen>
        <section className="tea-home-hero">
          <div className="tea-home-topline"><span>Tea Atelier</span><span>Since 2024</span></div>
          <div className="tea-home-copy">
            <p className="tea-home-eyebrow">Small rituals. Better days.</p>
            <h1>Find your<br /><em>daily steep.</em></h1>
            <p className="tea-home-description">Thoughtfully selected teas for slow mornings, bright afternoons, and everything in between.</p>
            <IonButton routerLink={token ? "/shop" : "/register"} size="large">
              {token ? "Browse the collection" : "Start exploring"}
            </IonButton>
            {!token && <p className="tea-home-signin">Already a member? <a href="/login">Sign in</a></p>}
          </div>
          <div className="tea-home-stamp">LEAF<br />&amp; LORE</div>
        </section>
        <section className="tea-home-note">
          <span>01 / A considered collection</span>
          <p>Floral, earthy, roasted, bright. Your next favorite cup is waiting.</p>
        </section>
      </IonContent>
    </IonPage>
  );
};

export default Home;
