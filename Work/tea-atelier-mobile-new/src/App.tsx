import React from 'react';
import { Navigate, Route, useLocation } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ShopPage from './pages/ShopPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrdersPage from './pages/OrdersPage';
import AccountPage from './pages/AccountPage';
import Home from './pages/Home';
import SplashScreen from './components/SplashScreen';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

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
import './theme/variables.css';

setupIonicReact();

const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{element}</>;
};

const AuthRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (token) {
    return <Navigate to="/shop" replace />;
  }

  return <>{element}</>;
};

const AppRoutes: React.FC = () => (
  <IonRouterOutlet>
    <Route path="/login" element={<AuthRoute element={<LoginPage />} />} />
    <Route path="/register" element={<AuthRoute element={<RegisterPage />} />} />
    <Route path="/shop" element={<ProtectedRoute element={<ShopPage />} />} />
    <Route path="/product/:id" element={<ProtectedRoute element={<ProductDetailPage />} />} />
    <Route path="/cart" element={<ProtectedRoute element={<CartPage />} />} />
    <Route path="/orders" element={<ProtectedRoute element={<OrdersPage />} />} />
    <Route path="/orders/:orderId" element={<ProtectedRoute element={<OrderDetailPage />} />} />
    <Route path="/account" element={<ProtectedRoute element={<AccountPage />} />} />
    <Route path="/checkout" element={<ProtectedRoute element={<CheckoutPage />} />} />
    <Route path="/order-confirmation/:orderId" element={<ProtectedRoute element={<OrderConfirmationPage />} />} />
    <Route path="/" element={<Home />} />
  </IonRouterOutlet>
);

const App: React.FC = () => {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <IonApp>
      {showSplash && <SplashScreen />}
      <AuthProvider>
        <IonReactRouter>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </IonReactRouter>
      </AuthProvider>
    </IonApp>
  );
};

export default App;
