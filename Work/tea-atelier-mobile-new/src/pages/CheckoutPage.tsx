import PageIntro from "../components/PageIntro";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonText,
  IonRadioGroup,
  IonRadio,
  IonButtons,
  IonMenuButton,
  IonSelect,
  IonSelectOption,
  IonModal,
  IonFooter,
  IonIcon,
} from "@ionic/react";
import { useLocation, useNavigate } from "react-router-dom";
import { placeOrder } from "../config/checkout";
import { fetchApi, ensureOk, requestError } from "../config/request";
import { API_URL } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import TeaLoader from "../components/TeaLoader";
import {
  locationOutline,
  addOutline,
  closeOutline,
  checkmarkOutline,
  chevronDownOutline,
  timeOutline,
} from "ionicons/icons";
import "../theme/profile-checkout.css";

const deliveryDetails: Record<string, { label: string; estimate: string }> = {
  standard: { label: "Standard delivery", estimate: "3–5 business days" },
  express: { label: "Express delivery", estimate: "1–2 business days" },
};

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user } = useAuth();
  const { items, refresh, updateQuantity } = useCart();
  const selectedProductIds = (
    location.state as { selectedProductIds?: string[] } | null
  )?.selectedProductIds;
  const checkoutItems = selectedProductIds?.length
    ? items.filter((item) => selectedProductIds.includes(item.product.id))
    : items;
  const [form, setForm] = useState({
    fullName: user?.name ?? "",
    phone: user?.phone ?? "",
    street: "",
    city: "",
    province: "",
    paymentMethod: "cod",
  });
  const previousContact = useRef({
    fullName: user?.name ?? "",
    phone: user?.phone ?? "",
  });
  useEffect(() => {
    const previous = previousContact.current;
    const next = { fullName: user?.name ?? "", phone: user?.phone ?? "" };
    setForm((current) => ({
      ...current,
      fullName:
        current.fullName === previous.fullName
          ? next.fullName
          : current.fullName,
      phone: current.phone === previous.phone ? next.phone : current.phone,
    }));
    previousContact.current = next;
  }, [user?.name, user?.phone]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [addresses, setAddresses] = useState<
    {
      address_id: number | string;
      address_line1: string;
      address_line2: string | null;
      address_line3: string | null;
      default_address?: boolean;
      address_label?: string | null;
    }[]
  >([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressPickerOpen, setAddressPickerOpen] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressesError, setAddressesError] = useState("");
  const addressChoiceMade = useRef(false);
  const [settings, setSettings] = useState<{
    shipping: Record<string, { enabled: boolean; feeCents: number }>;
    freeShippingThresholdCents: number | null;
    payments: Record<string, boolean>;
  } | null>(null);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [settingsError, setSettingsError] = useState("");
  const loadSettings = useCallback(async () => {
    setSettingsError("");
    try {
      const response = await fetchApi(`${API_URL}/api/settings`);
      await ensureOk(response, "Unable to load checkout options.");
      const { config } = await response.json();
      if (!config?.shipping || !config?.payments)
        throw new Error("Checkout options are unavailable.");
      setSettings(config);
      setShippingMethod((current) =>
        config.shipping[current]?.enabled
          ? current
          : Object.keys(config.shipping).find(
              (key) => config.shipping[key].enabled,
            ) || "",
      );
      setForm((current) => ({
        ...current,
        paymentMethod: config.payments[current.paymentMethod]
          ? current.paymentMethod
          : ["cod", "gcash"].find((key) => config.payments[key]) || "",
      }));
    } catch (error) {
      setSettingsError(requestError(error, "Unable to load checkout options."));
    }
  }, []);
  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    setAddressesError("");
    try {
      if (!token) return;
      const response = await fetchApi(`${API_URL}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await ensureOk(response, "Unable to load saved addresses.");
      const savedAddresses = (await response.json()).addresses;
      if (
        !Array.isArray(savedAddresses) ||
        savedAddresses.some(
          (address) =>
            !address ||
            !Number.isSafeInteger(Number(address.address_id)) ||
            Number(address.address_id) <= 0 ||
            typeof address.address_line1 !== "string",
        )
      ) {
        throw new Error("Unable to load saved addresses.");
      }
      setAddresses(savedAddresses);
      const preferred =
        savedAddresses.find(
          (address: { default_address?: boolean }) => address.default_address,
        ) || savedAddresses[0];
      if (preferred && !addressChoiceMade.current)
        setSelectedAddressId(String(preferred.address_id));
    } catch (error) {
      setAddressesError(requestError(error, "Unable to load saved addresses."));
    } finally {
      setAddressesLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const chooseAddress = (value: string) => {
    addressChoiceMade.current = true;
    setSelectedAddressId(value);
    setAddressPickerOpen(false);
    setError("");
  };

  const selectedAddress = addresses.find(
    (address) => String(address.address_id) === selectedAddressId,
  );

  const set = (field: string) => (e: CustomEvent) => {
    if (["street", "city", "province"].includes(field))
      addressChoiceMade.current = true;
    setForm((prev) => ({ ...prev, [field]: e.detail.value! }));
  };

  const subtotal = checkoutItems.reduce(
    (sum, i) => sum + i.product.price * i.quantity,
    0,
  );
  const shipping = settings?.shipping[shippingMethod];
  const deliveryFee =
    settings?.freeShippingThresholdCents != null &&
    subtotal * 100 >= settings.freeShippingThresholdCents
      ? 0
      : (shipping?.feeCents ?? 0) / 100;
  const total = subtotal + deliveryFee;

  const handleSubmit = async () => {
    setError("");
    if (
      !selectedAddressId &&
      (!form.street.trim() || !form.city.trim() || !form.province.trim())
    ) {
      setError("All address fields are required.");
      return;
    }
    setIsLoading(true);
    try {
      if (
        !token ||
        !user ||
        !shipping?.enabled ||
        !settings?.payments[form.paymentMethod]
      ) {
        throw new Error("Select an available delivery and payment method.");
      }
      if (
        selectedAddressId &&
        (!selectedAddress ||
          !Number.isSafeInteger(Number(selectedAddressId)) ||
          Number(selectedAddressId) <= 0)
      ) {
        throw new Error("Choose a valid saved address or enter a new address.");
      }
      const data = await placeOrder(token, user.email, {
        ...(selectedAddressId
          ? { savedAddressId: Number(selectedAddressId) }
          : {
              street: form.street.trim(),
              city: form.city.trim(),
              province: form.province.trim(),
            }),
        shippingMethod,
        paymentMethod: form.paymentMethod,
        phone: form.phone,
        fullName: form.fullName,
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

  if (!token)
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <IonText>
            <p>Please sign in to checkout.</p>
          </IonText>
          <IonButton routerLink="/login">Sign In</IonButton>
        </IonContent>
      </IonPage>
    );

  return (
    <IonPage className="tea-checkout-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>Checkout</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <PageIntro
          eyebrow="The final details"
          title="Almost tea time."
          description="Choose where your selection is going and how you’d like to pay."
        />
        <div className="tea-checkout-progress" aria-label="Checkout steps">
          <span>01 · Delivery</span>
          <i />
          <span>02 · Payment</span>
          <i />
          <span>03 · Confirm</span>
        </div>
        <div className="tea-card-panel">
          {settingsError && (
            <div role="alert">
              <p>{settingsError}</p>
              <IonButton onClick={() => void loadSettings()}>
                Retry checkout options
              </IonButton>
            </div>
          )}
          {!settings && !settingsError && <p>Loading checkout options…</p>}
          {error && (
            <IonText color="danger">
              <p>{error}</p>
            </IonText>
          )}

          <h3 style={{ margin: "0 0 12px", color: "#1d1b1a" }}>Your Items</h3>
          {checkoutItems.map((item) => (
            <div className="tea-item-row" key={item.product.id}>
              <img
                src={item.product.image}
                alt={item.product.name}
                className="tea-item-thumb"
              />
              <div className="tea-item-copy">
                <p className="tea-item-name">{item.product.name}</p>
                <p className="tea-item-sub">
                  ₱{item.product.price.toFixed(2)} each
                </p>
                <div className="tea-quantity-control">
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                    disabled={item.quantity <= 1}
                  >
                    −
                  </IonButton>
                  <span>{item.quantity}</span>
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity + 1)
                    }
                    disabled={item.quantity >= item.product.stockQuantity}
                  >
                    +
                  </IonButton>
                </div>
              </div>
              <span className="tea-amount">
                ₱{(item.product.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}

          <section
            className="tea-checkout-delivery"
            aria-labelledby="checkout-delivery-heading"
          >
            <div className="tea-checkout-section-heading">
              <h3 id="checkout-delivery-heading">Delivery address</h3>
              {addresses.length > 0 && (
                <span>
                  {addresses.length} saved{" "}
                  {addresses.length === 1 ? "address" : "addresses"}
                </span>
              )}
            </div>
            {addressesError && (
              <div className="tea-checkout-address-error" role="alert">
                <p>{addressesError}</p>
                <IonButton
                  fill="clear"
                  className="tea-action-button"
                  onClick={() => void loadAddresses()}
                >
                  Retry saved addresses
                </IonButton>
              </div>
            )}
            {addressesLoading ? (
              <p role="status">Loading saved addresses…</p>
            ) : selectedAddress ? (
              <div className="tea-address-preview">
                <div className="tea-address-card-main">
                  <span className="tea-address-symbol">
                    <IonIcon icon={locationOutline} aria-hidden="true" />
                  </span>
                  <div className="tea-address-card-copy">
                    <p className="tea-info-eyebrow">
                      {selectedAddress.address_label || "Saved address"}
                    </p>
                    <strong>{selectedAddress.address_line1}</strong>
                    <p>
                      {[
                        selectedAddress.address_line2,
                        selectedAddress.address_line3,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {selectedAddress.default_address && (
                      <span className="tea-address-default">
                        Default delivery address
                      </span>
                    )}
                  </div>
                </div>
                <div className="tea-address-card-actions">
                  <IonButton
                    fill="clear"
                    className="tea-action-button"
                    onClick={() => setAddressPickerOpen(true)}
                    aria-label="Change saved address"
                  >
                    Change address
                    <IonIcon
                      icon={chevronDownOutline}
                      slot="end"
                      aria-hidden="true"
                    />
                  </IonButton>
                  <IonButton
                    fill="clear"
                    className="tea-action-button"
                    onClick={() => chooseAddress("")}
                  >
                    Enter a new address
                  </IonButton>
                </div>
              </div>
            ) : (
              addresses.length > 0 && (
                <IonButton
                  fill="clear"
                  className="tea-action-button tea-choose-saved-address"
                  onClick={() => setAddressPickerOpen(true)}
                >
                  <IonIcon
                    icon={locationOutline}
                    slot="start"
                    aria-hidden="true"
                  />
                  Choose a saved address
                </IonButton>
              )
            )}
            <div className="tea-recipient-fields">
              <div className="tea-field">
                <IonInput
                  label="Full Name"
                  labelPlacement="stacked"
                  value={form.fullName}
                  autocomplete="name"
                  onIonInput={set("fullName")}
                  disabled={isLoading}
                />
              </div>
              <div className="tea-field">
                <IonInput
                  label="Phone"
                  labelPlacement="stacked"
                  type="tel"
                  value={form.phone}
                  autocomplete="tel"
                  onIonInput={set("phone")}
                  disabled={isLoading}
                  placeholder="Mobile number"
                />
              </div>
            </div>
            {!addressesLoading && !selectedAddress && (
              <div className="tea-new-address-fields">
                <p className="tea-checkout-field-caption">
                  Where should we deliver your tea?
                </p>
                <div className="tea-field">
                  <IonInput
                    label="Street Address"
                    labelPlacement="stacked"
                    value={form.street}
                    onIonInput={set("street")}
                    autocomplete="street-address"
                    placeholder="123 Mabini St."
                    disabled={isLoading}
                  />
                </div>
                <div className="tea-field">
                  <IonInput
                    label="City / Municipality"
                    labelPlacement="stacked"
                    value={form.city}
                    onIonInput={set("city")}
                    autocomplete="address-level2"
                    placeholder="Quezon City"
                    disabled={isLoading}
                  />
                </div>
                <div className="tea-field">
                  <IonInput
                    label="Province"
                    labelPlacement="stacked"
                    value={form.province}
                    onIonInput={set("province")}
                    autocomplete="address-level1"
                    placeholder="Metro Manila"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}
          </section>

          <div className="tea-checkout-shipping">
            <IonSelect
              label="Delivery option"
              labelPlacement="stacked"
              aria-label="Delivery option"
              interface="action-sheet"
              interfaceOptions={{
                cssClass: "tea-checkout-delivery-sheet",
                header: "Delivery option",
              }}
              selectedText={
                deliveryDetails[shippingMethod]?.label || shippingMethod
              }
              value={shippingMethod}
              onIonChange={(event) => setShippingMethod(event.detail.value)}
            >
              {Object.entries(settings?.shipping || {})
                .filter(([, option]) => option.enabled)
                .map(([key]) => (
                  <IonSelectOption value={key} key={key}>
                    {deliveryDetails[key]
                      ? `${deliveryDetails[key].label} · ${deliveryDetails[key].estimate}`
                      : key}
                  </IonSelectOption>
                ))}
            </IonSelect>
            {deliveryDetails[shippingMethod] && (
              <p className="tea-delivery-estimate" aria-live="polite">
                <IonIcon icon={timeOutline} aria-hidden="true" />
                <span>
                  Estimated delivery:{" "}
                  <strong>{deliveryDetails[shippingMethod].estimate}</strong>
                </span>
              </p>
            )}
          </div>
          <h3 style={{ margin: "18px 0 12px", color: "#1d1b1a" }}>
            Payment Method
          </h3>
          <IonRadioGroup
            value={form.paymentMethod}
            onIonChange={set("paymentMethod")}
          >
            <IonItem>
              <IonLabel>Cash on Delivery</IonLabel>
              <IonRadio
                slot="end"
                value="cod"
                disabled={!settings?.payments.cod}
              />
            </IonItem>
            <IonItem>
              <IonLabel>GCash</IonLabel>
              <IonRadio
                slot="end"
                value="gcash"
                disabled={!settings?.payments.gcash}
              />
            </IonItem>
          </IonRadioGroup>
        </div>

        <div className="tea-card-panel" style={{ marginTop: 18 }}>
          <div className="tea-summary-row">
            <span>Subtotal</span>
            <span className="tea-amount">₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="tea-summary-row">
            <span>Delivery Fee</span>
            <span className="tea-amount">₱{deliveryFee.toFixed(2)}</span>
          </div>
          <div className="tea-summary-row total">
            <span>Total</span>
            <span className="tea-amount">₱{total.toFixed(2)}</span>
          </div>
        </div>

        <IonButton
          expand="block"
          onClick={handleSubmit}
          disabled={
            isLoading ||
            addressesLoading ||
            !settings ||
            !shipping?.enabled ||
            !settings.payments[form.paymentMethod] ||
            checkoutItems.length === 0
          }
          style={{ marginTop: 18 }}
        >
          {isLoading ? <TeaLoader /> : "Place Order"}
        </IonButton>
      </IonContent>
      <IonModal
        isOpen={addressPickerOpen}
        onDidDismiss={() => setAddressPickerOpen(false)}
        className="tea-address-sheet"
        initialBreakpoint={1}
        breakpoints={[0, 1]}
        handle={true}
        aria-label="Choose delivery address"
      >
        <IonHeader className="ion-no-border">
          <div className="tea-address-sheet-heading">
            <div>
              <p className="tea-info-eyebrow">Your saved places</p>
              <h2>Choose an address.</h2>
              <p>Select where your tea is going.</p>
            </div>
            <IonButton
              fill="clear"
              aria-label="Close address picker"
              onClick={() => setAddressPickerOpen(false)}
            >
              <IonIcon icon={closeOutline} aria-hidden="true" />
            </IonButton>
          </div>
        </IonHeader>
        <IonContent>
          <div className="tea-address-sheet-list">
            {addresses.map((address) => (
              <button
                type="button"
                key={address.address_id}
                className={`tea-address-option ${String(address.address_id) === selectedAddressId ? "selected" : ""}`}
                aria-pressed={String(address.address_id) === selectedAddressId}
                onClick={() => chooseAddress(String(address.address_id))}
              >
                <span className="tea-address-symbol">
                  <IonIcon icon={locationOutline} aria-hidden="true" />
                </span>
                <span className="tea-address-option-copy">
                  {address.address_label && (
                    <span className="tea-info-eyebrow">
                      {address.address_label}
                    </span>
                  )}
                  <strong>{address.address_line1}</strong>
                  <span>
                    {[address.address_line2, address.address_line3]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  {address.default_address && (
                    <span className="tea-address-default">
                      Default delivery address
                    </span>
                  )}
                </span>
                {String(address.address_id) === selectedAddressId && (
                  <IonIcon
                    icon={checkmarkOutline}
                    className="tea-address-selected-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </IonContent>
        <IonFooter className="ion-no-border">
          <div className="tea-address-sheet-footer">
            <IonButton
              expand="block"
              fill="outline"
              onClick={() => chooseAddress("")}
            >
              <IonIcon icon={addOutline} slot="start" aria-hidden="true" />
              Enter a new address
            </IonButton>
          </div>
        </IonFooter>
      </IonModal>
    </IonPage>
  );
};

export default CheckoutPage;
