import React, { useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonMenuButton, IonPage, IonSegment, IonSegmentButton, IonText, IonTextarea, IonTitle, IonToolbar } from "@ionic/react";
import { useAuth } from "../context/AuthContext";

type Message = { id: string; subject: string; body: string; createdAt: string };

const ContactPage: React.FC = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("contact");
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", message: "" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    Preferences.get({ key: "contact_messages" }).then(({ value }) => {
      if (value) setMessages(JSON.parse(value));
    });
  }, []);

  const submit = async () => {
    if (!form.name || !form.email || !form.message) return;
    const next = [{ id: String(Date.now()), subject: "Contact Us", body: form.message, createdAt: new Date().toISOString() }, ...messages];
    setMessages(next);
    await Preferences.set({ key: "contact_messages", value: JSON.stringify(next) });
    setForm((current) => ({ ...current, message: "" }));
    setSent(true);
  };

  return (
    <IonPage className="tea-info-page">
      <IonHeader><IonToolbar><IonButtons slot="start"><IonMenuButton menu="tea-navigation" /></IonButtons><IonTitle>Contact Us</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          <IonSegment value={tab} onIonChange={(event) => setTab(event.detail.value as string)} className="tea-account-segment">
            <IonSegmentButton value="contact"><IonLabel>Contact Us</IonLabel></IonSegmentButton>
            <IonSegmentButton value="messages"><IonLabel>My Messages</IonLabel></IonSegmentButton>
          </IonSegment>
          {tab === "contact" && <div className="tea-account-panel">
            <p className="tea-info-eyebrow">Get in touch</p><h1>We would love to hear from you.</h1>
            <IonItem><IonLabel position="stacked">Name</IonLabel><IonInput value={form.name} onIonChange={(event) => setForm({ ...form, name: event.detail.value || "" })} /></IonItem>
            <IonItem><IonLabel position="stacked">Email</IonLabel><IonInput type="email" value={form.email} onIonChange={(event) => setForm({ ...form, email: event.detail.value || "" })} /></IonItem>
            <IonItem><IonLabel position="stacked">Message</IonLabel><IonTextarea rows={6} value={form.message} onIonChange={(event) => setForm({ ...form, message: event.detail.value || "" })} /></IonItem>
            <IonButton expand="block" onClick={submit}>Send message</IonButton>
            {sent && <IonText color="success"><p>Message saved. We will get back to you soon.</p></IonText>}
          </div>}
          {tab === "messages" && <div>{messages.length === 0 ? <div className="tea-state"><IonText><h2>No messages yet</h2><p>Your messages will appear here after you contact Tea Atelier.</p></IonText></div> : messages.map((message) => <article className="tea-message-card" key={message.id}><p className="tea-order-label">{message.subject}</p><small>{new Date(message.createdAt).toLocaleDateString()}</small><p>{message.body}</p><span>Sent</span></article>)}</div>}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ContactPage;
