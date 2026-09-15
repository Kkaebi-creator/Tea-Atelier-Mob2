import React, { useState, useEffect } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonLabel, IonButton, IonSpinner, IonText, IonIcon, IonBadge,
} from "@ionic/react";
import { checkmarkCircle } from "ionicons/icons";
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

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrder(await res.json());
      setIsLoading(false);
    })();
  }, [orderId]);

  if (isLoading) return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <IonSpinner name="crescent" />
      </IonContent>
    </IonPage>
  );

  if (!order) return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonText color="danger"><p>Order not found.</p></IonText>
      </IonContent>
    </IonPage>
  );

  return (
    <IonPage className="tea-confirm-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Order Confirmed</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="tea-card-panel" style={{ textAlign: "center", padding: "24px 20px" }}>
          <IonIcon icon={checkmarkCircle} style={{ fontSize: 64, color: "#5a7a52" }} />
          <h2 style={{ margin: "12px 0 6px", color: "#1d1b1a" }}>Thank you, {order.recipientName}!</h2>
          <p style={{ color: "#6d6a64", margin: 0 }}>Order #{order.orderId}</p>
          <div style={{ marginTop: 12 }}>
            <IonBadge color="success">{order.orderStatus}</IonBadge>
          </div>
        </div>

        <div className="tea-card-panel" style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: "#1d1b1a" }}>Order Summary</h3>
          {order.items.map((item) => (
            <div className="tea-item-row" key={item.productId}>
              <img src={item.image} alt={item.name} className="tea-item-thumb" />
              <div className="tea-item-copy">
                <p className="tea-item-name">{item.name}</p>
                <p className="tea-item-sub">₱{item.price.toFixed(2)} × {item.quantity}</p>
              </div>
              <span className="tea-amount">₱{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          <div className="tea-summary-box" style={{ marginTop: 14 }}>
            <div className="tea-summary-row">
              <span>Subtotal</span><span className="tea-amount">₱{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="tea-summary-row">
              <span>Delivery</span><span className="tea-amount">₱{order.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="tea-summary-row total">
              <span>Total</span><span className="tea-amount">₱{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <p style={{ color: "#d9d3cc", fontSize: 13, marginTop: 18 }}>
          Payment: {order.paymentMethod.toUpperCase()} &bull; {new Date(order.createdAt).toLocaleDateString()}
        </p>

        <IonButton expand="block" routerLink="/shop" style={{ marginTop: 16 }}>
          Continue Shopping
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default OrderConfirmationPage;
