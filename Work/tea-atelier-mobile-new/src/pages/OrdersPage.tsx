import React, { useEffect, useState } from "react";
import {
  IonContent, IonHeader, IonPage, IonRefresher, IonRefresherContent,
  IonSpinner, IonText, IonTitle, IonToolbar,
} from "@ionic/react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import MobileTabBar from "../components/MobileTabBar";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: number;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

const paymentLabels: Record<string, string> = {
  cod: "Cash on Delivery",
  gcash: "GCash",
};

const OrdersPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    if (!token) return;
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/orders?page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load orders.");
      setOrders(data.orders);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load orders.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [token]);

  return (
    <IonPage className="tea-orders-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Orders</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher slot="fixed" onIonRefresh={async (event) => { await loadOrders(); event.detail.complete(); }}>
          <IonRefresherContent />
        </IonRefresher>
        <div className="tea-page-inner">
          {isLoading && <div className="tea-state"><IonSpinner name="crescent" /></div>}
          {!isLoading && error && (
            <div className="tea-state">
              <IonText color="danger"><p>{error}</p></IonText>
            </div>
          )}
          {!isLoading && !error && orders.length === 0 && (
            <div className="tea-state">
              <IonText><h2>No orders yet</h2><p>Your completed orders will appear here.</p></IonText>
            </div>
          )}
          {!isLoading && !error && orders.map((order) => (
            <article className="tea-order-card tea-order-card-clickable" key={order.id} onClick={() => navigate(`/orders/${order.id}`)}>
              <div className="tea-order-card-header">
                <div>
                  <p className="tea-order-label">Order #{order.id}</p>
                  <p className="tea-order-date">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="tea-order-status">{order.status}</span>
              </div>
              <div className="tea-order-items">
                {order.items.map((item) => (
                  <div className="tea-order-item" key={`${order.id}-${item.name}`}>
                    <span>{item.quantity} × {item.name}</span>
                    <strong>₱{(item.price * item.quantity).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
              <div className="tea-order-total">
                <span>{paymentLabels[order.paymentMethod] || order.paymentMethod}</span>
                <strong>₱{order.totalAmount.toFixed(2)}</strong>
              </div>
            </article>
          ))}
        </div>
      </IonContent>
      <MobileTabBar />
    </IonPage>
  );
};

export default OrdersPage;
