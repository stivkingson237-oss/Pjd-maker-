import React, { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Heart, Download, Star, Package, BookOpen } from "lucide-react";
import { supabase } from "./lib/supabase";

const money = (v) =>
  Number(v || 0) === 0
    ? "Gratuit"
    : `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;

const ACTIVE = ["approved", "active", "actif"];
const PHYSICAL_RE = /mode|électronique|maison|beauté|alimentation|accessoire|chaussure|vêtement|meuble|matériel|physique/i;

const isDigital = (p) =>
  Boolean(p?.file_url || p?.file_type) &&
  !PHYSICAL_RE.test(`${p?.category || ""} ${p?.title || ""}`);

async function downloadFree(product) {
  if (!product?.file_url) {
    alert("Le fichier de ce produit gratuit n’est pas encore disponible.");
    return;
  }

  try {
    const response = await fetch(product.file_url);
    if (!response.ok) throw new Error("download");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = product.title || "produit";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(product.file_url, "_blank", "noopener,noreferrer");
  }
}

function ProductCard({ product, isFavorite, onFavorite }) {
  const digital = isDigital(product);
  const free = Boolean(product?.is_free) || Number(product?.price || 0) === 0;

  return (
    <article className="product-card mh-product-card">
      <div className="mh-art">
        {product.cover_image ? (
          <img src={product.cover_image} alt={product.title || "Produit"} loading="lazy" />
        ) : digital ? (
          <BookOpen size={48} />
        ) : (
          <Package size={48} />
        )}

        <span className="mh-type">{digital ? "NUMÉRIQUE" : "PHYSIQUE"}</span>

        <button
          type="button"
          className={`mh-heart ${isFavorite ? "active" : ""}`}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(product);
          }}
        >
          <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mh-body">
        <span className="mh-cat">{product.category || "Produit"}</span>
        <h3>{product.title}</h3>
        <p>{product.description || "Découvrez ce produit sur PJD Maker."}</p>

        <div className="mh-rating">
          <Star size={14} fill="currentColor" />
          4.8
          <span>Vendeur vérifié</span>
        </div>

        <div className="mh-price">
          <strong>{money(product.promo_price ?? product.price)}</strong>
          {product.promo_price != null && Number(product.promo_price) < Number(product.price) && (
            <del>{money(product.price)}</del>
          )}
        </div>

        {free && digital ? (
          <button className="mh-buy" type="button" onClick={() => downloadFree(product)}>
            <Download size={16} />
            Téléchargez gratuitement
          </button>
        ) : (
          <button
            className="mh-buy"
            type="button"
            onClick={() =>
              document.dispatchEvent(
                new CustomEvent("pjd-add-to-cart", { detail: product })
              )
            }
          >
            <ShoppingCart size={16} />
            Ajouter au panier
          </button>
        )}
      </div>
    </article>
  );
}

export default function MarketplaceHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pjd-favorites") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    loadProducts();

    const channel = supabase
      .channel("marketplace-products-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "digital_products" },
        () => loadProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("pjd-favorites", JSON.stringify(favorites));
  }, [favorites]);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("digital_products")
      .select(
        "id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,image_url,file_type,file_url,preview_url,is_free,downloads,sales,stock,status,created_at"
      )
      .in("status", ACTIVE)
      .order("created_at", { ascending: false });

    setProducts(error ? [] : data || []);
    setLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      const text = `${product.title || ""} ${product.description || ""} ${product.category || ""}`.toLowerCase();
      return text.includes(term);
    });
  }, [products, search]);

  const toggleFavorite = (product) => {
    setFavorites((current) =>
      current.some((item) => item.id === product.id)
        ? current.filter((item) => item.id !== product.id)
        : [...current, product]
    );
  };

  return (
    <div className="mh-page">
      <section className="mh-hero">
        <div>
          <span className="mh-eyebrow">PJD MARKET · MARKETPLACE</span>
          <h1>Achetez, vendez et développez votre activité.</h1>
          <p>
            Découvrez les produits numériques, physiques et services disponibles sur PJD Maker.
          </p>
          <form
            className="mh-search"
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un produit, une boutique, un service..."
              aria-label="Rechercher"
            />
            <button type="submit">Rechercher</button>
          </form>
          <div className="mh-hero-badges">
            <span>🔒 Paiement sécurisé</span>
            <span>🚚 Livraison</span>
            <span>✓ Vendeurs vérifiés</span>
          </div>
        </div>
      </section>

      <section className="mh-products-area">
        {loading ? (
          <div className="mh-loading">Chargement des produits...</div>
        ) : filteredProducts.length ? (
          <div className="mh-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onFavorite={toggleFavorite}
                isFavorite={favorites.some((item) => item.id === product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mh-no-products">
            {search.trim()
              ? "Aucun produit ne correspond à votre recherche."
              : "Aucun produit disponible pour le moment."}
          </div>
        )}
      </section>
    </div>
  );
}
