import RefreshButton from "../components/RefreshButton";
import PageFrame from "../components/PageFrame";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonLabel,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config/api";
import { ensureOk, fetchApi, requestError } from "../config/request";

type Message = {
  id: number | string;
  subject: string;
  message: string;
  status: string;
  adminReply?: string | null;
  createdAt: string;
  repliedAt?: string | null;
};

const ContactPage: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { token, user } = useAuth();
  const [tab, setTab] = useState("contact");
  const [form, setForm] = useState({ subject: "", message: "" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);
  const requestSequence = useRef(0);
  const submitting = useRef(false);
  const session = useRef(token);
  session.current = token;

  const load = useCallback(
    async (requestedPage: number) => {
      if (!token) return;
      const sequence = ++requestSequence.current;
      setLoading(true);
      setHistoryError("");
      try {
        const response = await fetchApi(
          `${API_URL}/api/contact?page=${requestedPage}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        await ensureOk(response, "Unable to load your messages.");
        const data = await response.json();
        if (!Array.isArray(data.messages))
          throw new Error("Unable to load your messages.");
        if (sequence !== requestSequence.current || session.current !== token)
          return;
        setMessages(data.messages);
        setPage(requestedPage);
        setTotalPages(Math.max(1, Number(data.totalPages) || 1));
      } catch (error) {
        if (sequence === requestSequence.current && session.current === token)
          setHistoryError(requestError(error, "Unable to load your messages."));
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    },
    [token],
  );

  const invalidateHistory = useCallback(() => {
    ++requestSequence.current;
  }, []);
  useEffect(() => {
    setMessages([]);
    setPage(1);
    setTotalPages(1);
    setSent(false);
    setSendError("");
    setForm({ subject: "", message: "" });
    void load(1);
    return invalidateHistory;
  }, [load, invalidateHistory]);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (submitting.current) return;
    setSent(false);
    setSendError("");
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (!subject || !message) {
      setSendError("Subject and message are required.");
      return;
    }
    if (subject.length > 255 || message.length > 5000) {
      setSendError(
        "Use up to 255 characters for the subject and 5,000 for the message.",
      );
      return;
    }
    if (!token) {
      setSendError("Please sign in to send a message.");
      return;
    }
    submitting.current = true;
    setSending(true);
    try {
      const response = await fetchApi(`${API_URL}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subject, message }),
      });
      await ensureOk(response, "Unable to send your message.");
      if (session.current !== token) return;
      setForm({ subject: "", message: "" });
      setSent(true);
      // A history failure must not undo an acknowledged send or resubmit it.
      void load(1);
    } catch (error) {
      if (session.current === token)
        setSendError(
          `${requestError(error, "Unable to send your message.")} Check My Messages before sending again if delivery is uncertain.`,
        );
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };
  const changeTab = (value: string) => {
    setTab(value);
    if (value === "messages") void load(page);
  };
  const edit = (field: "subject" | "message", value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSent(false);
    setSendError("");
  };

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
          <IonTitle>Contact Us</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          <IonSegment
            value={tab}
            onIonChange={(event) => changeTab(String(event.detail.value))}
            className="tea-account-segment"
          >
            <IonSegmentButton value="contact">
              <IonLabel>Contact Us</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="messages">
              <IonLabel>My Messages</IonLabel>
            </IonSegmentButton>
          </IonSegment>
          {tab === "contact" && (
            <form
              className="tea-account-panel"
              onSubmit={(event) => void submit(event)}
            >
              <div className="tea-page-intro">
                <p className="tea-info-eyebrow">A conversation over tea</p>
                <h1>We’re here to help.</h1>
                <p className="tea-page-description">
                  Questions about your order or finding your next favorite? Send
                  us a note.
                </p>
              </div>
              <p>
                Sending as {user?.name} ({user?.email}).
              </p>
              <div className="tea-field">
                <IonInput
                  label="Subject"
                  labelPlacement="stacked"
                  aria-label="Subject"
                  value={form.subject}
                  maxlength={255}
                  disabled={sending}
                  onIonInput={(event) =>
                    edit("subject", event.detail.value || "")
                  }
                />
              </div>
              <div className="tea-field">
                <IonTextarea
                  label="Message"
                  labelPlacement="stacked"
                  aria-label="Message"
                  rows={6}
                  value={form.message}
                  maxlength={5000}
                  disabled={sending}
                  onIonInput={(event) =>
                    edit("message", event.detail.value || "")
                  }
                />
              </div>
              <IonButton
                type="submit"
                expand="block"
                disabled={sending || !token}
              >
                {sending ? "Sending…" : "Send message"}
              </IonButton>
              {sendError && (
                <IonText color="danger">
                  <p role="alert">{sendError}</p>
                </IonText>
              )}
              {sent && (
                <IonText color="success">
                  <p role="status">
                    Message sent to Tea Atelier. You can check My Messages for
                    replies.
                  </p>
                </IonText>
              )}
            </form>
          )}
          {tab === "messages" && (
            <section aria-label="Message history">
              <div className="tea-list-toolbar">
                <RefreshButton
                  label="Refresh messages"
                  busy={loading}
                  onClick={() => void load(page)}
                />
              </div>
              {loading && <p role="status">Loading messages…</p>}
              {historyError && (
                <div role="alert">
                  <p>{historyError}</p>
                  <IonButton disabled={loading} onClick={() => void load(page)}>
                    Retry messages
                  </IonButton>
                </div>
              )}
              {!loading && !historyError && messages.length === 0 && (
                <div className="tea-state">
                  <IonText>
                    <h2>No messages yet</h2>
                    <p>Messages you send to Tea Atelier will appear here.</p>
                  </IonText>
                </div>
              )}
              {messages.map((message) => (
                <article className="tea-message-card" key={message.id}>
                  <p className="tea-order-label">{message.subject}</p>
                  <small>
                    {new Date(message.createdAt).toLocaleDateString()}
                  </small>
                  <p style={{ whiteSpace: "pre-wrap" }}>{message.message}</p>
                  <span>
                    {message.adminReply
                      ? "Replied"
                      : message.status === "read"
                        ? "Read"
                        : "Sent"}
                  </span>
                  {message.adminReply && (
                    <div aria-label="Reply from Tea Atelier">
                      <h3>Tea Atelier’s reply</h3>
                      <p style={{ whiteSpace: "pre-wrap" }}>
                        {message.adminReply}
                      </p>
                      {message.repliedAt && (
                        <small>
                          {new Date(message.repliedAt).toLocaleDateString()}
                        </small>
                      )}
                    </div>
                  )}
                </article>
              ))}
              {totalPages > 1 && (
                <div className="ion-text-center">
                  <IonButton
                    fill="outline"
                    disabled={loading || page <= 1}
                    onClick={() => void load(page - 1)}
                  >
                    Previous messages
                  </IonButton>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <IonButton
                    fill="outline"
                    disabled={loading || page >= totalPages}
                    onClick={() => void load(page + 1)}
                  >
                    Next messages
                  </IonButton>
                </div>
              )}
            </section>
          )}
        </div>
      </IonContent>
    </PageFrame>
  );
};
export default ContactPage;
