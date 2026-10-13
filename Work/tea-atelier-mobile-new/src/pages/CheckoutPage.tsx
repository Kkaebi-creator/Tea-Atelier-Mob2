import React, { useEffect, useState } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem,
  IonLabel, IonInput, IonButton, IonText, IonRadioGroup,
  IonRadio, IonButtons, IonMenuButton,
  IonSelect, IonSelectOption,
} from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";
import { placeOrder } from "../config/checkout";
import { fetchApi, ensureOk, requestError } from "../config/request";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import TeaLoader from "../components/TeaLoader";

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const { items, refresh, updateQuantity } = useCart();
  const selectedProductIds = (location.state as { selectedProductIds?: string[] } | null)?.selectedProductIds;
  const checkoutItems = selectedProductIds?.length ? items.filter((item) => selectedProductIds.includes(item.product.id)) : items;
  const [form, setForm] = useState({
    fullName: user?.name ?? "",
    phone: user?.phone ?? "",
    street: "",
    city: "",
    province: "",
    paymentMethod: "cod",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState<{ address_id: string; address_line1: string; address_line2: string | null; address_line3: string | null }[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [settings, setSettings] = useState<{
    shipping: Record<string, { enabled: boolean; feeCents: number }>;
    freeShippingThresholdCents: number | null;
    payments: Record<string, boolean>;
  } | null>(null);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [settingsError, setSettingsError] = useState("");
  const loadSettings = async () => {
    setSettingsError("");
    try {
      const response = await fetchApi(`${API_URL}/api/settings`);
      await ensureOk(response, "Unable to load checkout options.");
      const { config } = await response.json();
      if (!config?.shipping || !config?.payments) throw new Error("Checkout options are unavailable.");
      setSettings(config);
      setShippingMethod((current) => config.shipping[current]?.enabled ? current : Object.keys(config.shipping).find((key) => config.shipping[key].enabled) || "");
      setForm((current) => ({ ...current, paymentMethod: config.payments[current.paymentMethod] ? current.paymentMethod : ["cod", "gcash"].find((key) => config.payments[key]) || "" }));
    } catch (error) { setSettingsError(requestError(error, "Unable to load checkout options.")); }
  };
  useEffect(() => { void loadSettings(); }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/addresses`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) return;
        const savedAddresses = (await response.json()).addresses || [];
        setAddresses(savedAddresses);
        const preferred = savedAddresses.find((address: { default_address?: boolean }) => address.default_address) || savedAddresses[0];
        if (preferred) {
          setSelectedAddressId(preferred.address_id);
          selectAddress(preferred.address_id, savedAddresses);
        }
      })
      .catch(() => undefined);
  }, [token]);

  const selectAddress = (addressId: string, addressList = addresses) => {
    setSelectedAddressId(addressId);
    const address = addressList.find((item) => item.address_id === addressId);
    if (!address) return;
    const [city = "", province = ""] = (address.address_line2 || "").split(", ");
    setForm((current) => ({ ...current, street: address.address_line1, city, province }));
  };

  const set = (field: string) => (e: CustomEvent) =>
    setForm((prev) => ({ ...prev, [field]: e.detail.value! }));

  const subtotal = checkoutItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shipping = settings?.shipping[shippingMethod];
  const deliveryFee = settings?.freeShippingThresholdCents != null && subtotal * 100 >= settings.freeShippingThresholdCents
    ? 0 : (shipping?.feeCents ?? 0) / 100;
  const total = subtotal + deliveryFee;

  const handleSubmit = async () => {
    setError("");
    if (!form.street || !form.city || !form.province) {
      setError("All address fields are required.");
      return;
    }
    setIsLoading(true);
    try {
      if (!token || !user || !shipping?.enabled || !settings?.payments[form.paymentMethod]) {
        throw new Error("Select an available delivery and payment method.");
      }
      const data = await placeOrder(token, user.email, {
        street: form.street, city: form.city, province: form.province,
        shippingMethod, paymentMethod: form.paymentMethod,
        phone: form.phone, fullName: form.fullName,
        ...(selectedProductIds?.length ? { selectedProductIds } : {}),
      });
      await refresh();
      navigate(`/order-confirmation/${data.orderId}`, { replace: true });
    } catch (error) {
      setError(requestError(error, "Unable to place order."));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <IonText><p>Please sign in to checkout.</p></IonText>
        <IonButton routerLink="/login">Sign In</IonButton>
      </IonContent>
    </IonPage>
  );

  return (
    <IonPage className="tea-checkout-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonMenuButton menu="tea-navigation" aria-label="Open navigation menu" /></IonButtons>
          <IonTitle>Checkout</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="tea-card-panel">
          {settingsError && <div role="alert"><p>{settingsError}</p><IonButton onClick={() => void loadSettings()}>Retry checkout options</IonButton></div>}
          {!settings && !settingsError && <p>Loading checkout options…</p>}
          {error && <IonText color="danger"><p>{error}</p></IonText>}

          <h3 style={{ margin: "0 0 12px", color: "#1d1b1a" }}>Your Items</h3>
          {checkoutItems.map((item) => (
            <div className="tea-item-row" key={item.product.id}>
              <img src={item.product.image} alt={item.product.name} className="tea-item-thumb" />
              <div className="tea-item-copy">
                <p className="tea-item-name">{item.product.name}</p>
                <p className="tea-item-sub">₱{item.product.price.toFixed(2)} each</p>
                <div className="tea-quantity-control">
                  <IonButton fill="clear" size="small" onClick={() => updateQuantity(item.product.id, item.quantity - 1)} disabled={item.quantity <= 1}>−</IonButton>
                  <span>{item.quantity}</span>
                  <IonButton fill="clear" size="small" onClick={() => updateQuantity(item.product.id, item.quantity + 1)} disabled={item.quantity >= item.product.stockQuantity}>+</IonButton>
                </div>
              </div>
              <span className="tea-amount">₱{(item.product.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          <h3 style={{ margin: "0 0 12px", color: "#1d1b1a" }}>Delivery Address</h3>
          {addresses.length > 0 && <IonItem><IonLabel position="stacked">Use saved address</IonLabel><IonSelect value={selectedAddressId} placeholder="Select an address" onIonChange={(event) => selectAddress(event.detail.value)}><IonSelectOption value="">Enter a new address</IonSelectOption>{addresses.map((address) => <IonSelectOption value={address.address_id} key={address.address_id}>{[address.address_line1, address.address_line2, address.address_line3].filter(Boolean).join(", ")}</IonSelectOption>)}</IonSelect></IonItem>}
          <IonItem>
            <IonLabel position="stacked">Full Name</IonLabel>
            <IonInput value={form.fullName} onIonChange={set("fullName")} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Phone</IonLabel>
            <IonInput type="tel" value={form.phone} onIonChange={set("phone")} />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Street Address</IonLabel>
            <IonInput value={form.street} onIonChange={set("street")} placeholder="123 Mabini St." />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">City / Municipality</IonLabel>
            <IonInput value={form.city} onIonChange={set("city")} placeholder="Quezon City" />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Province</IonLabel>
            <IonInput value={form.province} onIonChange={set("province")} placeholder="Metro Manila" />
          </IonItem>

          <IonItem><IonLabel>Delivery</IonLabel><IonSelect value={shippingMethod} onIonChange={(event) => setShippingMethod(event.detail.value)}>
            {Object.entries(settings?.shipping || {}).filter(([, option]) => option.enabled).map(([key]) => <IonSelectOption value={key} key={key}>{key === "express" ? "Express delivery" : "Standard delivery"}</IonSelectOption>)}
          </IonSelect></IonItem>
          <h3 style={{ margin: "18px 0 12px", color: "#1d1b1a" }}>Payment Method</h3>
          <IonRadioGroup value={form.paymentMethod} onIonChange={set("paymentMethod")}>
            <IonItem>
              <IonLabel>Cash on Delivery</IonLabel>
              <IonRadio slot="end" value="cod" disabled={!settings?.payments.cod} />
            </IonItem>
            <IonItem>
              <IonLabel>GCash</IonLabel>
              <IonRadio slot="end" value="gcash" disabled={!settings?.payments.gcash} />
            </IonItem>
          </IonRadioGroup>
        </div>

        <div className="tea-card-panel" style={{ marginTop: 18 }}>
          <div className="tea-summary-row">
            <span>Subtotal</span><span className="tea-amount">₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="tea-summary-row">
            <span>Delivery Fee</span><span className="tea-amount">₱{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="tea-summary-row total">
            <span>Total</span><span className="tea-amount">₱{total.toFixed(2)}</span>
          </div>
        </div>

        <IonButton expand="block" onClick={handleSubmit} disabled={isLoading || !settings || !shipping?.enabled || !settings.payments[form.paymentMethod] || checkoutItems.length === 0} style={{ marginTop: 18 }}>
          {isLoading ? <TeaLoader /> : "Place Order"}
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default CheckoutPage;
