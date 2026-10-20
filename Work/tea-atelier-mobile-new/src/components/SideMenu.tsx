import React, { useState } from "react";
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
  timeOutline,
} from "ionicons/icons";
import { useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { mediaUrl } from "../config/media";

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
  const { token, user } = useAuth();
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const name = user?.name?.trim() || "Your account";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  const avatar = token ? mediaUrl(user?.avatarUrl) : null;

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
        <div
          className="tea-menu-brand"
          aria-label={token ? "Signed-in profile" : "Tea Atelier"}
        >
          <span className="tea-menu-mark" aria-hidden="true">
            {avatar && avatar !== failedAvatar ? (
              <img
                src={avatar}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setFailedAvatar(avatar)}
              />
            ) : token ? (
              initials
            ) : (
              "TA"
            )}
          </span>
          <div className="tea-menu-profile-details">
            <strong>{token ? name : "Tea Atelier"}</strong>
            {token ? (
              <>
                {user?.email && <IonNote>{user.email}</IonNote>}
                {user?.phone && <IonNote>{user.phone}</IonNote>}
              </>
            ) : (
              <IonNote>Find your daily steep.</IonNote>
            )}
          </div>
        </div>

        {!token && (
          <div className="tea-menu-auth">
            <p>Sign in to save your cart and follow your orders.</p>
            <IonMenuToggle autoHide={false}>
              <IonButton expand="block" routerLink="/login">
                Sign in
              </IonButton>
            </IonMenuToggle>
            <IonMenuToggle autoHide={false}>
              <IonButton expand="block" fill="clear" routerLink="/register">
                Create account
              </IonButton>
            </IonMenuToggle>
          </div>
        )}
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
              routerLink="/company-history"
              className={
                isActive("/company-history")
                  ? "tea-menu-item active"
                  : "tea-menu-item"
              }
            >
              <IonIcon slot="start" icon={timeOutline} />
              <IonLabel>Company History</IonLabel>
            </IonItem>
          </IonMenuToggle>
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

        <p className="tea-menu-footer">Small rituals. Beautiful tea.</p>
      </IonContent>
    </IonMenu>
  );
};

export default SideMenu;
