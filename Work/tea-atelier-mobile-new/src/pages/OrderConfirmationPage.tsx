import RefreshButton from "../components/RefreshButton";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonText,
  IonIcon,
  IonBadge,
} from "@ionic/react";
import { checkmarkCircle } from "ionicons/icons";
import { useParams } from "react-router-dom";
import {
  openPaymentSource,
  readPaymentStatus,
  resolvePaymentStatus,
  type PaymentStatus,
} from "../config/checkout";
import { fetchApi, ensureOk, requestError } from "../config/request";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
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
  items: {
    productId: number;
    name: string;
    image: string;
    quantity: number;
    price: number;
  }[];
};

const paymentCopy = {
  pending: {
    title: "Payment pending",
    label: "Payment pending",
    color: "warning",
    message: "Your order is saved. Continue payment when you are ready.",
  },
  processing: {
    title: "Confirming payment",
    label: "Payment processing",
    color: "warning",
    message:
      "Your payment is being confirmed. Check its status before starting another attempt.",
  },
  paid: {
    title: "Payment confirmed",
    label: "Payment paid",
    color: "success",
    message: "Your payment has been confirmed.",
  },
  failed: {
    title: "Payment failed",
    label: "Payment failed",
    color: "danger",
    message:
      "The previous payment attempt failed. You can retry payment for this order.",
  },
  cancelled: {
    title: "Order cancelled",
    label: "Order cancelled",
    color: "medium",
    message:
      "This order has been cancelled. Contact Tea Atelier if payment was already completed.",
  },
  unknown: {
    title: "Payment status unavailable",
    label: "Payment status unavailable",
    color: "medium",
    message: "Check payment status before trying again. Your order is saved.",
  },
} as const;

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const { refresh, error: cartError } = useCart();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [openingPayment, setOpeningPayment] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState<PaymentStatus | null>(
    null,
  );
  const [verificationRequired, setVerificationRequired] = useState(false);
  const orderRef = useRef<OrderDetail | null>(null);
  const statusRef = useRef<PaymentStatus | null>(null);
  const sequence = useRef(0);
  const checkingRef = useRef(false);
  const openingRef = useRef(false);

  const acknowledge = useCallback((status: PaymentStatus) => {
    // A later stale response must not undo a confirmed payment/cancellation.
    const next = resolvePaymentStatus(
      status,
      statusRef.current === "paid" || statusRef.current === "cancelled"
        ? statusRef.current
        : null,
    );
    statusRef.current = next;
    setVerifiedStatus(next);
    setVerificationRequired(false);
  }, []);

  const load = useCallback(async () => {
    if (checkingRef.current || openingRef.current) return;
    checkingRef.current = true;
    const current = ++sequence.current;
    if (!orderRef.current) setIsLoading(true);
    setError("");
    setPaymentError("");
    setCheckingPayment(true);
    try {
      if (
        !token ||
        !Number.isSafeInteger(Number(orderId)) ||
        Number(orderId) <= 0
      ) {
        throw new Error(
          "Unable to load this order. Please sign in and open it from your orders.",
        );
      }
      const res = await fetchApi(`${API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await ensureOk(res, "Unable to load confirmation.");
      const data: OrderDetail = await res.json();
      if (current !== sequence.current) return;
      orderRef.current = data;
      setOrder(data);
      const online = ["gcash", "grabpay"].includes(data.paymentMethod);
      const stored = readPaymentStatus(data.paymentStatus);
      if (stored === "paid" || stored === "cancelled") acknowledge(stored);
      else if (online && data.orderStatus !== "CANCELLED") {
        checkingRef.current = true;
        const payment = await fetchApi(
          `${API_URL}/api/payments/paymongo/check`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ orderId: Number(orderId) }),
          },
        );
        await ensureOk(payment, "Unable to verify payment. Please try again.");
        const result = await payment.json();
        const status = readPaymentStatus(result.paymentStatus);
        if (status === "unknown")
          throw new Error("Payment outcome is unresolved. Please check again.");
        if (current === sequence.current) acknowledge(status);
      }
    } catch (requestFailure) {
      if (current !== sequence.current) return;
      const message = requestError(
        requestFailure,
        "Unable to load confirmation.",
      );
      if (orderRef.current) {
        setPaymentError(message);
        setVerificationRequired(true);
      } else setError(message);
    } finally {
      if (current === sequence.current) {
        checkingRef.current = false;
        setCheckingPayment(false);
        setIsLoading(false);
      }
    }
  }, [orderId, token, acknowledge]);

  const invalidateRequests = useCallback(() => {
    ++sequence.current;
  }, []);

  useEffect(() => {
    orderRef.current = null;
    statusRef.current = null;
    checkingRef.current = false;
    openingRef.current = false;
    setOrder(null);
    setVerifiedStatus(null);
    setVerificationRequired(false);
    void load();
    return invalidateRequests;
  }, [load, invalidateRequests]);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", refreshOnReturn);
    window.addEventListener("tea-payment-return", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);
    const listener = Capacitor.isNativePlatform()
      ? Browser.addListener("browserFinished", () => {
          void load();
        })
      : null;
    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      window.removeEventListener("tea-payment-return", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      if (listener) void listener.then((handle) => handle.remove());
    };
  }, [load]);

  const status = resolvePaymentStatus(order?.paymentStatus, verifiedStatus);
  const online = !!order && ["gcash", "grabpay"].includes(order.paymentMethod);
  const cancelled =
    order?.orderStatus === "CANCELLED" || status === "cancelled";
  const displayedStatus = cancelled
    ? "cancelled"
    : verificationRequired && status !== "paid"
      ? "unknown"
      : status;
  const canPay =
    online &&
    !cancelled &&
    !verificationRequired &&
    ["pending", "failed"].includes(status);
  const confirmedOrderId = order?.orderId;

  useEffect(() => {
    if (confirmedOrderId && status === "paid") void refresh();
  }, [confirmedOrderId, status, refresh]);

  const openPayment = async () => {
    if (
      !order ||
      !token ||
      !canPay ||
      checkingRef.current ||
      openingRef.current
    )
      return;
    const current = sequence.current;
    openingRef.current = true;
    setOpeningPayment(true);
    setPaymentError("");
    try {
      const result = await openPaymentSource(
        token,
        order.orderId,
        order.paymentMethod,
      );
      if (current !== sequence.current) return;
      const reported = result.paymentStatus ?? "pending";
      acknowledge(reported);
      if (result.checkoutUrl && reported === "pending")
        await Browser.open({ url: result.checkoutUrl });
    } catch (requestFailure) {
      if (current === sequence.current) {
        setPaymentError(
          requestError(requestFailure, "Unable to open payment page."),
        );
        setVerificationRequired(true);
      }
    } finally {
      if (current === sequence.current) {
        openingRef.current = false;
        setOpeningPayment(false);
      }
    }
  };

  if (isLoading)
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <TeaLoader size="page" label="Loading confirmation" />
        </IonContent>
      </IonPage>
    );
  if (error)
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <p role="alert">{error}</p>
          <IonButton onClick={() => void load()}>Try again</IonButton>
        </IonContent>
      </IonPage>
    );
  if (!order)
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <IonText color="danger">
            <p>Order not found.</p>
          </IonText>
        </IonContent>
      </IonPage>
    );

  const copy = paymentCopy[displayedStatus];
  const title = cancelled || online ? copy.title : "Order received";
  const busy = checkingPayment || openingPayment;

  return (
    <IonPage className={`tea-confirm-page tea-payment-${displayedStatus}`}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div
          className="tea-card-panel"
          style={{ textAlign: "center", padding: "24px 20px" }}
        >
          {!cancelled && (!online || status === "paid") && (
            <IonIcon
              icon={checkmarkCircle}
              style={{ fontSize: 64, color: "#5a7a52" }}
            />
          )}
          <h2 style={{ margin: "12px 0 6px", color: "#1d1b1a" }}>
            {cancelled
              ? order.recipientName
              : `Thank you, ${order.recipientName}!`}
          </h2>
          <p style={{ color: "#6d6a64", margin: 0 }}>Order #{order.orderId}</p>
          <div style={{ marginTop: 12 }}>
            <IonBadge color={cancelled || online ? copy.color : "success"}>
              {cancelled || online ? copy.label : order.orderStatus}
            </IonBadge>
          </div>
          {cancelled || online ? <p>{copy.message}</p> : null}
        </div>
        <div className="tea-card-panel" style={{ marginTop: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: "#1d1b1a" }}>
            Order Summary
          </h3>
          {order.items.map((item) => (
            <div className="tea-item-row" key={item.productId}>
              {item.image && (
                <img
                  src={item.image}
                  alt={item.name}
                  className="tea-item-thumb"
                />
              )}
              <div className="tea-item-copy">
                <p className="tea-item-name">{item.name}</p>
                <p className="tea-item-sub">
                  ₱{item.price.toFixed(2)} × {item.quantity}
                </p>
              </div>
              <span className="tea-amount">
                ₱{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="tea-summary-box" style={{ marginTop: 14 }}>
            <div className="tea-summary-row">
              <span>Subtotal</span>
              <span className="tea-amount">₱{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="tea-summary-row">
              <span>Delivery</span>
              <span className="tea-amount">
                ₱{order.deliveryFee.toFixed(2)}
              </span>
            </div>
            <div className="tea-summary-row total">
              <span>Total</span>
              <span className="tea-amount">₱{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        <p style={{ color: "#6d6a64", fontSize: 13, marginTop: 18 }}>
          Payment: {order.paymentMethod.toUpperCase()} &bull;{" "}
          {new Date(order.createdAt).toLocaleDateString()}
        </p>
        {paymentError && <p role="alert">{paymentError}</p>}
        {online && !cancelled && status !== "paid" && (
          <div className="ion-text-center">
            {canPay && (
              <IonButton disabled={busy} onClick={() => void openPayment()}>
                {openingPayment ? "Opening payment…" : "Continue payment"}
              </IonButton>
            )}
            <IonButton
              fill="outline"
              disabled={busy}
              onClick={() => void load()}
            >
              {checkingPayment ? "Checking payment…" : "Check payment status"}
            </IonButton>
          </div>
        )}
        {status === "paid" && cartError && (
          <div role="alert">
            <p>
              Your payment is confirmed, but your cart could not be refreshed.
            </p>
            <RefreshButton
              label="Refresh cart"
              onClick={() => void refresh()}
            />
          </div>
        )}
        <IonButton expand="block" routerLink="/shop" style={{ marginTop: 16 }}>
          Continue Shopping
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default OrderConfirmationPage;
