import React, { useEffect, useMemo, useState } from "react";
import {
  Heart,
  Download,
  Star,
  Package,
  BookOpen,
  Search,
  ShoppingCart,
  ChevronRight,
  SlidersHorizontal,
  Flame,
  Sparkles,
  Tag,
  Store,
  X,
  MapPin,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { getProductImageCandidates } from "./productImageUtils";
import "./product-image-fix.css";
import "./home-product-carousel.css";

const ACTIVE = ["approved", "active", "actif"];

const money = (value) =>
  Number(value || 0) === 0
    ? "Gratuit"
    : `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;

const isDigital = (product) =>
  product?.product_type === "digital" || product?.source_type === "digital";

const score = (product) =>
  Number(product?.sales || 0) * 4 +
  Number(product?.downloads || 0) +
  (Number(product?.is_free) ? 1 : 0);

async function requireAccount(action, product) {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) return true;

  window.dispatchEvent(
    new CustomEvent("pjd-require-auth", {
      detail: { action, product },
    })
  );
  return false;
}

async function addToCart(product) {
  try {
    const raw = localStorage.getItem("pjd-cart") || "[]";
    const cart = JSON.parse(raw);
    const key = `${product.product_type || "physical"}-${product.id}`;
    const index = cart.findIndex(
      (item) =>
        `${item.product_type || "physical"}-${item.id}` === key
    );
    const item = {
      ...product,
      product_type: product.product_type || "physical",
      quantity: 1,
    };

    if (index >= 0) {
      cart[index] = {
        ...cart[index],
        quantity: Number(cart[index].quantity || 1) + 1,
      };
    } else {
      cart.push(item);
    }

    localStorage.setItem("pjd-cart", JSON.stringify(cart));
    window.dispatchEvent(
      new CustomEvent("pjd-cart-updated", {
        detail: { product: item, cart },
      })
    );
    window.dispatchEvent(
      new CustomEvent("pjd-cart-notification", {
        detail: {
          product: item,
          cart,
          count: cart.reduce((total, current) => total + Number(current.quantity || 0), 0),
        },
      })
    );
  } catch (error) {
    console.error("PJD cart error", error);
  }
}

async function downloadFree(product) {
  if (!(await requireAccount("download", product))) return;

  if (!product?.file_url) {
    alert("Le fichier de ce produit gratuit n’est pas encore disponible.");
    return;
  }

  try {
    const response = await fetch(product.file_url);
    if (!response.ok) throw new Error("download");

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = product.title || "produit";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(product.file_url, "_blank", "noopener,noreferrer");
  }
}

function ProductImage({ product }) {
  const candidates = getProductImageCandidates(product);
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) {
    return (
      <div className="mh-image-placeholder">
        {isDigital(product) ? <BookOpen size={54} /> : <Package size={54} />}
        <span>Photo indisponible</span>
      </div>
    );
  }

  return (
    <div className="mh-image-frame">
      <img
        className="mh-product-image"
        src={src}
        alt={product.title || "Photo du produit"}
        loading="lazy"
        decoding="async"
        onError={() => setIndex((current) => current + 1)}
      />
    </div>
  );
}

function ProductCard({ product, isFavorite, onFavorite, compact = false }) {
  const digital = isDigital(product);
  const free =
    digital &&
    (Boolean(product?.is_free) || Number(product?.price || 0) === 0);

  const buy = async () => {
    if (free) {
      await downloadFree(product);
      return;
    }

    await addToCart({
      ...product,
      product_type: digital ? "digital" : "physical",
    });
  };

  return (
    <article className={`product-card mh-product-card ${compact ? "mh-compact" : ""}`}>
      <div className="mh-art">
        <ProductImage product={product} />
        <span className="mh-type">{digital ? "NUMÉRIQUE" : "PHYSIQUE"}</span>

        {Number(product.promo_price) > 0 &&
          Number(product.promo_price) < Number(product.price) && (
            <span className="mh-sale">PROMO</span>
          )}

        <button
          type="button"
          className={`mh-heart ${isFavorite ? "active" : ""}`}
          aria-label="Favori"
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(product);
          }}
        >
          <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mh-body">
        <span className="mh-cat">
          {product.category || (digital ? "Numérique" : "Produit physique")}
        </span>
        <h3>{product.title}</h3>

        {!compact && (
          <p>{product.description || "Découvrez ce produit sur PJD Market."}</p>
        )}

        <div className="mh-rating">
          <Star size={14} fill="currentColor" />
          4.8
          <span>
            {Number(product.sales || 0)} vente
            {Number(product.sales || 0) > 1 ? "s" : ""}
          </span>
        </div>

        {!digital && (
          <div className="mh-stock">
            {Number(product.stock) > 0
              ? `${product.stock} en stock`
              : "Stock disponible"}
          </div>
        )}

        <div className="mh-price">
          <strong>{money(product.promo_price ?? product.price)}</strong>
          {product.promo_price != null &&
            Number(product.promo_price) < Number(product.price) && (
              <del>{money(product.price)}</del>
            )}
        </div>

        <button className="mh-buy" type="button" onClick={buy}>
          {free ? (
            <>
              <Download size={16} /> Télécharger gratuitement
            </>
          ) : (
            <>
              <ShoppingCart size={16} /> Ajouter au panier
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function HomeProductCarousel({ products, onOpen }) {
  const items = useMemo(
    () =>
      products
        .filter((product) => getProductImageCandidates(product).length > 0)
        .slice(0, 12),
    [products]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length < 2) return undefined;

    const timer = setInterval(
      () => setIndex((current) => (current + 1) % items.length),
      3500
    );

    return () => clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;

  const product = items[index % items.length];
  const image = getProductImageCandidates(product)[0];
  const digital = isDigital(product);
  const price = product.promo_price ?? product.price;

  return (
    <section className="mh-product-carousel">
      <div className="mh-carousel-head">
        <div>
          <span className="mh-eyebrow-dark">
            <Sparkles size={14} /> À LA UNE
          </span>
          <h2>Les produits du moment</h2>
          <p>Découvrez les produits disponibles sur PJD Maker</p>
        </div>

        <div className="mh-carousel-controls">
          <button
            type="button"
            aria-label="Produit précédent"
            onClick={() =>
              setIndex((current) => (current - 1 + items.length) % items.length)
            }
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Produit suivant"
            onClick={() => setIndex((current) => (current + 1) % items.length)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <button
        className="mh-carousel-slide"
        type="button"
        onClick={() => onOpen(product)}
      >
        <div className="mh-carousel-image">
          <img src={image} alt={product.title || "Produit PJD Maker"} />
          <span>{digital ? "NUMÉRIQUE" : "PHYSIQUE"}</span>
        </div>
        <div className="mh-carousel-info">
          <small>
            {product.category ||
              (digital ? "Produit numérique" : "Produit physique")}
          </small>
          <h3>{product.title}</h3>
          <p>
            {product.description ||
              "Un produit sélectionné parmi les offres PJD Maker."}
          </p>
          <strong>{money(price)}</strong>
          <span className="mh-carousel-cta">
            Voir le produit <ChevronRight size={17} />
          </span>
        </div>
      </button>

      <div className="mh-carousel-dots">
        {items.map((item, itemIndex) => (
          <button
            key={`${item.product_type}-${item.id}`}
            type="button"
            aria-label={`Afficher ${item.title}`}
            className={itemIndex === index % items.length ? "active" : ""}
            onClick={() => setIndex(itemIndex)}
          />
        ))}
      </div>
    </section>
  );
}

function Section({
  title,
  eyebrow,
  icon: Icon,
  products,
  favorites,
  onFavorite,
  empty = "Aucun produit dans cette sélection.",
}) {
  return (
    <section className="mh-section">
      <div className="mh-section-head">
        <div>
          <span className="mh-eyebrow-dark">
            {Icon && <Icon size={14} />} {eyebrow}
          </span>
          <h2>{title}</h2>
        </div>
        <span className="mh-see">
          Voir tout <ChevronRight size={17} />
        </span>
      </div>

      {products.length ? (
        <div className="mh-grid">
          {products.slice(0, 8).map((product) => (
            <ProductCard
              key={`${product.product_type}-${product.id}`}
              product={product}
              onFavorite={onFavorite}
              isFavorite={favorites.some(
                (favorite) =>
                  favorite.id === product.id &&
                  favorite.product_type === product.product_type
              )}
            />
          ))}
        </div>
      ) : (
        <div className="mh-empty">{empty}</div>
      )}
    </section>
  );
}

function ShopsSection({ shops, onOpenShop }) {
  if (!shops.length) return null;

  return (
    <section className="mh-section mh-shops-section">
      <div className="mh-section-head">
        <div>
          <span className="mh-eyebrow-dark">
            <Store size={14} /> BOUTIQUES
          </span>
          <h2>Meilleures boutiques</h2>
        </div>
      </div>

      <div className="mh-shops-grid">
        {shops.slice(0, 6).map((shop) => (
          <button
            className="mh-shop-card"
            key={shop.id}
            type="button"
            onClick={() => onOpenShop(shop.id)}
          >
            <div
              className="mh-shop-cover"
              style={
                shop.banner
                  ? { backgroundImage: `url(${shop.banner})` }
                  : undefined
              }
            />
            <div className="mh-shop-logo">
              {shop.logo ? <img src={shop.logo} alt="" /> : <Store size={24} />}
            </div>
            <div className="mh-shop-info">
              <strong>{shop.shop_name}</strong>
              <span>{shop.category || "Boutique"}</span>
              <small>
                <Star size={13} fill="currentColor" /> {Number(shop.rating || 0).toFixed(1)} · {Number(shop.followers_count || 0)} abonnés
              </small>
              {shop.city && (
                <small>
                  <MapPin size={13} /> {shop.city}
                </small>
              )}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function MarketplaceHome() {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("relevance");

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pjd-favorites") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    loadProducts();
    loadShops();

    const channel = supabase
      .channel("marketplace-products-home-v14")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "digital_products",
        },
        loadProducts
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_products",
        },
        loadProducts
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    localStorage.setItem("pjd-favorites", JSON.stringify(favorites));
  }, [favorites]);

  async function loadProducts() {
    setLoading(true);

    const [digitalResult, physicalResult] = await Promise.all([
      supabase
        .from("digital_products")
        .select(
          "id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,image_url,file_type,file_url,is_free,downloads,sales,stock,status,created_at,source_type"
        )
        .in("status", ACTIVE)
        .order("created_at", { ascending: false }),
      supabase
        .from("marketplace_products")
        .select(
          "id,seller_id,shop_id,title,description,category,price,stock,images,status,created_at,updated_at"
        )
        .in("status", ACTIVE)
        .order("created_at", { ascending: false }),
    ]);

    const digital = (digitalResult.data || [])
      .filter((product) => product.source_type !== "physical")
      .map((product) => ({ ...product, product_type: "digital" }));

    const physicalFromDigital = (digitalResult.data || [])
      .filter((product) => product.source_type === "physical")
      .map((product) => ({
        ...product,
        product_type: "physical",
        sales: 0,
        downloads: 0,
        is_free: false,
      }));

    const physicalProducts = (physicalResult.data || []).map((product) => ({
      ...product,
      product_type: "physical",
      sales: 0,
      downloads: 0,
      is_free: false,
    }));

    setProducts(
      [...digital, ...physicalFromDigital, ...physicalProducts].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      )
    );
    setLoading(false);
  }

  async function loadShops() {
    const { data } = await supabase
      .from("shops")
      .select(
        "id,shop_name,slug,description,logo,banner,category,status,city,rating,followers_count"
      )
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(8);

    setShops(data || []);
  }

  const categories = useMemo(
    () =>
      [...new Set(products.map((product) => product.category).filter(Boolean))].slice(
        0,
        10
      ),
    [products]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = products.filter((product) =>
      `${product.title || ""} ${product.description || ""} ${product.category || ""}`
        .toLowerCase()
        .includes(term)
    );

    if (activeFilter === "digital") {
      list = list.filter((product) => product.product_type === "digital");
    }
    if (activeFilter === "physical") {
      list = list.filter((product) => product.product_type === "physical");
    }
    if (activeFilter === "free") {
      list = list.filter(
        (product) =>
          product.product_type === "digital" &&
          (Boolean(product.is_free) || Number(product.price || 0) === 0)
      );
    }
    if (activeFilter === "promo") {
      list = list.filter(
        (product) =>
          Number(product.promo_price) > 0 &&
          Number(product.promo_price) < Number(product.price)
      );
    }

    if (sort === "price-asc") {
      list.sort(
        (a, b) =>
          Number(a.promo_price ?? a.price) - Number(b.promo_price ?? b.price)
      );
    }
    if (sort === "price-desc") {
      list.sort(
        (a, b) =>
          Number(b.promo_price ?? b.price) - Number(a.promo_price ?? a.price)
      );
    }
    if (sort === "popular") {
      list.sort((a, b) => score(b) - score(a));
    }

    return list;
  }, [products, search, activeFilter, sort]);

  const trending = useMemo(
    () => [...filtered].sort((a, b) => score(b) - score(a)),
    [filtered]
  );
  const newest = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      ),
    [filtered]
  );
  const physical = useMemo(
    () => filtered.filter((product) => product.product_type === "physical"),
    [filtered]
  );
  const digital = useMemo(
    () => filtered.filter((product) => product.product_type === "digital"),
    [filtered]
  );
  const popular = useMemo(
    () => [...filtered].sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0)),
    [filtered]
  );
  const free = useMemo(
    () =>
      filtered.filter(
        (product) =>
          product.product_type === "digital" &&
          (Boolean(product.is_free) || Number(product.price || 0) === 0)
      ),
    [filtered]
  );
  const promo = useMemo(
    () =>
      filtered.filter(
        (product) =>
          Number(product.promo_price) > 0 &&
          Number(product.promo_price) < Number(product.price)
      ),
    [filtered]
  );

  function toggleFavorite(product) {
    setFavorites((current) =>
      current.some(
        (item) =>
          item.id === product.id && item.product_type === product.product_type
      )
        ? current.filter(
            (item) =>
              !(item.id === product.id &&
                item.product_type === product.product_type)
          )
        : [...current, product]
    );
  }

  const startSelling = () => {
    window.dispatchEvent(new CustomEvent("pjd-open-seller"));
    document.dispatchEvent(new CustomEvent("pjd-open-seller"));
  };

  const openCarouselProduct = (product) => {
    window.dispatchEvent(
      new CustomEvent("pjd-open-product", { detail: product })
    );

    const match = [...document.querySelectorAll(".product-card")].find(
      (element) =>
        element.querySelector("h3")?.textContent?.trim() === product.title
    );

    if (match) match.click();
  };

  return (
    <div className="mh-page">
      <section className="mh-hero">
        <div className="mh-hero-inner">
          <div className="mh-hero-copy">
            <span className="mh-eyebrow">PJD MAKER · MARKETPLACE</span>
            <h1>
              Tout ce dont vous avez besoin, <em>au même endroit.</em>
            </h1>
            <p>
              Découvrez les produits tendance, les meilleures ventes, les
              nouveautés et les produits numériques de vendeurs vérifiés.
            </p>

            <form
              className="mh-search"
              onSubmit={(event) => event.preventDefault()}
            >
              <Search size={19} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un produit, une boutique, un service..."
              />
              <button type="submit">Rechercher</button>
            </form>

            <button
              type="button"
              className="mh-start-selling"
              onClick={startSelling}
            >
              <Store size={18} /> Commencer à vendre
            </button>

            <div className="mh-hero-badges">
              <span>🔒 Paiement sécurisé</span>
              <span>🚚 Livraison</span>
              <span>✓ Vendeurs vérifiés</span>
            </div>
          </div>

          <div className="mh-hero-card">
            <Flame size={28} />
            <strong>{products.length}</strong>
            <span>produits disponibles</span>
            <small>Catalogue Supabase en direct</small>
          </div>
        </div>
      </section>

      <nav className="mh-category-bar">
        <button
          type="button"
          className={activeFilter === "all" ? "active" : ""}
          onClick={() => setActiveFilter("all")}
        >
          Tout
        </button>
        <button
          type="button"
          className={activeFilter === "digital" ? "active" : ""}
          onClick={() => setActiveFilter("digital")}
        >
          Produits numériques
        </button>
        <button
          type="button"
          className={activeFilter === "physical" ? "active" : ""}
          onClick={() => setActiveFilter("physical")}
        >
          Produits physiques
        </button>
        <button
          type="button"
          className={activeFilter === "free" ? "active" : ""}
          onClick={() => setActiveFilter("free")}
        >
          Gratuits
        </button>
        <button
          type="button"
          className={activeFilter === "promo" ? "active" : ""}
          onClick={() => setActiveFilter("promo")}
        >
          Promotions
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setSearch(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      <main className="mh-main">
        <HomeProductCarousel
          products={products}
          onOpen={openCarouselProduct}
        />

        <div className="mh-toolbar">
          <div>
            <span className="mh-eyebrow-dark">CATALOGUE</span>
            <h2>Découvrez nos produits</h2>
            <p>
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="mh-actions">
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
            >
              <SlidersHorizontal size={16} /> Filtres
            </button>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              aria-label="Trier les produits"
            >
              <option value="relevance">Pertinence</option>
              <option value="popular">Plus populaires</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="mh-filter-panel">
            <button type="button" onClick={() => setActiveFilter("all")}>Tous</button>
            <button type="button" onClick={() => setActiveFilter("digital")}>Numériques</button>
            <button type="button" onClick={() => setActiveFilter("physical")}>Physiques</button>
            <button type="button" onClick={() => setActiveFilter("free")}>Gratuit</button>
            <button type="button" onClick={() => setActiveFilter("promo")}>Promo</button>
            <button
              type="button"
              className="mh-close"
              aria-label="Fermer les filtres"
              onClick={() => setShowFilters(false)}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="mh-empty">Chargement des produits...</div>
        ) : (
          <>
            {!search && activeFilter === "all" && (
              <Section
                eyebrow="TENDANCE"
                title="Tendance"
                icon={Flame}
                products={trending}
                favorites={favorites}
                onFavorite={toggleFavorite}
              />
            )}

            <Section
              eyebrow="PLUS POPULAIRES"
              title="Plus populaires"
              icon={Star}
              products={popular}
              favorites={favorites}
              onFavorite={toggleFavorite}
            />
            <Section
              eyebrow="NOUVEAUTÉS"
              title="Nouveautés"
              icon={Sparkles}
              products={newest}
              favorites={favorites}
              onFavorite={toggleFavorite}
            />
            <Section
              eyebrow="PRODUITS PHYSIQUES"
              title="Produits physiques"
              icon={Package}
              products={physical}
              favorites={favorites}
              onFavorite={toggleFavorite}
            />
            <Section
              eyebrow="PRODUITS NUMÉRIQUES"
              title="Produits numériques"
              icon={BookOpen}
              products={digital}
              favorites={favorites}
              onFavorite={toggleFavorite}
            />

            {promo.length > 0 && (
              <Section
                eyebrow="OFFRES"
                title="Promotions"
                icon={Tag}
                products={promo}
                favorites={favorites}
                onFavorite={toggleFavorite}
              />
            )}

            <Section
              eyebrow="GRATUITS"
              title="Produits gratuits"
              icon={Download}
              products={free}
              favorites={favorites}
              onFavorite={toggleFavorite}
            />

            <ShopsSection
              shops={shops}
              onOpenShop={(shopId) =>
                window.dispatchEvent(
                  new CustomEvent("pjd-open-shop", {
                    detail: { shopId },
                  })
                )
              }
            />

            {search && (
              <Section
                eyebrow="RECHERCHE"
                title={`Résultats pour « ${search} »`}
                icon={Search}
                products={filtered}
                favorites={favorites}
                onFavorite={toggleFavorite}
              />
            )}
          </>
        )}

        <section className="mh-seller-cta">
          <div>
            <span className="mh-eyebrow">VENDEURS</span>
            <h2>Vous avez quelque chose à vendre ?</h2>
            <p>
              Créez votre boutique, publiez vos produits et développez votre
              activité avec PJD Maker.
            </p>
          </div>
          <button type="button" onClick={startSelling}>
            <Store size={17} /> Commencer à vendre
          </button>
        </section>
      </main>
    </div>
  );
}
