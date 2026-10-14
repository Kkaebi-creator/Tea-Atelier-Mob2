import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  IonButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
} from "@ionic/react";
import { API_URL } from "../config/api";
import { ensureOk, fetchApi, requestError } from "../config/request";
const reasons = {
  damaged: "Damaged item",
  wrong_item: "Wrong item",
  quality: "Product quality",
  cancelled_paid: "Paid order cancelled",
  other: "Other",
};
type Kind = "RETURN" | "REFUND";
type Case = {
  return_id: string;
  kind: Kind;
  reason: keyof typeof reasons;
  details: string;
  status: string;
  customer_message?: string;
  refund_amount_cents?: number;
  refund_state?: string | null;
  refund_is_test?: boolean | null;
};
type Data = { request: Case | null; canReturn: boolean; canRefund: boolean };
const statuses: Record<string, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RECEIVED: "Received",
  REFUNDED: "Refund recorded",
  CLOSED: "Closed",
};
const refundStates: Record<string, string> = {
  PROCESSING: "Processing",
  PENDING: "Pending",
  UNKNOWN: "Outcome being verified",
  SUCCEEDED: "Completed",
  FAILED: "Failed—contact Tea Atelier for assistance",
};
export default function OrderReturns({
  orderId,
  token,
}: {
  orderId: number;
  token: string;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [kind, setKind] = useState<Kind>("RETURN");
  const [reason, setReason] = useState("damaged");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(true);
  const sequence = useRef(0);
  const busy = useRef(false);
  const invalidate = useCallback(() => {
    ++sequence.current;
  }, []);
  const accept = useCallback((value: Data) => {
    if (
      typeof value.canReturn !== "boolean" ||
      typeof value.canRefund !== "boolean" ||
      !Object.hasOwn(value, "request")
    )
      throw new Error(
        "Unable to confirm request status. Refresh before retrying.",
      );
    setData(value);
    setVerificationRequired(false);
    setKind((current) =>
      (current === "RETURN" ? value.canReturn : value.canRefund)
        ? current
        : value.canReturn
          ? "RETURN"
          : "REFUND",
    );
  }, []);
  const load = useCallback(async () => {
    const current = ++sequence.current;
    setError("");
    setVerificationRequired(true);
    try {
      const response = await fetchApi(
        `${API_URL}/api/orders/${orderId}/returns`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      await ensureOk(response, "Unable to load return/refund eligibility.");
      const result = await response.json();
      if (current === sequence.current) accept(result);
    } catch (failure) {
      if (current === sequence.current)
        setError(
          requestError(failure, "Unable to load return/refund eligibility."),
        );
    }
  }, [orderId, token, accept]);
  useEffect(() => {
    setData(null);
    setDetails("");
    setSaving(false);
    busy.current = false;
    void load();
    return invalidate;
  }, [load, invalidate]);
  const submit = async () => {
    if (
      busy.current ||
      verificationRequired ||
      !data ||
      data.request ||
      !(kind === "RETURN" ? data.canReturn : data.canRefund)
    )
      return;
    setError("");
    const text = details.trim();
    if (text.length < 10 || text.length > 2000) {
      setError("Details must be 10–2000 characters.");
      return;
    }
    if (!Object.hasOwn(reasons, reason)) {
      setError("Choose a valid reason.");
      return;
    }
    busy.current = true;
    setSaving(true);
    const current = ++sequence.current;
    try {
      const response = await fetchApi(
        `${API_URL}/api/orders/${orderId}/returns`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ kind, reason, details: text }),
        },
      );
      await ensureOk(response, "Unable to submit your request.");
      const result = await response.json();
      if (!result.request?.return_id)
        throw new Error(
          "Unable to confirm your request. Refresh before retrying.",
        );
      if (current === sequence.current) {
        accept(result);
        setDetails("");
      }
    } catch (failure) {
      if (current === sequence.current) {
        setVerificationRequired(true);
        setError(
          `${requestError(failure, "Unable to submit your request.")} Refresh request status before retrying if delivery is uncertain.`,
        );
      }
    } finally {
      if (current === sequence.current) {
        busy.current = false;
        setSaving(false);
      }
    }
  };
  const request = data?.request;
  return (
    <section className="tea-card-panel" aria-label="Returns and refunds">
      <h3>Returns and refunds</h3>
      <IonButton disabled={saving} fill="outline" onClick={() => void load()}>
        Refresh request status
      </IonButton>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p>Loading return/refund eligibility…</p>}
      {request ? (
        <article>
          <h4>
            {request.kind === "RETURN" ? "Return request" : "Refund request"}
          </h4>
          <p>Request status: {statuses[request.status] || request.status}</p>
          <p>{reasons[request.reason] || request.reason}</p>
          <p style={{ whiteSpace: "pre-wrap" }}>{request.details}</p>
          {request.customer_message && (
            <div>
              <h4>Tea Atelier’s update</h4>
              <p style={{ whiteSpace: "pre-wrap" }}>
                {request.customer_message}
              </p>
            </div>
          )}
          {!!request.refund_amount_cents && (
            <p>
              Refund amount: ₱{(request.refund_amount_cents / 100).toFixed(2)}
            </p>
          )}
          {request.refund_state && (
            <p>
              Refund status:{" "}
              {refundStates[request.refund_state] || request.refund_state}
            </p>
          )}
          {request.refund_is_test && <p>Test refund</p>}
        </article>
      ) : data && (data.canReturn || data.canRefund) ? (
        <div>
          <label>Request type</label>
          <IonSelect
            aria-label="Request type"
            value={kind}
            disabled={saving}
            onIonChange={(event) => setKind(event.detail.value)}
          >
            {data.canReturn && (
              <IonSelectOption value="RETURN">Return</IonSelectOption>
            )}
            {data.canRefund && (
              <IonSelectOption value="REFUND">Refund</IonSelectOption>
            )}
          </IonSelect>
          <label>Reason</label>
          <IonSelect
            aria-label="Reason"
            value={reason}
            disabled={saving}
            onIonChange={(event) => setReason(event.detail.value)}
          >
            {Object.entries(reasons).map(([value, label]) => (
              <IonSelectOption value={value} key={value}>
                {label}
              </IonSelectOption>
            ))}
          </IonSelect>
          <label>Details</label>
          <IonTextarea
            aria-label="Request details"
            value={details}
            maxlength={2000}
            rows={4}
            disabled={saving}
            onIonInput={(event) => {
              setDetails(event.detail.value || "");
              setError("");
            }}
          />
          <p>
            Tea Atelier will review your request. Submitting it does not confirm
            a refund.
          </p>
          <IonButton
            disabled={saving || verificationRequired}
            onClick={() => void submit()}
          >
            {saving ? "Submitting request…" : "Submit request"}
          </IonButton>
        </div>
      ) : (
        data && (
          <p>This order is not currently eligible for a return or refund.</p>
        )
      )}
    </section>
  );
}
