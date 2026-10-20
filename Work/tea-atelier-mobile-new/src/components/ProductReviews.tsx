import RefreshButton from "./RefreshButton";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { IonButton } from "@ionic/react";
import { API_URL } from "../config/api";
import { ensureOk, fetchApi, requestError } from "../config/request";
type Data = {
  reviews: {
    review_id: string;
    author: string;
    rating: number;
    body: string;
  }[];
  summary: { total: number; average: number };
  totalPages: number;
};
export default function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  const load = useCallback(
    async (requestedPage: number) => {
      const current = ++sequence.current;
      setLoading(true);
      setError("");
      try {
        const response = await fetchApi(
          `${API_URL}/api/products/${productId}/reviews?page=${requestedPage}`,
        );
        await ensureOk(response, "Unable to load reviews.");
        const result = await response.json();
        if (
          !Array.isArray(result.reviews) ||
          !result.summary ||
          typeof result.summary.total !== "number"
        )
          throw new Error("Unable to load reviews.");
        if (current === sequence.current) {
          setData(result);
          setPage(requestedPage);
        }
      } catch (failure) {
        if (current === sequence.current)
          setError(requestError(failure, "Unable to load reviews."));
      } finally {
        if (current === sequence.current) setLoading(false);
      }
    },
    [productId],
  );
  useEffect(() => {
    setData(null);
    setPage(1);
    void load(1);
    return invalidate;
  }, [load, invalidate]);
  return (
    <section
      className="tea-card-panel"
      aria-label="Customer reviews"
      style={{ marginTop: 20 }}
    >
      <h3>Customer reviews</h3>
      <RefreshButton
        label="Refresh reviews"
        busy={loading}
        onClick={() => void load(page)}
      />
      {loading && <p>Loading reviews…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && data && (
        <>
          {data.summary.total === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            <p>
              {data.summary.average} / 5 · {data.summary.total} reviews
            </p>
          )}
          {data.reviews.map((review) => (
            <article key={review.review_id}>
              <p>
                {review.author} · {review.rating} / 5
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{review.body}</p>
            </article>
          ))}
          {data.totalPages > 1 && (
            <div>
              <IonButton
                fill="outline"
                disabled={page <= 1}
                onClick={() => void load(page - 1)}
              >
                Previous reviews
              </IonButton>
              <span>
                Page {page} of {data.totalPages}
              </span>
              <IonButton
                fill="outline"
                disabled={page >= data.totalPages}
                onClick={() => void load(page + 1)}
              >
                Next reviews
              </IonButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
