import React, { useCallback, useEffect, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSearchbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonButton,
  IonBadge,
  IonButtons,
  IonMenuButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
} from "@ionic/react";
import {
  bagHandleOutline,
  notificationsOutline,
  arrowForwardOutline,
} from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import { fetchApi, ensureOk, requestError } from "../config/request";
import { useCart } from "../context/CartContext";
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
type Sort = "newest" | "price-low" | "price-high";
export default function ShopPage() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState<Sort>("newest");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchApi(`${API_URL}/api/products`);
      await ensureOk(response, "Unable to load the collection.");
      const data = await response.json();
      setProducts(data.products);
    } catch (failure) {
      setError(requestError(failure, "Unable to load the collection."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const categories = ["All", ...new Set(products.map((item) => item.category))];
  const filtered = products.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      (item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())),
  );
  const sorted = [...filtered].sort((a, b) =>
    sortBy === "price-low"
      ? a.price - b.price
      : sortBy === "price-high"
        ? b.price - a.price
        : 0,
  );
  return (
    <IonPage className="tea-shop-page">
      <IonHeader className="shop-header">
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton
              menu="tea-navigation"
              aria-label="Open navigation menu"
            />
          </IonButtons>
          <IonTitle>Tea Atelier</IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              aria-label="Notifications"
              routerLink="/notifications"
            >
              <IonIcon icon={notificationsOutline} />
            </IonButton>
            <IonButton
              fill="clear"
              aria-label="Open cart"
              routerLink="/cart"
              className="tea-header-cart"
            >
              <IonIcon icon={bagHandleOutline} />
              {itemCount > 0 && <IonBadge>{itemCount}</IonBadge>}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <div className="shop-inner">
          <div className="tea-shop-welcome">
            <div>
              <p className="tea-info-eyebrow">The collection</p>
              <h1>
                Your next
                <br />
                <em>favorite cup.</em>
              </h1>
              <p>Small rituals. Beautiful tea.</p>
            </div>
            <img src="/images/atelier/tea-leaves.jpg" alt="Fresh tea leaves" />
          </div>
          <IonSearchbar
            aria-label="Search products"
            value={search}
            onIonInput={(event) => setSearch(event.detail.value || "")}
            placeholder="Find your tea or essentials"
          />
          <div
            className="tea-category-strip"
            role="group"
            aria-label="Product categories"
          >
            {categories.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={category === value}
                className={category === value ? "selected" : ""}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="tea-collection-heading">
            <span>
              {loading
                ? "Finding your favorites…"
                : `${filtered.length} ${filtered.length === 1 ? "selection" : "selections"}`}
            </span>
            <IonSelect
              aria-label="Sort products"
              interface="popover"
              value={sortBy}
              onIonChange={(event) => setSortBy(event.detail.value)}
              className="tea-sort-select"
            >
              <IonSelectOption value="newest">Newest</IonSelectOption>
              <IonSelectOption value="price-low">
                Price: Low to High
              </IonSelectOption>
              <IonSelectOption value="price-high">
                Price: High to Low
              </IonSelectOption>
            </IonSelect>
          </div>
          {loading && (
            <IonGrid>
              <IonRow>
                {[1, 2, 3, 4].map((slot) => (
                  <IonCol size="6" key={slot}>
                    <div className="tea-product-skeleton" />
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          )}
          {error && (
            <div className="tea-state" role="alert">
              <p>{error}</p>
              <IonButton fill="outline" onClick={() => void load()}>
                Try again
              </IonButton>
            </div>
          )}
          {!loading && !error && (
            <IonGrid className="product-grid">
              <IonRow>
                {sorted.map((product) => (
                  <IonCol size="6" sizeMd="4" key={product.id}>
                    <IonCard
                      className="tea-product-card"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="tea-product-image-wrap">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="tea-product-image"
                          loading="lazy"
                        />
                        <span className="tea-product-category">
                          {product.category}
                        </span>
                      </div>
                      <div className="tea-product-body">
                        <p className="tea-product-name">{product.name}</p>
                        <div className="tea-product-meta">
                          <span className="tea-product-price">
                            ₱{product.price.toFixed(2)}
                          </span>
                          <span
                            className={`tea-product-stock ${product.availability === "In Stock" ? "" : "out"}`}
                          >
                            {product.availability}
                          </span>
                        </div>
                        <IonButton
                          className="tea-product-cta"
                          fill="clear"
                          expand="block"
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/product/${product.id}`);
                          }}
                        >
                          View
                          <IonIcon icon={arrowForwardOutline} slot="end" />
                        </IonButton>
                      </div>
                    </IonCard>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="tea-state">
              <h2>No matching selections</h2>
              <p>Try another search or explore a different category.</p>
              <IonButton
                fill="outline"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                }}
              >
                Reset filters
              </IonButton>
            </div>
          )}
          <p className="tea-collection-footer">
            Thoughtfully selected. A pleasure to return to.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
