import React from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList,
  IonItem, IonLabel, IonButton, IonText, IonThumbnail, IonButtons,
  IonBackButton, IonSpinner, IonCheckbox, IonIcon,
} from "@ionic/react";
import { removeCircleOutline } from "ionicons/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import MobileTabBar from "../components/MobileTabBar";

const CartPage: React.FC = () => {
  const { items, isLoading, clearCart, updateQuantity, removeFromCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => items.some((item) => item.product.id === id)));
  }, [items]);

  const selectedItems = items.filter((item) => selectedIds.includes(item.product.id));
  const total = selectedItems.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  if (!token) return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/shop" /></IonButtons>
          <IonTitle>Cart</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding ion-text-center">
        <IonText><p>Please sign in to view your cart.</p></IonText>
        <IonButton routerLink="/login">Sign In</IonButton>
      </IonContent>
      <MobileTabBar />
    </IonPage>
  );

  return (
    <IonPage className="tea-cart-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/shop" /></IonButtons>
          <IonTitle>Your Cart</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="tea-card-panel">
          {isLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
              <IonSpinner name="crescent" />
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="ion-text-center">
              <IonText><p>Your cart is empty.</p></IonText>
              <IonButton routerLink="/shop">Continue Shopping</IonButton>
            </div>
          )}

          {items.length > 0 && (
            <div className="tea-cart-select-all">
              <IonCheckbox checked={allSelected} onIonChange={(event) => setSelectedIds(event.detail.checked ? items.map((item) => item.product.id) : [])} />
              <span>Select all items</span>
            </div>
          )}
          {items.map((item) => (
            <div className="tea-item-row" key={item.product.id}>
              <IonCheckbox checked={selectedIds.includes(item.product.id)} onIonChange={(event) => setSelectedIds((current) => event.detail.checked ? [...current, item.product.id] : current.filter((id) => id !== item.product.id))} />
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
              <IonButton fill="clear" color="danger" aria-label={`Remove ${item.product.name}`} onClick={() => removeFromCart(item.product.id)}><IonIcon icon={removeCircleOutline} /></IonButton>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="tea-card-panel" style={{ marginTop: 18 }}>
            <div className="tea-summary-box">
              <div className="tea-summary-row">
                <span>Subtotal</span>
                <span className="tea-amount">₱{total.toFixed(2)}</span>
              </div>
              <div className="tea-summary-row total">
                <span>Total</span>
                <span className="tea-amount">₱{total.toFixed(2)}</span>
              </div>
            </div>
            <IonButton expand="block" onClick={() => navigate("/checkout", { state: { selectedProductIds: selectedIds } })} disabled={selectedItems.length === 0} style={{ marginTop: 16 }}>
              Proceed to Checkout
            </IonButton>
            <IonButton expand="block" fill="outline" color="danger" onClick={clearCart} style={{ marginTop: 8 }}>
              Clear Cart
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default CartPage;
