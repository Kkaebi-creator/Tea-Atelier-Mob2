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
import { useParams } from "react-router-dom";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { ensureOk, fetchApi, requestError } from "../config/request";
import PageIntro from "../components/PageIntro";
import TeaLoader from "../components/TeaLoader";
import OrderReviews from "../components/OrderReviews";
import OrderReturns from "../components/OrderReturns";
type Order = {
  orderId: number;
  recipientName: string;
  orderStatus: string;
  paymentMethod: string;
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
const steps = ["PLACED", "PROCESSING", "SHIPPED", "DELIVERED"];
export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      if (!token) throw new Error("Please sign in to view this order.");
      const response = await fetchApi(`${API_URL}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await ensureOk(response, "Unable to load order.");
      const data = await response.json();
      if (current === sequence.current) setOrder(data);
    } catch (failure) {
      if (current === sequence.current)
        setError(requestError(failure, "Unable to load order."));
    } finally {
      if (current === sequence.current) setLoading(false);
    }
  }, [orderId, token]);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, invalidate]);
  return (
    <IonPage className="tea-orders-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>Order Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="tea-page-inner">
          {loading && <TeaLoader size="page" label="Loading order" />}
          {error && (
            <div role="alert" className="tea-state">
              <p>{error}</p>
              <IonButton onClick={() => void load()}>Retry order</IonButton>
            </div>
          )}
          {!loading && order && token && (
            <div>
              <PageIntro
                eyebrow="Your atelier orders"
                title="Every step of your order."
                description="Follow its progress, view payment details, and find reviews and support below."
              />
              <div className="tea-order-card">
                <div className="tea-order-card-header">
                  <div>
                    <p className="tea-order-label">Order #{order.orderId}</p>
                    <p className="tea-order-date">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="tea-order-status">{order.orderStatus}</span>
                </div>
                {steps.includes(order.orderStatus) && (
                  <div
                    className="tea-order-timeline"
                    role="list"
                    aria-label="Order progress"
                  >
                    {steps.map((step) => (
                      <span
                        key={step}
                        role="listitem"
                        aria-current={
                          step === order.orderStatus ? "step" : undefined
                        }
                        className={
                          steps.indexOf(step) <=
                          steps.indexOf(order.orderStatus)
                            ? "tea-timeline-step complete"
                            : "tea-timeline-step"
                        }
                      >
                        {step}
                      </span>
                    ))}
                  </div>
                )}
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
                      <p>
                        {item.quantity} × ₱{item.price.toFixed(2)}
                      </p>
                      <IonButton
                        size="small"
                        fill="clear"
                        routerLink={`/product/${item.productId}`}
                      >
                        View product and reviews
                      </IonButton>
                    </div>
                    <strong>₱{(item.quantity * item.price).toFixed(2)}</strong>
                  </div>
                ))}
                <div className="tea-summary-box">
                  <div className="tea-summary-row">
                    <span>Subtotal</span>
                    <span>₱{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="tea-summary-row">
                    <span>Delivery</span>
                    <span>₱{order.deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="tea-summary-row total">
                    <span>Total</span>
                    <span className="tea-amount">
                      ₱{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="tea-policy-section">
                  <p className="tea-panel-copy">Payment method</p>
                  <p>{order.paymentMethod.toUpperCase()}</p>
                  <p className="tea-panel-copy">Deliver to</p>
                  <p>{order.recipientName}</p>
                </div>
                {["gcash", "grabpay"].includes(order.paymentMethod) && (
                  <IonButton
                    fill="outline"
                    routerLink={`/order-confirmation/${order.orderId}`}
                  >
                    View payment status
                  </IonButton>
                )}
              </div>
              <OrderReviews orderId={order.orderId} token={token} />
              <OrderReturns orderId={order.orderId} token={token} />
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
}
