import React, { useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonText, IonTitle, IonToolbar } from "@ionic/react";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

type Order = { id: number; status: string; createdAt: string; totalAmount: number };

const statusCopy: Record<string, string> = {
  pending: "Your order has been received and is waiting to be processed.",
  processing: "Your order is being prepared by Tea Atelier.",
  shipped: "Your order is on its way.",
  delivered: "Your order has been delivered. Enjoy your tea.",
  cancelled: "Your order has been cancelled.",
};

const NotificationsPage: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [readIds, setReadIds] = useState<number[]>([]);

  useEffect(() => {
    Preferences.get({ key: "read_order_notifications" }).then(({ value }) => { if (value) setReadIds(JSON.parse(value)); });
    if (!token) return;
    fetch(`${API_URL}/api/orders?page=1`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load notifications.");
        setOrders(data.orders);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Unable to load notifications."));
  }, [token]);

  const markRead = async (id: number) => {
    const next = readIds.includes(id) ? readIds : [...readIds, id];
    setReadIds(next);
    await Preferences.set({ key: "read_order_notifications", value: JSON.stringify(next) });
  };

  const markAllRead = async () => {
    const next = orders.map((order) => order.id);
    setReadIds(next);
    await Preferences.set({ key: "read_order_notifications", value: JSON.stringify(next) });
  };

  return (
    <IonPage className="tea-info-page">
      <IonHeader><IonToolbar><IonButtons slot="start"><IonMenuButton menu="tea-navigation" /></IonButtons><IonTitle>Notifications</IonTitle></IonToolbar></IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          <p className="tea-info-eyebrow">Order progression</p>
          <h1>Stay in the loop.</h1>
          {orders.some((order) => !readIds.includes(order.id)) && <button className="tea-notification-read-all" onClick={markAllRead}>Mark all as read</button>}
          {error && <IonText color="danger"><p>{error}</p></IonText>}
          {!error && orders.length === 0 && <div className="tea-state"><IonText><h2>No updates yet</h2><p>Your order updates will appear here.</p></IonText></div>}
          {!error && orders.map((order) => (
            <article className={readIds.includes(order.id) ? "tea-notification-card read" : "tea-notification-card"} key={order.id} onClick={() => markRead(order.id)}>
              <span className="tea-notification-dot" />
              <div><p className="tea-order-label">Order #{order.id} · {order.status}</p><p>{statusCopy[order.status.toLowerCase()] || `Your order status is ${order.status.toLowerCase()}.`}</p><small>{new Date(order.createdAt).toLocaleDateString()} · ₱{order.totalAmount.toFixed(2)}</small></div>
            </article>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default NotificationsPage;
