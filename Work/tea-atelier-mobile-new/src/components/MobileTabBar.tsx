import React from "react";
import { IonBadge, IonIcon, IonLabel, IonTabBar, IonTabButton } from "@ionic/react";
import { bagHandleOutline, cartOutline, personOutline, receiptOutline } from "ionicons/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const MobileTabBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { itemCount } = useCart();

  const isShopActive = location.pathname === "/shop" || location.pathname.startsWith("/product/");
  const isOrdersActive = location.pathname.startsWith("/orders");
  const isCartActive = location.pathname.startsWith("/cart");
  const isAccountActive = location.pathname.startsWith("/account");

  return (
    <IonTabBar slot="bottom" className="tea-tab-bar">
      <IonTabButton tab="shop" onClick={() => navigate("/shop")} selected={isShopActive}>
        <IonIcon icon={bagHandleOutline} />
        <IonLabel>Shop</IonLabel>
      </IonTabButton>
      <IonTabButton tab="orders" onClick={() => navigate("/orders")} selected={isOrdersActive}>
        <IonIcon icon={receiptOutline} />
        <IonLabel>Orders</IonLabel>
      </IonTabButton>
      <IonTabButton tab="cart" onClick={() => navigate("/cart")} selected={isCartActive}>
        <IonIcon icon={cartOutline} />
        <IonLabel>Cart</IonLabel>
        {itemCount > 0 && <IonBadge color="danger">{itemCount}</IonBadge>}
      </IonTabButton>
      <IonTabButton tab="account" onClick={() => navigate("/account")} selected={isAccountActive}>
        <IonIcon icon={personOutline} />
        <IonLabel>Account</IonLabel>
      </IonTabButton>
    </IonTabBar>
  );
};

export default MobileTabBar;
