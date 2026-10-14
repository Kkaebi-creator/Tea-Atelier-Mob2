import PageIntro from "../components/PageIntro";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { ensureOk, fetchApi, requestError } from "../config/request";
type Notification = {
  notification_id: string;
  order_id: number | null;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};
export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const sequence = useRef(0);
  const busy = useRef(false);
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setLoadError("");
    try {
      if (!token) throw new Error("Please sign in to view notifications.");
      const response = await fetchApi(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await ensureOk(response, "Unable to load notifications.");
      const data = await response.json();
      if (
        !Array.isArray(data.notifications) ||
        !Number.isInteger(data.unreadCount) ||
        data.unreadCount < 0
      )
        throw new Error("Unable to load notifications.");
      if (current === sequence.current) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (failure) {
      if (current === sequence.current)
        setLoadError(requestError(failure, "Unable to load notifications."));
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    setActionError("");
    setSaving(false);
    busy.current = false;
    void load();
    return invalidate;
  }, [load, invalidate]);
  const markRead = async (notificationId?: string) => {
    if (!token || busy.current || loading || loadError) return;
    const selected = notifications.find(
      (item) => item.notification_id === notificationId,
    );
    if (notificationId && (!selected || selected.read_at)) return;
    busy.current = true;
    setSaving(true);
    setActionError("");
    const current = ++sequence.current;
    let acknowledged = false;
    try {
      const response = await fetchApi(`${API_URL}/api/notifications`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          notificationId ? { notificationId } : { all: true },
        ),
      });
      await ensureOk(response, "Unable to update notifications.");
      const result = await response.json();
      if (result.success !== true)
        throw new Error(
          "Unable to confirm read status. Refresh notifications before retrying.",
        );
      if (current !== sequence.current) return;
      acknowledged = true;
      const readAt = new Date().toISOString();
      setNotifications((previous) =>
        previous.map((item) =>
          !notificationId || item.notification_id === notificationId
            ? { ...item, read_at: item.read_at || readAt }
            : item,
        ),
      );
      setUnreadCount((previous) =>
        notificationId ? Math.max(0, previous - 1) : 0,
      );
    } catch (failure) {
      if (current === sequence.current)
        setActionError(
          requestError(failure, "Unable to update notifications."),
        );
    } finally {
      if (current === sequence.current) {
        busy.current = false;
        setSaving(false);
        // A refresh failure must not turn an acknowledged PATCH into a failed PATCH.
        if (acknowledged) void load();
      }
    }
  };
  return (
    <IonPage className="tea-info-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>Notifications</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          <PageIntro
            eyebrow="Your atelier"
            title="Your updates."
            description="Recent news from your orders and the Tea Atelier team."
          />
          <IonButton
            fill="outline"
            disabled={loading || saving}
            onClick={() => void load()}
          >
            Refresh notifications
          </IonButton>
          {!loading && !loadError && <p>{unreadCount} unread</p>}
          {unreadCount > 0 && (
            <IonButton
              disabled={loading || saving || !!loadError}
              onClick={() => void markRead()}
            >
              Mark all as read
            </IonButton>
          )}
          {loading && <p role="status">Loading notifications…</p>}
          {loadError && (
            <div role="alert">
              <p>{loadError}</p>
              <IonButton
                disabled={loading || saving}
                onClick={() => void load()}
              >
                Retry notifications
              </IonButton>
            </div>
          )}
          {actionError && <p role="alert">{actionError}</p>}
          {!loading && !loadError && notifications.length === 0 && (
            <div className="tea-state">
              <h2>No updates yet</h2>
              <p>Tea Atelier updates will appear here.</p>
            </div>
          )}
          {!loading &&
            notifications.map((item) => (
              <article
                className={
                  item.read_at
                    ? "tea-notification-card read"
                    : "tea-notification-card"
                }
                key={item.notification_id}
              >
                <span className="tea-notification-dot" />
                <div>
                  <p className="tea-order-label">{item.title}</p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{item.message}</p>
                  <small>
                    {new Date(item.created_at).toLocaleDateString()} ·{" "}
                    {item.read_at ? "Read" : "Unread"}
                  </small>
                  {!item.read_at && (
                    <IonButton
                      size="small"
                      fill="outline"
                      aria-label={`Mark ${item.title} as read`}
                      disabled={saving || !!loadError}
                      onClick={() => void markRead(item.notification_id)}
                    >
                      Mark as read
                    </IonButton>
                  )}
                  {Number.isSafeInteger(item.order_id) &&
                    Number(item.order_id) > 0 && (
                      <IonButton
                        size="small"
                        fill="clear"
                        routerLink={`/orders/${item.order_id}`}
                      >
                        View order
                      </IonButton>
                    )}
                </div>
              </article>
            ))}
        </div>
      </IonContent>
    </IonPage>
  );
}
