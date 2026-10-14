import React, { useCallback, useEffect, useRef, useState } from "react";
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
  chevronBackOutline,
  chevronForwardOutline,
  personOutline,
} from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config/api";
import { fetchApi, ensureOk, requestError } from "../config/request";
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
type Sort = "newest" | "price-low" | "price-high";
function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (id: string) => void;
}) {
  return (
    <IonCard className="tea-product-card" onClick={() => onOpen(product.id)}>
      <div className="tea-product-image-wrap">
        <img
          src={product.image}
          alt={product.name}
          className="tea-product-image"
          loading="lazy"
        />
        <span className="tea-product-category">{product.category}</span>
      </div>
      <div className="tea-product-body">
        <p className="tea-product-name">{product.name}</p>
        <div className="tea-product-meta">
          <span className="tea-product-price">₱{product.price.toFixed(2)}</span>
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
            onOpen(product.id);
          }}
        >
          View
          <IonIcon icon={arrowForwardOutline} slot="end" />
        </IonButton>
      </div>
    </IonCard>
  );
}
export default function ShopPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const openProduct = (id: string) => navigate(`/product/${id}`);
  const featureTrack = useRef<HTMLDivElement>(null);
  const collectionHeading = useRef<HTMLHeadingElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const slideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const requestedSlide = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (slideTimer.current !== undefined) clearTimeout(slideTimer.current);
    },
    [],
  );
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [bestLoading, setBestLoading] = useState(true);
  const [bestError, setBestError] = useState("");
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
      if (!Array.isArray(data.products))
        throw new Error("Unable to load the collection.");
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
  const loadBestSellers = useCallback(async () => {
    setBestLoading(true);
    setBestError("");
    try {
      const response = await fetchApi(`${API_URL}/api/products/best-sellers`);
      await ensureOk(response, "Unable to load best sellers.");
      const data = await response.json();
      if (!Array.isArray(data.products))
        throw new Error("Unable to load best sellers.");
      setBestSellers(data.products.slice(0, 6));
    } catch (failure) {
      setBestError(requestError(failure, "Unable to load best sellers."));
    } finally {
      setBestLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadBestSellers();
  }, [loadBestSellers]);
  const categories = [
    "All",
    ...new Set(products.map((item) => item.category).filter(Boolean)),
  ];
  const slides = [
    {
      category: "All",
      title: "Small rituals. Beautiful tea.",
      description: "Find something for your next cup.",
      image: "/images/atelier/matcha.jpg",
      action: "Explore the collection",
    },
    ...categories.slice(1, 3).map((name) => ({
      category: name,
      title: `Discover ${name}.`,
      description: "A new favorite starts with a little exploring.",
      image:
        products.find((item) => item.category === name)?.image ||
        "/images/atelier/tea-leaves.jpg",
      action: `Explore ${name}`,
    })),
  ];
  const selectedSlide = Math.min(activeSlide, slides.length - 1);
  const motion = (): ScrollBehavior =>
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
  const syncSlidePosition = () => {
    const track = featureTrack.current;
    if (!track || !track.children.length) return;
    const firstOffset = (track.children[0] as HTMLElement).offsetLeft;
    const closest = Array.from(track.children).reduce(
      (best, child, index, children) => {
        const distance = Math.abs(
          (child as HTMLElement).offsetLeft - firstOffset - track.scrollLeft,
        );
        const bestDistance = Math.abs(
          (children[best] as HTMLElement).offsetLeft -
            firstOffset -
            track.scrollLeft,
        );
        return distance < bestDistance ? index : best;
      },
      0,
    );
    requestedSlide.current = null;
    setActiveSlide(closest);
  };
  const goToSlide = (value: number) => {
    const track = featureTrack.current;
    if (!track || !track.children.length) return;
    if (slideTimer.current !== undefined) clearTimeout(slideTimer.current);
    const index = Math.max(0, Math.min(track.children.length - 1, value));
    const left =
      (track.children[index] as HTMLElement).offsetLeft -
      (track.children[0] as HTMLElement).offsetLeft;
    requestedSlide.current = index;
    track.scrollTo({ left, behavior: motion() });
    if (Math.abs(track.scrollLeft - left) < 1) syncSlidePosition();
  };
  const moveSlide = (direction: number) =>
    goToSlide((requestedSlide.current ?? selectedSlide) + direction);
  const explore = (value: string) => {
    setCategory(value);
    setSearch("");
    requestAnimationFrame(() => {
      collectionHeading.current?.scrollIntoView({
        behavior: motion(),
        block: "start",
      });
      collectionHeading.current?.focus({ preventScroll: true });
    });
  };
  const filtered = products.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      (item.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        item.category.toLowerCase().includes(search.trim().toLowerCase())),
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
            {token ? (
              <IonButton
                fill="clear"
                aria-label="Notifications"
                routerLink="/notifications"
              >
                <IonIcon icon={notificationsOutline} />
              </IonButton>
            ) : (
              <IonButton fill="clear" aria-label="Sign in" routerLink="/login">
                <IonIcon icon={personOutline} />
              </IonButton>
            )}
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
          <div className="tea-shop-intro">
            <p className="tea-info-eyebrow">Welcome to the atelier</p>
            <h1>Find your daily steep.</h1>
          </div>
          <IonSearchbar
            aria-label="Search products"
            value={search}
            onIonInput={(event) => setSearch(event.detail.value || "")}
            placeholder="Find your tea or essentials"
          />
          <section
            className="tea-features"
            aria-label="Featured collections"
            aria-roledescription="carousel"
          >
            <div
              className="tea-feature-track"
              ref={featureTrack}
              tabIndex={0}
              aria-label="Swipe through featured collections"
              onScroll={() => {
                // Commit the indicator once motion settles, using actual slide offsets.
                if (slideTimer.current !== undefined)
                  clearTimeout(slideTimer.current);
                slideTimer.current = setTimeout(() => {
                  slideTimer.current = undefined;
                  syncSlidePosition();
                }, 120);
              }}
              onPointerDown={() => {
                requestedSlide.current = null;
              }}
              onWheel={() => {
                requestedSlide.current = null;
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  moveSlide(1);
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  moveSlide(-1);
                }
              }}
            >
              {slides.map((slide, index) => (
                <div
                  className="tea-feature-slide"
                  key={slide.category}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${slides.length}: ${slide.category === "All" ? "The collection" : slide.category}`}
                >
                  <div>
                    <h2>{slide.title}</h2>
                    <p>{slide.description}</p>
                    <button
                      type="button"
                      onClick={() => explore(slide.category)}
                      tabIndex={index === selectedSlide ? 0 : -1}
                    >
                      {slide.action}
                      <IonIcon icon={arrowForwardOutline} aria-hidden="true" />
                    </button>
                  </div>
                  <img
                    src={slide.image}
                    alt=""
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                </div>
              ))}
            </div>
            {slides.length > 1 && (
              <div className="tea-feature-controls">
                <button
                  type="button"
                  aria-label="Previous feature"
                  disabled={selectedSlide === 0}
                  onClick={() => moveSlide(-1)}
                >
                  <IonIcon icon={chevronBackOutline} aria-hidden="true" />
                </button>
                <div className="tea-feature-dots">
                  {slides.map((slide, index) => (
                    <button
                      type="button"
                      key={slide.category}
                      aria-label={`Show feature ${index + 1}`}
                      aria-current={
                        selectedSlide === index ? "true" : undefined
                      }
                      onClick={() => goToSlide(index)}
                    >
                      <span />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Next feature"
                  disabled={selectedSlide === slides.length - 1}
                  onClick={() => moveSlide(1)}
                >
                  <IonIcon icon={chevronForwardOutline} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>
          {(bestLoading || bestError || bestSellers.length > 0) && (
            <section className="tea-best-sellers" aria-label="Best Sellers">
              <div className="tea-shop-section-heading">
                <div>
                  <h2>Best Sellers</h2>
                  <p>A few well-loved favorites.</p>
                </div>
                <button type="button" onClick={() => explore("All")}>
                  View all{" "}
                  <IonIcon icon={arrowForwardOutline} aria-hidden="true" />
                </button>
              </div>
              {bestLoading && (
                <p role="status" className="tea-panel-copy">
                  Finding best sellers…
                </p>
              )}
              {!bestLoading && bestError && (
                <div role="alert" className="tea-best-error">
                  <p>{bestError}</p>
                  <IonButton
                    size="small"
                    fill="outline"
                    onClick={() => void loadBestSellers()}
                  >
                    Retry best sellers
                  </IonButton>
                </div>
              )}
              {!bestLoading && !bestError && (
                <div
                  className="tea-best-track"
                  tabIndex={0}
                  aria-label="Swipe through best sellers"
                >
                  {bestSellers.map((product) => (
                    <div className="tea-best-card" key={product.id}>
                      <ProductCard product={product} onOpen={openProduct} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
          <div className="tea-shop-section-heading">
            <h2 ref={collectionHeading} tabIndex={-1}>
              All Products
            </h2>
          </div>
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
                    <ProductCard product={product} onOpen={openProduct} />
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
