import React from "react";
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

import PageIntro from "../components/PageIntro";

// Dev Names
const developers = [
  { name: "Arce, Jose Luis Gabriel", image: "/images/developers/Josepic.jpg" },
  {
    name: "Concepcion, John Bryan",
    image: "/images/developers/John Bryan.jpg",
  },
  { name: "De Jesus, Sophia Jullia", image: "/images/developers/JULSPIC.jpg" },
  { name: "Vance, Aaron Golfo", image: "/images/developers/AARONPIC.jpg" },
  {
    name: "Rabanzo, Francheska Ann Nicole",
    image: "/images/developers/CHIPIC.jpg",
  },
];

const DevelopersPage: React.FC = () => (
  <IonPage className="tea-info-page">
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <IonMenuButton
            menu="tea-navigation"
            aria-label="Open navigation menu"
          />
        </IonButtons>
        <IonTitle>The Team</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent>
      <div className="tea-info-inner">
        <PageIntro
          eyebrow="The people behind the pour"
          title="Built with care."
          description="Tea Atelier is a student-built commerce experience designed to make discovering and ordering tea feel calm and approachable."
        />
        <IonList className="tea-developer-list">
          {developers.map((developer) => (
            <IonItem lines="none" key={developer.name}>
              <img
                className="tea-developer-avatar"
                src={developer.image}
                alt={developer.name}
              />
              <IonLabel className="ion-text-wrap">
                <h2>{developer.name}</h2>
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </div>
    </IonContent>
  </IonPage>
);

export default DevelopersPage;
