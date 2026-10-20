import RefreshButton from "../components/RefreshButton";
import PageFrame from "../components/PageFrame";
import PageIntro from "../components/PageIntro";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonMenuButton,
} from "@ionic/react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { ensureOk, fetchApi, requestError } from "../config/request";
import TeaLoader from "../components/TeaLoader";
type Order = {
  id: number;
  status: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  items: { name: string; quantity: number; price: number }[];
};
const paymentLabels: Record<string, string> = {
  cod: "Cash on Delivery",
  gcash: "GCash",
  grabpay: "GrabPay",
};
export default function OrdersPage({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const requestedPage = useRef(1);
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  const load = useCallback(
    async (target: number) => {
      const current = ++sequence.current;
      requestedPage.current = target;
      setLoading(true);
      setError("");
      try {
        if (!token) throw new Error("Please sign in to view orders.");
        const response = await fetchApi(
          `${API_URL}/api/orders?page=${target}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        await ensureOk(response, "Unable to load orders.");
        const data = await response.json();
        if (
          !Array.isArray(data.orders) ||
          !Number.isSafeInteger(data.currentPage) ||
          data.currentPage < 1 ||
          !Number.isSafeInteger(data.totalPages) ||
          data.totalPages < 1 ||
          data.currentPage > data.totalPages
        )
          throw new Error("Unable to load order pagination.");
        if (current === sequence.current) {
          setOrders(data.orders);
          setPage(data.currentPage);
          setTotalPages(data.totalPages);
        }
      } catch (failure) {
        if (current === sequence.current)
          setError(requestError(failure, "Unable to load orders."));
      } finally {
        if (current === sequence.current) setLoading(false);
      }
    },
    [token],
  );
  useEffect(() => {
    setOrders([]);
    setPage(1);
    setTotalPages(1);
    void load(1);
    return invalidate;
  }, [load, invalidate]);
  return (
    <PageFrame embedded={embedded} className="tea-orders-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>My Orders</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonRefresher
          slot="fixed"
          onIonRefresh={async (event) => {
            try {
              await load(page);
            } finally {
              event.detail.complete();
            }
          }}
        >
          <IonRefresherContent />
        </IonRefresher>
        <div className="tea-page-inner">
          <PageIntro
            eyebrow="Your atelier"
            title="Your orders."
            description="Track deliveries and revisit your favorites."
          />
          <div className="tea-list-toolbar tea-orders-toolbar">
            <RefreshButton
              label="Refresh orders"
              busy={loading}
              onClick={() => void load(page)}
            />
          </div>
          {loading && (
            <div className="tea-state">
              <TeaLoader size="page" label="Loading orders" />
            </div>
          )}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <IonButton
                disabled={loading}
                onClick={() => void load(requestedPage.current)}
              >
                Retry orders
              </IonButton>
            </div>
          )}
          {!loading && !error && orders.length === 0 && (
            <div className="tea-state">
              <h2>No orders yet</h2>
              <p>Your orders will appear here.</p>
            </div>
          )}
          {!loading &&
            !error &&
            orders.map((order) => (
              <article
                className="tea-order-card tea-order-card-clickable"
                key={order.id}
                role="button"
                tabIndex={0}
                aria-label={`Open order ${order.id}`}
                onClick={() => navigate(`/orders/${order.id}`)}
                onKeyDown={(event) => {
                  if (["Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    navigate(`/orders/${order.id}`);
                  }
                }}
              >
                <div className="tea-order-card-header">
                  <div>
                    <p className="tea-order-label">Order #{order.id}</p>
                    <p className="tea-order-date">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="tea-order-status">{order.status}</span>
                </div>
                <div className="tea-order-items">
                  {order.items.map((item, index) => (
                    <div
                      className="tea-order-item"
                      key={`${order.id}-${index}`}
                    >
                      <span>
                        {item.quantity} × {item.name}
                      </span>
                      <strong>
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="tea-order-total">
                  <span>
                    {paymentLabels[order.paymentMethod] || order.paymentMethod}
                  </span>
                  <strong>₱{order.totalAmount.toFixed(2)}</strong>
                </div>
              </article>
            ))}
          {totalPages > 1 && (
            <nav aria-label="Order pages" className="tea-order-pagination">
              <IonButton
                fill="outline"
                disabled={loading || page <= 1}
                onClick={() => void load(page - 1)}
              >
                Previous orders
              </IonButton>
              <span>
                Page {page} of {totalPages}
              </span>
              <IonButton
                fill="outline"
                disabled={loading || page >= totalPages}
                onClick={() => void load(page + 1)}
              >
                Next orders
              </IonButton>
            </nav>
          )}
        </div>
      </IonContent>
    </PageFrame>
  );
}
