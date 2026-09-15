import React, { useState, useEffect } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton,
  IonSpinner, IonText, IonBackButton, IonButtons, IonToast,
} from "@ionic/react";
import { useParams } from "react-router-dom";
import { API_URL } from "../config/api";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

type Product = {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: number;
  availability: string;
  stockQuantity: number;
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { token } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_URL}/api/products/${id}`);
      const data = await res.json();
      if (res.ok) setProduct(data.product);
      setIsLoading(false);
    })();
  }, [id]);

  const handleAddToCart = async () => {
    if (!token) { setToastMsg("Please sign in to add items to cart."); setShowToast(true); return; }
    if (!product) return;
    setAdding(true);
    try {
      await addToCart(product.id);
      setToastMsg(`${product.name} added to cart!`);
      setShowToast(true);
    } catch {
      setToastMsg("Could not add to cart.");
      setShowToast(true);
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) return (
    <IonPage>
      <IonContent className="ion-padding ion-text-center">
        <IonSpinner name="crescent" />
      </IonContent>
    </IonPage>
  );

  if (!product) return (
    <IonPage>
      <IonContent className="ion-padding">
        <IonText color="danger"><p>Product not found.</p></IonText>
      </IonContent>
    </IonPage>
  );

  return (
    <IonPage className="tea-detail-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/shop" />
          </IonButtons>
          <IonTitle>{product.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <img src={product.image} alt={product.name} style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }} />
        <div className="ion-padding">
          <div className="tea-card-panel" style={{ marginTop: 16 }}>
            <h2 style={{ margin: "0 0 8px", color: "#1d1b1a" }}>{product.name}</h2>
            <p style={{ color: "#6d6a64", fontSize: 13, margin: "0 0 12px" }}>{product.category}</p>
            <h3 style={{ color: "#5d7b5e", margin: "0 0 10px" }}>₱{product.price.toFixed(2)}</h3>
            <p style={{ color: product.availability === "In Stock" ? "#4a8f60" : "#d85b5b", fontWeight: "700", margin: "0 0 12px" }}>
              {product.availability}
            </p>
            <p style={{ lineHeight: 1.6, color: "#36352f", margin: 0 }}>{product.description}</p>
          </div>

          <IonButton
            expand="block"
            disabled={product.availability !== "In Stock" || adding}
            onClick={handleAddToCart}
            style={{ marginTop: 18 }}
          >
            {adding ? <IonSpinner name="crescent" /> : "Add to Cart"}
          </IonButton>
        </div>

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMsg}
          duration={2000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default ProductDetailPage;
