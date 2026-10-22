import PageFrame from "../components/PageFrame";
import PageIntro from "../components/PageIntro";
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
  useIonViewWillEnter,
} from "@ionic/react";
import {
  checkmarkDoneOutline,
  checkmarkOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import RefreshButton from "../components/RefreshButton";
import { useNotifications } from "../context/NotificationsContext";
export default function NotificationsPage({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const {
    notifications,
    unreadCount,
    loading,
    saving,
    loadError,
    actionError,
    refresh: load,
    markRead,
  } = useNotifications();
  useIonViewWillEnter(() => {
    void load();
  });
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
          <div className="tea-list-toolbar tea-notifications-toolbar">
            {!loading && !loadError && (
              <p className="tea-list-summary" aria-live="polite">
                {unreadCount} unread
              </p>
            )}
            <div className="tea-list-actions">
              <RefreshButton
                label="Refresh notifications"
                busy={loading}
                disabled={saving}
                onClick={() => void load()}
              />
              {unreadCount > 0 && (
                <IonButton
                  fill="clear"
                  className="tea-action-button"
                  disabled={loading || saving || !!loadError}
                  onClick={() => void markRead()}
                >
                  <IonIcon
                    icon={checkmarkDoneOutline}
                    slot="start"
                    aria-hidden="true"
                  />
                  Mark all as read
                </IonButton>
              )}
            </div>
          </div>
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
                  <div className="tea-notification-footer">
                    <small>
                      {new Date(item.created_at).toLocaleDateString()} ·{" "}
                      {item.read_at ? "Read" : "Unread"}
                    </small>
                    <div className="tea-notification-actions">
                      {!item.read_at && (
                        <IonButton
                          size="small"
                          fill="clear"
                          className="tea-action-button"
                          aria-label={`Mark ${item.title} as read`}
                          disabled={saving || !!loadError}
                          onClick={() => void markRead(item.notification_id)}
                        >
                          <IonIcon
                            icon={checkmarkOutline}
                            slot="start"
                            aria-hidden="true"
                          />
                          Mark as read
                        </IonButton>
                      )}
                      {Number.isSafeInteger(item.order_id) &&
                        Number(item.order_id) > 0 && (
                          <IonButton
                            size="small"
                            fill="clear"
                            className="tea-action-button"
                            routerLink={`/orders/${item.order_id}`}
                          >
                            View order
                            <IonIcon
                              icon={arrowForwardOutline}
                              slot="end"
                              aria-hidden="true"
                            />
                          </IonButton>
                        )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </IonContent>
    </PageFrame>
  );
}
