import React from "react";
import { Navigate, Route, useLocation, useNavigate } from "react-router-dom";
import {
  IonApp,
  IonRouterOutlet,
  IonPage,
  IonContent,
  IonButton,
  IonToast,
  setupIonicReact,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ShopPage from "./pages/ShopPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import OrdersPage from "./pages/OrdersPage";
import AccountPage from "./pages/AccountPage";
import SplashScreen from "./components/SplashScreen";
import SideMenu from "./components/SideMenu";
import GuestAccessPage, {
  type GuestSection,
} from "./components/GuestAccessPage";
import AppNavigation from "./components/AppNavigation";
import AboutPage from "./pages/AboutPage";
import CompanyHistoryPage from "./pages/CompanyHistoryPage";
import DevelopersPage from "./pages/DevelopersPage";
import NotificationsPage from "./pages/NotificationsPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import SettingsPage from "./pages/SettingsPage";
import PaymentReturnListener from "./components/PaymentReturnListener";
import { postLoginPath } from "./config/paymentReturn";
import { checkmarkCircleOutline } from "ionicons/icons";

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css";
import "@ionic/react/css/float-elements.css";
import "@ionic/react/css/text-alignment.css";
import "@ionic/react/css/text-transformation.css";
import "@ionic/react/css/flex-utils.css";
import "@ionic/react/css/display.css";

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
/* import '@ionic/react/css/palettes/dark.system.css'; */

/* Theme variables */
import "./theme/variables.css";
import "./theme/atelier-polish.css";
import "./theme/auth-polish.css";
import "./theme/notifications-session.css";

setupIonicReact();

const ProtectedRoute: React.FC<{
  element: React.ReactNode;
  guestSection?: GuestSection;
}> = ({ element, guestSection }) => {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  // Preserve one IonPage for this route across guest → signed-in transitions.
  if (guestSection)
    return (
      <IonPage className={`tea-${guestSection}-page`}>
        {token ? element : <GuestAccessPage section={guestSection} embedded />}
      </IonPage>
    );
  if (!token) {
    // Ionic keeps earlier pages mounted. Cached protected pages must not
    // redirect over the public shop, a product, or an authentication page.
    if (
      [
        "/",
        "/shop",
        "/cart",
        "/orders",
        "/account",
        "/contact",
        "/settings",
        "/notifications",
        "/login",
        "/register",
        "/about",
        "/company-history",
        "/privacy",
        "/developers",
      ].includes(location.pathname) ||
      location.pathname.startsWith("/product/")
    )
      return null;
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: { pathname: location.pathname } }}
      />
    );
  }

  return <>{element}</>;
};

export const AuthRoute: React.FC<{
  element: React.ReactNode;
  path: string;
}> = ({ element, path }) => {
  const { token, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const destination = postLoginPath();
  React.useEffect(() => {
    if (!isLoading && token && location.pathname === path) {
      navigate(destination, { replace: true });
    }
  }, [isLoading, token, location.pathname, path, destination, navigate]);
  // Keep the IonPage mounted while Ionic transitions away. This route owns
  // post-auth navigation; login/signup handlers only update the session.
  return <>{element}</>;
};

const AppRoutes: React.FC = () => {
  const { sessionError, retrySession, isLoading } = useAuth();
  if (sessionError)
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <p role="alert">{sessionError}</p>
          <IonButton onClick={() => void retrySession()} disabled={isLoading}>
            Try again
          </IonButton>
        </IonContent>
      </IonPage>
    );
  if (isLoading) return null;
  return (
    <IonRouterOutlet>
      <Route
        path="/login"
        element={<AuthRoute path="/login" element={<LoginPage />} />}
      />
      <Route
        path="/register"
        element={<AuthRoute path="/register" element={<RegisterPage />} />}
      />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/company-history" element={<CompanyHistoryPage />} />
      <Route path="/developers" element={<DevelopersPage />} />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute
            guestSection="notifications"
            element={<NotificationsPage embedded />}
          />
        }
      />
      <Route
        path="/contact"
        element={
          <ProtectedRoute
            guestSection="contact"
            element={<ContactPage embedded />}
          />
        }
      />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute
            guestSection="settings"
            element={<SettingsPage embedded />}
          />
        }
      />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route
        path="/cart"
        element={
          <ProtectedRoute guestSection="cart" element={<CartPage embedded />} />
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute
            guestSection="orders"
            element={<OrdersPage embedded />}
          />
        }
      />
      <Route
        path="/orders/:orderId"
        element={<ProtectedRoute element={<OrderDetailPage />} />}
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute
            guestSection="account"
            element={<AccountPage embedded />}
          />
        }
      />
      <Route
        path="/checkout"
        element={<ProtectedRoute element={<CheckoutPage />} />}
      />
      <Route
        path="/order-confirmation/:orderId"
        element={<ProtectedRoute element={<OrderConfirmationPage />} />}
      />
      <Route path="/" element={<Navigate to="/shop" replace />} />
    </IonRouterOutlet>
  );
};

const AppShell: React.FC = () => {
  const { isLoading, sessionError, token, welcomeMessage, clearWelcome } =
    useAuth();
  const { pathname } = useLocation();
  const showNavigation =
    !isLoading &&
    !sessionError &&
    pathname !== "/" &&
    pathname !== "/login" &&
    pathname !== "/register" &&
    pathname !== "/checkout" &&
    !pathname.startsWith("/order-confirmation/");
  return (
    <>
      <SideMenu />
      <IonToast
        className="tea-auth-toast"
        isOpen={!!token && pathname === "/shop" && !!welcomeMessage}
        message={welcomeMessage}
        icon={checkmarkCircleOutline}
        duration={2600}
        position="top"
        buttons={[{ text: "Dismiss", role: "cancel" }]}
        onDidDismiss={clearWelcome}
      />
      <div
        id="main-content"
        className={`ion-page ${showNavigation ? "tea-has-dock" : ""}`}
      >
        <AppRoutes />
        {showNavigation && <AppNavigation />}
      </div>
    </>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <IonApp>
      {showSplash && <SplashScreen />}
      <AuthProvider>
        <IonReactRouter>
          <PaymentReturnListener />
          <NotificationsProvider>
            <CartProvider>
              <AppShell />
            </CartProvider>
          </NotificationsProvider>
        </IonReactRouter>
      </AuthProvider>
    </IonApp>
  );
};

export default App;
