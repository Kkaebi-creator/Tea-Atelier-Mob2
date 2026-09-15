import React, { useEffect, useState } from "react";
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonSpinner, IonText, IonTitle, IonToolbar } from "@ionic/react";
import { useParams } from "react-router-dom";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";

type OrderDetail = {
  orderId: number;
  recipientName: string;
  orderStatus: string;
  paymentMethod: string;
  createdAt: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: { productId: number; name: string; image: string; quantity: number; price: number }[];
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load order.");
        setOrder(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load order.");
      } finally {
        setIsLoading(false);
      }
    };
    if (token && orderId) load();
  }, [orderId, token]);

  return (
    <IonPage className="tea-orders-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/orders" /></IonButtons>
          <IonTitle>Order Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {isLoading && <div className="tea-state"><IonSpinner name="crescent" /></div>}
        {!isLoading && error && <div className="tea-state"><IonText color="danger"><p>{error}</p></IonText></div>}
        {!isLoading && order && (
          <div className="tea-page-inner">
            <div className="tea-order-card">
              <div className="tea-order-card-header">
                <div><p className="tea-order-label">Order #{order.orderId}</p><p className="tea-order-date">{new Date(order.createdAt).toLocaleDateString()}</p></div>
                <span className="tea-order-status">{order.orderStatus}</span>
              </div>
              {order.items.map((item) => (
                <div className="tea-item-row" key={item.productId}>
                  <img src={item.image} alt={item.name} className="tea-item-thumb" />
                  <div className="tea-item-copy"><p className="tea-item-name">{item.name}</p><p className="tea-item-sub">{item.quantity} × ₱{item.price.toFixed(2)}</p></div>
                  <strong>₱{(item.quantity * item.price).toFixed(2)}</strong>
                </div>
              ))}
              <div className="tea-summary-box" style={{ marginTop: 14 }}>
                <div className="tea-summary-row"><span>Subtotal</span><span className="tea-amount">₱{order.subtotal.toFixed(2)}</span></div>
                <div className="tea-summary-row"><span>Delivery</span><span className="tea-amount">₱{order.deliveryFee.toFixed(2)}</span></div>
                <div className="tea-summary-row total"><span>Total</span><span className="tea-amount">₱{order.total.toFixed(2)}</span></div>
              </div>
              <p className="tea-order-date">Payment: {order.paymentMethod.toUpperCase()} · Deliver to {order.recipientName}</p>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default OrderDetailPage;
