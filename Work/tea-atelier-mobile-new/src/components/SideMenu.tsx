import React from "react";
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonNote,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import {
  bagHandleOutline,
  cartOutline,
  informationCircleOutline,
  personOutline,
  receiptOutline,
  peopleOutline,
} from "ionicons/icons";
import { useLocation } from "react-router-dom";

const modules = [
  { label: "Shop", href: "/shop", icon: bagHandleOutline },
  { label: "Orders", href: "/orders", icon: receiptOutline },
  { label: "Cart", href: "/cart", icon: cartOutline },
  { label: "Account", href: "/account", icon: personOutline },
];

const SideMenu: React.FC = () => {
  const location = useLocation();

  const isActive = (href: string) =>
    href === "/shop"
      ? location.pathname === "/shop" || location.pathname.startsWith("/product/")
      : location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <IonMenu contentId="main-content" menuId="tea-navigation" type="overlay" className="tea-side-menu">
      <IonToolbar>
        <IonTitle>Tea Atelier</IonTitle>
      </IonToolbar>
      <IonContent>
        <div className="tea-menu-brand">
          <span className="tea-menu-mark">TA</span>
          <div>
            <strong>Tea Atelier</strong>
            <IonNote>Small rituals. Better days.</IonNote>
          </div>
        </div>

        <IonList inset className="tea-menu-list">
          <IonNote className="tea-menu-section-label">Modules</IonNote>
          {modules.map((module) => (
            <IonMenuToggle key={module.href} autoHide={false}>
              <IonItem button detail={false} routerLink={module.href} className={isActive(module.href) ? "tea-menu-item active" : "tea-menu-item"}>
                <IonIcon slot="start" icon={module.icon} />
                <IonLabel>{module.label}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
        </IonList>

        <IonList inset className="tea-menu-list tea-menu-secondary-list">
          <IonNote className="tea-menu-section-label">More</IonNote>
          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} routerLink="/about" className={isActive("/about") ? "tea-menu-item active" : "tea-menu-item"}>
              <IonIcon slot="start" icon={informationCircleOutline} />
              <IonLabel>About the App</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem button detail={false} routerLink="/developers" className={isActive("/developers") ? "tea-menu-item active" : "tea-menu-item"}>
              <IonIcon slot="start" icon={peopleOutline} />
              <IonLabel>Developers</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>

        <p className="tea-menu-footer">Tea Atelier · Since 2026</p>
      </IonContent>
    </IonMenu>
  );
};

export default SideMenu;
