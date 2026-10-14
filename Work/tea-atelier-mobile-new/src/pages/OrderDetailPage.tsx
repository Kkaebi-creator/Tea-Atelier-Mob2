import React, { useEffect, useState } from "react";
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonMenuButton, IonPage, IonText, IonTextarea, IonTitle, IonToolbar } from "@ionic/react";
import { useParams } from "react-router-dom";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import TeaLoader from "../components/TeaLoader";

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

type Review = { id: number; rating: number; text: string; author: string; productId: number };

const statusSteps = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];
const reviewSamples = [
  "Rich, balanced, and comforting. A lovely everyday tea.",
  "Beautiful flavor and carefully packed. Would order again.",
  "Arrived quickly and tasted fresh.",
];

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refundRequested, setRefundRequested] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [reviews, setReviews] = useState<Record<number, Review[]>>({});
  const [reviewItemId, setReviewItemId] = useState<number | null>(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load order.");
        setOrder(data);
        const refundResponse = await fetch(`${API_URL}/api/refunds?orderId=${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (refundResponse.ok) {
          const refundData = await refundResponse.json();
          setRefundRequested(refundData.refunds?.length > 0);
        }
        const reviewResults = await Promise.all(data.items.map(async (item: OrderDetail["items"][number]) => {
          const reviewResponse = await fetch(`${API_URL}/api/reviews?productId=${item.productId}`, { headers: { Authorization: `Bearer ${token}` } });
          const reviewData = reviewResponse.ok ? await reviewResponse.json() : { reviews: [] };
          return [item.productId, reviewData.reviews] as const;
        }));
        setReviews(Object.fromEntries(reviewResults));
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to load order.");
      } finally {
        setIsLoading(false);
      }
    };
    if (token && orderId) load();
  }, [orderId, token]);

  const requestRefund = async () => {
    if (!orderId) return;
    if (!orderId || !refundReason.trim()) return;
    const response = await fetch(`${API_URL}/api/refunds`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ orderId, reason: refundReason }) });
    if (response.ok) { setRefundRequested(true); setRefundReason(""); }
  };

  const submitReview = async (productId: number) => {
    if (!orderId || !reviewText.trim()) return;
    const response = await fetch(`${API_URL}/api/reviews`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ orderId, productId, rating: reviewStars, reviewText }) });
    if (!response.ok) return;
    setReviewItemId(null);
    setReviewText("");
    setReviewMessage("Review saved on this device.");
  };

  return (
    <IonPage className="tea-orders-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton menu="tea-navigation" aria-label="Open navigation menu" /></IonButtons>
          <IonTitle>Order Details</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {isLoading && <div className="tea-state"><TeaLoader size="page" label="Loading order" /></div>}
        {!isLoading && error && <div className="tea-state"><IonText color="danger"><p>{error}</p></IonText></div>}
        {!isLoading && order && (
          <div className="tea-page-inner">
            <div className="tea-order-card">
              <div className="tea-order-card-header">
                <div><p className="tea-order-label">Order #{order.orderId}</p><p className="tea-order-date">{new Date(order.createdAt).toLocaleDateString()}</p></div>
                <span className="tea-order-status">{order.orderStatus}</span>
              </div>
              <div className="tea-order-timeline">
                {statusSteps.map((step) => <span className={statusSteps.indexOf(step) <= Math.max(0, statusSteps.indexOf(order.orderStatus.toUpperCase())) ? "tea-timeline-step complete" : "tea-timeline-step"} key={step}>{step}</span>)}
              </div>
              {order.items.map((item) => (
                <div className="tea-order-product-block" key={item.productId}>
                  <div className="tea-item-row">
                    <img src={item.image} alt={item.name} className="tea-item-thumb" />
                    <div className="tea-item-copy"><p className="tea-item-name">{item.name}</p><p className="tea-item-sub">{item.quantity} × ₱{item.price.toFixed(2)}</p></div>
                    <strong>₱{(item.quantity * item.price).toFixed(2)}</strong>
                  </div>
                  <div className="tea-review-preview">{(reviews[item.productId] || []).length > 0 ? reviews[item.productId].slice(0, 2).map((review) => <div key={review.id}><span>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span><p>“{review.text}” · {review.author}</p></div>) : <p>“{reviewSamples[item.productId % reviewSamples.length]}”</p>}</div>
                  {reviewItemId === item.productId ? <div className="tea-review-form"><div className="tea-star-picker">{[1, 2, 3, 4, 5].map((star) => <button type="button" className={star <= reviewStars ? "selected" : ""} onClick={() => setReviewStars(star)} key={star}>★</button>)}</div><IonItem><IonLabel position="stacked">Your review</IonLabel><IonTextarea rows={3} value={reviewText} onIonChange={(event) => setReviewText(event.detail.value || "")} /></IonItem><IonButton expand="block" onClick={() => submitReview(item.productId)}>Submit review</IonButton></div> : <IonButton fill="outline" size="small" onClick={() => setReviewItemId(item.productId)}>Write a review</IonButton>}
                </div>
              ))}
              <div className="tea-summary-box" style={{ marginTop: 14 }}>
                <div className="tea-summary-row"><span>Subtotal</span><span className="tea-amount">₱{order.subtotal.toFixed(2)}</span></div>
                <div className="tea-summary-row"><span>Delivery</span><span className="tea-amount">₱{order.deliveryFee.toFixed(2)}</span></div>
                <div className="tea-summary-row total"><span>Total</span><span className="tea-amount">₱{order.total.toFixed(2)}</span></div>
              </div>
              <p className="tea-order-date">Payment: {order.paymentMethod.toUpperCase()} · Deliver to {order.recipientName}</p>
              {["gcash", "grabpay"].includes(order.paymentMethod) && <IonButton fill="outline" routerLink={`/order-confirmation/${order.orderId}`}>View payment status</IonButton>}
              {reviewMessage && <IonText color="success"><p>{reviewMessage}</p></IonText>}
              <div className="tea-order-actions">
                {!refundRequested && !["DELIVERED", "CANCELLED"].includes(order.orderStatus.toUpperCase()) && <IonItem><IonLabel position="stacked">Refund reason</IonLabel><IonInput value={refundReason} placeholder="Tell us what went wrong" onIonChange={(event) => setRefundReason(event.detail.value || "")} /></IonItem>}
                <IonButton fill="outline" color="danger" onClick={requestRefund} disabled={refundRequested || !refundReason.trim() || ["DELIVERED", "CANCELLED"].includes(order.orderStatus.toUpperCase())}>{refundRequested ? "Refund requested" : "Request refund"}</IonButton>
                <small>{refundRequested ? "Our team will review your request." : "Refund requests are available before delivery."}</small>
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default OrderDetailPage;
