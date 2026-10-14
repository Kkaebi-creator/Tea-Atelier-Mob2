import React from "react";
import { Link, useLocation } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  leafOutline,
  receiptOutline,
  bagHandleOutline,
  personOutline,
} from "ionicons/icons";
import { useCart } from "../context/CartContext";
const destinations = [
  { path: "/shop", label: "Shop", icon: leafOutline },
  { path: "/orders", label: "Orders", icon: receiptOutline },
  { path: "/cart", label: "Cart", icon: bagHandleOutline },
  { path: "/account", label: "Account", icon: personOutline },
];
export default function AppNavigation() {
  const { pathname } = useLocation();
  const { itemCount } = useCart();
  const active = pathname.startsWith("/product/")
    ? "/shop"
    : [
          "/contact",
          "/settings",
          "/notifications",
          "/about",
          "/privacy",
          "/developers",
        ].includes(pathname)
      ? "/account"
      : "/" + pathname.split("/")[1];
  return (
    <nav className="tea-bottom-nav" aria-label="Main navigation">
      {destinations.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          aria-label={item.label}
          aria-current={active === item.path ? "page" : undefined}
          className={`tea-nav-item ${active === item.path ? "selected" : ""}`}
        >
          <span className="tea-nav-icon">
            <IonIcon icon={item.icon} aria-hidden="true" />
            {item.path === "/cart" && itemCount > 0 && (
              <span
                className="tea-nav-badge"
                aria-label={`${itemCount} cart items`}
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
