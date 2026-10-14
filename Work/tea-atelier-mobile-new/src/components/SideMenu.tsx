import React from "react";
import {
  IonButton,
  IonButtons,
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
  closeOutline,
  bagHandleOutline,
  cartOutline,
  informationCircleOutline,
  mailOutline,
  notificationsOutline,
  lockClosedOutline,
  shieldCheckmarkOutline,
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
  {
    label: "Notifications",
    href: "/notifications",
    icon: notificationsOutline,
  },
];

const SideMenu: React.FC = () => {
  const location = useLocation();

  const isActive = (href: string) =>
    href === "/shop"
      ? location.pathname === "/shop" ||
        location.pathname.startsWith("/product/")
      : location.pathname === href || location.pathname.startsWith(`${href}/`);

  return (
    <IonMenu
      contentId="main-content"
      menuId="tea-navigation"
      type="overlay"
      className="tea-side-menu"
    >
      <IonToolbar>
        <IonTitle>Explore the atelier</IonTitle>
        <IonButtons slot="end">
          <IonMenuToggle menu="tea-navigation" autoHide={false}>
            <IonButton fill="clear" aria-label="Close navigation menu">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonMenuToggle>
        </IonButtons>
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
          <IonNote className="tea-menu-section-label">Your atelier</IonNote>
          {modules.map((module) => (
            <IonMenuToggle key={module.href} autoHide={false}>
              <IonItem
                button
                detail={false}
                routerLink={module.href}
                className={
                  isActive(module.href)
                    ? "tea-menu-item active"
                    : "tea-menu-item"
                }
              >
                <IonIcon slot="start" icon={module.icon} />
                <IonLabel>{module.label}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
        </IonList>

        <IonList inset className="tea-menu-list tea-menu-secondary-list">
          <IonNote className="tea-menu-section-label">Discover</IonNote>
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              detail={false}
              routerLink="/about"
              className={
                isActive("/about") ? "tea-menu-item active" : "tea-menu-item"
              }
            >
              <IonIcon slot="start" icon={informationCircleOutline} />
              <IonLabel>About the App</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              detail={false}
              routerLink="/contact"
              className={
                isActive("/contact") ? "tea-menu-item active" : "tea-menu-item"
              }
            >
              <IonIcon slot="start" icon={mailOutline} />
              <IonLabel>Contact Us</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              detail={false}
              routerLink="/settings"
              className={
                isActive("/settings") ? "tea-menu-item active" : "tea-menu-item"
              }
            >
              <IonIcon slot="start" icon={lockClosedOutline} />
              <IonLabel>Settings</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              detail={false}
              routerLink="/privacy"
              className={
                isActive("/privacy") ? "tea-menu-item active" : "tea-menu-item"
              }
            >
              <IonIcon slot="start" icon={shieldCheckmarkOutline} />
              <IonLabel>Privacy Policy</IonLabel>
            </IonItem>
          </IonMenuToggle>
          <IonMenuToggle autoHide={false}>
            <IonItem
              button
              detail={false}
              routerLink="/developers"
              className={
                isActive("/developers")
                  ? "tea-menu-item active"
                  : "tea-menu-item"
              }
            >
              <IonIcon slot="start" icon={peopleOutline} />
              <IonLabel>The team</IonLabel>
            </IonItem>
          </IonMenuToggle>
        </IonList>

        <p className="tea-menu-footer">Tea Atelier · Since 2026</p>
      </IonContent>
    </IonMenu>
  );
};

export default SideMenu;
