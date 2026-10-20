import React, { useEffect, useState } from "react";
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
import TeaLoader from "../components/TeaLoader";
import { API_URL } from "../config/api";
import { mediaUrl } from "../config/media";
import { ensureOk, fetchApi, requestError } from "../config/request";

type Story = {
  eyebrow: string;
  heading: string;
  paragraph_1: string;
  paragraph_2: string;
  image_url?: string;
};
type Pillar = { id: number; title: string; copy: string };

export default function CompanyHistoryPage() {
  const [story, setStory] = useState<Story | null>(null);
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    async function load() {
      try {
        const [storyData, pillarData] = await Promise.all([
          fetchApi(`${API_URL}/api/cms/about-story`).then(async (response) => {
            await ensureOk(response, "Unable to load our company story.");
            const data = await response.json();
            if (
              !data ||
              !("story" in data) ||
              (data.story !== null &&
                !["heading", "paragraph_1", "paragraph_2"].every(
                  (key) => typeof data.story?.[key] === "string",
                ))
            ) {
              throw new Error("Unable to load our company story.");
            }
            return data.story as Story | null;
          }),
          fetchApi(`${API_URL}/api/cms/about-pillars`)
            .then(async (response) => {
              await ensureOk(response, "Unable to load company values.");
              const data = await response.json();
              return Array.isArray(data?.pillars)
                ? (data.pillars.filter(
                    (item: Pillar) =>
                      item &&
                      typeof item.title === "string" &&
                      typeof item.copy === "string",
                  ) as Pillar[])
                : [];
            })
            .catch(() => [] as Pillar[]),
        ]);
        if (active) {
          setStory(storyData);
          setPillars(pillarData);
        }
      } catch (failure) {
        if (active)
          setError(requestError(failure, "Unable to load our company story."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [attempt]);
  const image = mediaUrl(story?.image_url);
  const imageSource =
    image && failedImage !== image ? image : "/images/atelier/tea-leaves.jpg";
  return (
    <IonPage className="tea-info-page tea-company-history-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>Company History</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-info-inner">
          <PageIntro
            eyebrow="Our atelier"
            title="Rooted in ritual."
            description="The story, care, and craft behind Tea Atelier."
          />
          {loading && (
            <div className="tea-state">
              <TeaLoader size="page" label="Loading company history" />
            </div>
          )}
          {!loading && error && (
            <div className="tea-state" role="alert">
              <p>{error}</p>
              <IonButton
                fill="clear"
                className="tea-action-button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </IonButton>
            </div>
          )}
          {!loading && !error && !story && (
            <div className="tea-state">
              <h2>Our story is growing.</h2>
              <p>Company history will be available here soon.</p>
            </div>
          )}
          {!loading && !error && story && (
            <>
              <figure className="tea-history-image">
                <img
                  src={imageSource}
                  alt="Tea Atelier's story"
                  onError={() => {
                    if (imageSource === image) setFailedImage(image);
                  }}
                />
              </figure>
              <section
                className="tea-history-story"
                aria-label="Our company story"
              >
                {story.eyebrow && (
                  <p className="tea-info-eyebrow">{story.eyebrow}</p>
                )}
                <h2>{story.heading}</h2>
                <p>{story.paragraph_1}</p>
                <p>{story.paragraph_2}</p>
              </section>
              {pillars.length > 0 && (
                <section
                  className="tea-history-values"
                  aria-label="What shapes our atelier"
                >
                  <p className="tea-info-eyebrow">What shapes our atelier</p>
                  <div>
                    {pillars.map((pillar, index) => (
                      <article key={pillar.id ?? index}>
                        <span aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h3>{pillar.title}</h3>
                        <p>{pillar.copy}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              <IonButton
                fill="clear"
                className="tea-action-button tea-history-shop-link"
                routerLink="/shop"
              >
                Explore the collection →
              </IonButton>
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
