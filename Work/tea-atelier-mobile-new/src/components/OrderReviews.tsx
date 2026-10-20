import RefreshButton from "./RefreshButton";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { IonButton, IonTextarea } from "@ionic/react";
import { API_URL } from "../config/api";
import { ensureOk, fetchApi, requestError } from "../config/request";
type Review = { rating: number; body: string; updated_at?: string };
type Data = {
  eligible: boolean;
  items: { productId: number; name: string; review: Review | null }[];
};
export default function OrderReviews({
  orderId,
  token,
}: {
  orderId: number;
  token: string;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [rating, setRating] = useState(5);
  const [saving, setSaving] = useState(false);
  const sequence = useRef(0);
  const busy = useRef(false);
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setError("");
    try {
      const response = await fetchApi(
        `${API_URL}/api/orders/${orderId}/reviews`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await ensureOk(response, "Unable to load review eligibility.");
      const result = await response.json();
      if (!Array.isArray(result.items) || typeof result.eligible !== "boolean")
        throw new Error("Unable to load review eligibility.");
      if (current === sequence.current) setData(result);
    } catch (failure) {
      if (current === sequence.current)
        setError(requestError(failure, "Unable to load review eligibility."));
    }
  }, [orderId, token]);
  useEffect(() => {
    setData(null);
    setEditing(null);
    setMessage("");
    setSaving(false);
    busy.current = false;
    void load();
    return invalidate;
  }, [load, invalidate]);
  const save = async () => {
    if (busy.current || !data?.eligible || editing === null) return;
    const trimmed = body.trim();
    setError("");
    setMessage("");
    if (trimmed.length < 10 || trimmed.length > 2000) {
      setError("Review must be 10–2000 characters.");
      return;
    }
    const productId = editing;
    busy.current = true;
    setSaving(true);
    const current = ++sequence.current;
    try {
      const response = await fetchApi(
        `${API_URL}/api/orders/${orderId}/reviews`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId, rating, body: trimmed }),
        },
      );
      await ensureOk(response, "Unable to save review.");
      const result = await response.json();
      if (!result.review || typeof result.review.body !== "string")
        throw new Error(
          "Unable to confirm your saved review. Refresh before retrying.",
        );
      if (current !== sequence.current) return;
      setData((previous) =>
        previous
          ? {
              ...previous,
              items: previous.items.map((item) =>
                item.productId === productId
                  ? { ...item, review: result.review }
                  : item,
              ),
            }
          : previous,
      );
      setEditing(null);
      setMessage("Review saved to Tea Atelier.");
    } catch (failure) {
      if (current === sequence.current)
        setError(requestError(failure, "Unable to save review."));
    } finally {
      if (current === sequence.current) {
        busy.current = false;
        setSaving(false);
      }
    }
  };
  return (
    <section className="tea-card-panel" aria-label="Your product reviews">
      <h3>Your product reviews</h3>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <RefreshButton
            label="Refresh review eligibility"
            disabled={saving}
            onClick={() => void load()}
          />
        </div>
      )}
      {!data && !error && <p>Loading review eligibility…</p>}
      {data && !data.eligible && (
        <p>Reviews are available for delivered, paid orders.</p>
      )}
      {message && <p role="status">{message}</p>}
      {data?.items.map((item) => (
        <article key={item.productId}>
          <h4>{item.name}</h4>
          {item.review ? (
            <div>
              <p aria-label={`Rating ${item.review.rating} out of 5`}>
                {"★".repeat(item.review.rating)}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.review.body}</p>
            </div>
          ) : (
            <p>You haven’t reviewed this product.</p>
          )}
          {editing === item.productId ? (
            <div>
              <div
                className="tea-star-picker"
                role="group"
                aria-label="Review rating"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    disabled={saving}
                    aria-label={`Rate ${star} stars`}
                    aria-pressed={rating === star}
                    onClick={() => setRating(star)}
                    className={rating === star ? "selected" : ""}
                  >
                    ★
                  </button>
                ))}
              </div>
              <IonTextarea
                aria-label="Your review"
                value={body}
                rows={4}
                maxlength={2000}
                disabled={saving}
                onIonInput={(event) => setBody(event.detail.value || "")}
              />
              <IonButton disabled={saving} onClick={() => void save()}>
                {saving ? "Saving review…" : "Save review"}
              </IonButton>
              <IonButton
                disabled={saving}
                fill="clear"
                onClick={() => setEditing(null)}
              >
                Cancel editing
              </IonButton>
            </div>
          ) : (
            data.eligible && (
              <IonButton
                disabled={saving}
                fill="outline"
                onClick={() => {
                  setEditing(item.productId);
                  setBody(item.review?.body || "");
                  setRating(item.review?.rating || 5);
                  setError("");
                  setMessage("");
                }}
              >
                {item.review ? "Edit review" : "Write review"}
              </IonButton>
            )
          )}
        </article>
      ))}
    </section>
  );
}
