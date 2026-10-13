import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import React, { useState, useEffect, useCallback } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButton, IonText, IonIcon, IonBadge,
} from "@ionic/react";
import { checkmarkCircle } from "ionicons/icons";
import { useParams } from "react-router-dom";
import { openPaymentSource } from "../config/checkout";
import { fetchApi, ensureOk, requestError } from "../config/request";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import TeaLoader from "../components/TeaLoader";

type OrderDetail = {
  orderId: number;
  recipientName: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus?: string;
  createdAt: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: { productId: number; name: string; image: string; quantity: number; price: number }[];
};

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const [paymentError, setPaymentError] = useState("");
  const [openingPayment, setOpeningPayment] = useState(false);
  const openPayment = async () => {
    if (!order || !token) return;
    setOpeningPayment(true);
    setPaymentError("");
    try {
      const result = await openPaymentSource(token, order.orderId, order.paymentMethod);
      if (result.checkoutUrl) await Browser.open({ url: result.checkoutUrl });
      else if (result.paymentStatus) setOrder((current) => current ? { ...current, paymentStatus: result.paymentStatus } : current);
    } catch (error) { setPaymentError(requestError(error, "Unable to open payment page.")); }
    finally { setOpeningPayment(false); }
  };
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState("");

  const load = useCallback(async (verifyPayment = false) => {
    setIsLoading(true);
    setError("");
    try {
      if (verifyPayment) {
        const payment = await fetchApi(`${API_URL}/api/payments/paymongo/check`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orderId: Number(orderId) }),
        });
        await ensureOk(payment, "Unable to verify payment. Please try again.");
      }
      const res = await fetchApi(`${API_URL}/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      await ensureOk(res, "Unable to load confirmation.");
      const data = await res.json();
      setOrder(data);
    } catch (error) {
      setError(requestError(error, "Unable to load confirmation."));
    } finally {
      setIsLoading(false);
    }
  }, [orderId, token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const refreshOnReturn = () => { if (document.visibilityState === "visible") void load(true); };
    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    const listener = Capacitor.isNativePlatform()
      ? Browser.addListener("browserFinished", () => { void load(true); })
      : null;
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      if (listener) void listener.then((handle) => handle.remove());
    };
  }, [load]);

  if (isLoading) return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <TeaLoader size="page" label="Loading confirmation" />
      </IonContent>
    </IonPage>
  );

  if (error) return (
    <IonPage><IonContent className="ion-padding ion-text-center">
      <p role="alert">{error}</p>
      <IonButton onClick={() => void load()}>Try again</IonButton>
    </IonContent></IonPage>
  );

  if (!order) return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonText color="danger"><p>Order not found.</p></IonText>
      </IonContent>
    </IonPage>
  );

  const awaitingPayment = order.paymentMethod === "gcash" && order.paymentStatus?.toUpperCase() !== "PAID";
  const paymentUnavailable = ["CANCELLED", "PROCESSING"].includes(order.paymentStatus?.toUpperCase() || "");

  return (
    <IonPage className="tea-confirm-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>{awaitingPayment ? "Payment pending" : "Order received"}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="tea-card-panel" style={{ textAlign: "center", padding: "24px 20px" }}>
          <IonIcon icon={checkmarkCircle} hidden={awaitingPayment} style={{ fontSize: 64, color: "#5a7a52" }} />
          <h2 style={{ margin: "12px 0 6px", color: "#1d1b1a" }}>Thank you, {order.recipientName}!</h2>
          <p style={{ color: "#6d6a64", margin: 0 }}>Order #{order.orderId}</p>
          <div style={{ marginTop: 12 }}>
            <IonBadge color={awaitingPayment ? "warning" : "success"}>{awaitingPayment ? `Payment ${(order.paymentStatus || "pending").toLowerCase()}` : order.orderStatus}</IonBadge>
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

        {awaitingPayment && <div className="ion-text-center">
          <p>Your order has been received. Payment will be confirmed by the payment provider.</p>
          {paymentError && <p role="alert">{paymentError}</p>}
          {!paymentUnavailable && <IonButton disabled={openingPayment} onClick={() => void openPayment()}>{openingPayment ? "Opening payment…" : "Continue payment"}</IonButton>}
          <IonButton fill="outline" onClick={() => void load(true)}>Check payment status</IonButton>
        </div>}
        <IonButton expand="block" routerLink="/shop" style={{ marginTop: 16 }}>
          Continue Shopping
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default OrderConfirmationPage;
