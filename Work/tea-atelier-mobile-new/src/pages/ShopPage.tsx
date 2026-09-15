import React, { useState, useEffect } from "react";
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar,
  IonGrid, IonRow, IonCol, IonCard, IonButton, IonText, IonBadge, IonButtons,
  IonIcon,
  IonSelect, IonSelectOption,
} from "@ionic/react";
import { cartOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import { useCart } from "../context/CartContext";
import MobileTabBar from "../components/MobileTabBar";

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

type SortOption = "newest" | "price-low" | "price-high";

const ShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProducts = async () => {
    setIsLoading(true);
    setError("");
      try {
        const res = await fetch(`${API_URL}/api/products`);
        const data = await res.json();
        if (res.ok) setProducts(data.products);
        else setError("Failed to load products.");
      } catch {
        setError("Network error.");
      } finally {
        setIsLoading(false);
      }
  };

  useEffect(() => { loadProducts(); }, []);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const sortedProducts = [...filtered].sort((first, second) => {
    if (sortBy === "price-low") return first.price - second.price;
    if (sortBy === "price-high") return second.price - first.price;
    return 0;
  });

  return (
    <IonPage className="tea-shop-page">
      <IonHeader className="shop-header">
        <IonToolbar>
          <IonTitle>Tea Atelier</IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/cart" style={{ position: "relative" }}>
              <IonIcon icon={cartOutline} />
              {itemCount > 0 && (
                <IonBadge color="danger" style={{ position: "absolute", top: 4, right: 4, fontSize: 10 }}>
                  {itemCount}
                </IonBadge>
              )}
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={search}
            onIonInput={(e) => setSearch(e.detail.value!)}
            placeholder="Search products..."
          />
        </IonToolbar>
        <IonToolbar className="tea-sort-toolbar">
          <div className="tea-sort-control">
            <span className="tea-sort-label">Sort by</span>
            <IonSelect
              aria-label="Sort products"
              interface="popover"
              value={sortBy}
              onIonChange={(event) => setSortBy(event.detail.value as SortOption)}
              className="tea-sort-select"
            >
              <IonSelectOption value="newest">Newest</IonSelectOption>
              <IonSelectOption value="price-low">Price: Low to High</IonSelectOption>
              <IonSelectOption value="price-high">Price: High to Low</IonSelectOption>
            </IonSelect>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div className="shop-inner">
          {isLoading && (
            <IonGrid><IonRow>{[1, 2, 3, 4].map((slot) => <IonCol size="6" key={slot}><div className="tea-product-skeleton" /></IonCol>)}</IonRow></IonGrid>
          )}
          {error && <div className="tea-state"><IonText color="danger"><p>{error}</p></IonText><IonButton fill="outline" onClick={loadProducts}>Try again</IonButton></div>}

          {!isLoading && !error && <IonGrid className="product-grid">
            <IonRow>
              {sortedProducts.map((product) => (
                <IonCol size="6" key={product.id}>
                  <IonCard
                    className="tea-product-card"
                    onClick={() => navigate(`/product/${product.id}`)}
                    style={{ cursor: "pointer", height: "100%" }}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="tea-product-image"
                    />
                    <div className="tea-product-body">
                      <p className="tea-product-name">{product.name}</p>
                      <div className="tea-product-meta">
                        <span className="tea-product-price">₱{product.price.toFixed(2)}</span>
                        <span className={`tea-product-stock ${product.availability === "In Stock" ? "" : "out"}`}>
                          {product.availability}
                        </span>
                      </div>
                      <IonButton className="tea-product-cta" expand="block" size="small" onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/product/${product.id}`);
                      }}>
                        View
                      </IonButton>
                    </div>
                  </IonCard>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>}

          {!isLoading && filtered.length === 0 && (
            <IonText><p className="ion-padding ion-text-center">No products found.</p></IonText>
          )}
        </div>
      </IonContent>
      <MobileTabBar />
    </IonPage>
  );
};

export default ShopPage;
