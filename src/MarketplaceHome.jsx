import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingCart,
  Heart,
  Download,
  Star,
  Package,
  BookOpen,
  TrendingUp,
  Clock3,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  Tag,
  Zap,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const money = (v) =>
  Number(v || 0) === 0
    ? "Gratuit"
    : `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;

const ACTIVE = ["approved", "active", "actif"];

const DIGITAL_RE = /digital|numérique|ebook|e-book|pdf|apk|logiciel|formation|template|fichier|document|license|licence/i;
const PHYSICAL_RE = /mode|électronique|maison|beauté|alimentation|accessoire|chaussure|vêtement|meuble|matériel|physique/i;

const isDigital = (p) =>
  Boolean(p?.file_url || p?.file_type) &&
  !PHYSICAL_RE.test(`${p?.category || ""} ${p?.title || ""}`);

const isPhysical = (p) => !isDigital(p);

const popularityScore = (p) =>
  Number(p?.sales || 0) * 8 + Number(p?.downloads || 0) * 2;

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

function CollapsibleSection({
  icon,
  title,
  subtitle,
  items,
  favorites,
  onFavorite,
  onSeeAll,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`mh-section ${open ? "is-open" : "is-closed"}`}>
      <div className="mh-section-head">
        <button
          type="button"
          className="mh-section-toggle"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="mh-section-icon">{icon}</span>
          <span className="mh-title-text">
            <strong>{title}</strong>
            {subtitle && <small>{subtitle}</small>}
          </span>
          <ChevronDown className={`mh-chevron ${open ? "rotated" : ""}`} size={20} />
        </button>

        <button type="button" className="mh-see" onClick={onSeeAll}>
          Voir tout <ChevronRight size={16} />
        </button>
      </div>

      {open && (
        <div className="mh-section-content">
          <div className="mh-grid">
            {items.length ? (
              items.slice(0, 8).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFavorite={onFavorite}
                  isFavorite={favorites.some((item) => item.id === product.id)}
                />
              ))
            ) : (
              <div className="mh-empty">
                Aucun produit dans cette sélection pour le moment.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function MarketplaceHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);
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

  const categories = useMemo(
    () => [
      "all",
      ...Array.from(
        new Set(products.map((product) => product.category).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [products]
  );

  const filtered = useMemo(() => {
    const list = products.filter((product) => {
      const text = `${product.title || ""} ${product.description || ""} ${product.category || ""}`.toLowerCase();
      const matchesSearch = !query || text.includes(query.toLowerCase());
      const matchesType =
        filter === "digital"
          ? isDigital(product)
          : filter === "physical"
          ? isPhysical(product)
          : true;
      const matchesCategory = category === "all" || product.category === category;

      return matchesSearch && matchesType && matchesCategory;
    });

    return [...list].sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sort === "price-low") {
        return (
          Number(a.promo_price ?? a.price ?? 0) -
          Number(b.promo_price ?? b.price ?? 0)
        );
      }
      if (sort === "price-high") {
        return (
          Number(b.promo_price ?? b.price ?? 0) -
          Number(a.promo_price ?? a.price ?? 0)
        );
      }
      return popularityScore(b) - popularityScore(a);
    });
  }, [products, query, filter, category, sort]);

  const trending = useMemo(
    () => [...products].sort((a, b) => popularityScore(b) - popularityScore(a)),
    [products]
  );

  const popular = useMemo(
    () =>
      [...products].sort(
        (a, b) =>
          Number(b.sales || 0) - Number(a.sales || 0) ||
          Number(b.downloads || 0) - Number(a.downloads || 0)
      ),
    [products]
  );

  const physical = useMemo(() => products.filter(isPhysical), [products]);
  const digital = useMemo(() => products.filter(isDigital), [products]);
  const newest = useMemo(
    () => [...products].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [products]
  );

  const toggleFavorite = (product) => {
    setFavorites((current) =>
      current.some((item) => item.id === product.id)
        ? current.filter((item) => item.id !== product.id)
        : [...current, product]
    );
  };

  const scrollToCatalog = (nextFilter = "all") => {
    setQuery("");
    setSearch("");
    setFilter(nextFilter);
    setCategory("all");
    setSort("popular");
    document.getElementById("mh-catalog")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setQuery(search.trim());
    document.getElementById("mh-catalog")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const sectionProps = {
    favorites,
    onFavorite: toggleFavorite,
  };

  return (
    <div className="mh-page">
      <style>{`
        .mh-page{padding:24px 20px 90px;background:linear-gradient(180deg,#f8fafc 0%,#f4f6f8 100%);color:#151515;min-height:100vh;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .mh-hero{max-width:1280px;margin:0 auto 34px;padding:46px 42px;border-radius:30px;background:radial-gradient(circle at 85% 20%,#444 0,#242424 24%,#0d0d0d 68%);color:#fff;display:flex;gap:30px;align-items:center;justify-content:space-between;position:relative;overflow:hidden;box-shadow:0 18px 45px rgba(0,0,0,.16)}
        .mh-hero h1{font-size:clamp(34px,5vw,58px);line-height:1.02;letter-spacing:-.045em;margin:10px 0 14px;max-width:760px}
        .mh-hero p{max-width:700px;color:#d4d4d4;line-height:1.65;margin:0 0 24px;font-size:15px}
        .mh-eyebrow{font-size:11px;font-weight:850;letter-spacing:.14em;color:#aaa}
        .mh-search{display:flex;max-width:680px;background:#fff;border-radius:16px;overflow:hidden;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
        .mh-search input{flex:1;border:0;outline:0;padding:12px 10px;font-size:14px;min-width:0;color:#111}
        .mh-search button{border:0;background:#151515;color:#fff;padding:0 20px;border-radius:12px;font-weight:750;cursor:pointer}
        .mh-hero-badges{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.mh-hero-badges span{padding:8px 12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);border-radius:999px;font-size:11px;color:#e8e8e8}
        .mh-section{max-width:1280px;margin:38px auto;background:#fff;border:1px solid #e8eaed;border-radius:20px;overflow:hidden;box-shadow:0 6px 20px rgba(20,25,30,.04)}
        .mh-section-head{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:16px 18px;border-bottom:1px solid #edf0f2}
        .mh-section.is-closed .mh-section-head{border-bottom:0}.mh-section-toggle{display:flex;align-items:center;gap:12px;flex:1;border:0;background:transparent;text-align:left;cursor:pointer;padding:0;color:#151515;min-width:0}
        .mh-section-icon{width:44px;height:44px;border-radius:14px;background:#151515;color:#fff;display:grid;place-items:center;flex:none}.mh-title-text{display:flex;flex-direction:column;gap:4px;min-width:0}.mh-title-text strong{font-size:22px;letter-spacing:-.025em}.mh-title-text small{font-size:13px;color:#7b818b}.mh-chevron{margin-left:auto;transition:transform .2s}.mh-chevron.rotated{transform:rotate(180deg)}
        .mh-see{border:1px solid #e3e6ea;background:#fff;color:#20242a;border-radius:11px;padding:9px 12px;font-weight:750;display:flex;align-items:center;gap:3px;cursor:pointer;white-space:nowrap}.mh-see:hover{background:#f3f4f6}
        .mh-section-content{padding:0 18px 18px}.mh-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:17px}.mh-product-card{cursor:default}.mh-art{height:218px;background:linear-gradient(145deg,#eef0f3,#e4e7eb);display:grid;place-items:center;position:relative;overflow:hidden}.mh-art img{width:100%;height:100%;object-fit:cover}.mh-type{position:absolute;z-index:2;left:11px;top:11px;background:rgba(15,15,15,.88);color:#fff;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:850}.mh-heart{z-index:3;position:absolute;right:11px;top:11px;border:1px solid rgba(0,0,0,.06);background:rgba(255,255,255,.94);color:#292929;border-radius:50%;width:36px;height:36px;display:grid;place-items:center;cursor:pointer}.mh-heart.active{color:#d71920}.mh-body{padding:15px}.mh-cat{display:inline-block;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.08em;color:#858b94;background:#f3f4f6;border-radius:999px;padding:5px 8px;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mh-body h3{font-size:16px;line-height:1.25;margin:9px 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mh-body p{font-size:12px;color:#737a84;line-height:1.45;height:35px;overflow:hidden;margin:0 0 10px}.mh-rating{font-size:12px;display:flex;gap:5px;align-items:center}.mh-rating span{color:#8b9098;margin-left:auto;font-size:10px}.mh-price{display:flex;align-items:center;gap:8px;margin:11px 0 12px}.mh-price strong{font-size:18px}.mh-price del{font-size:11px;color:#a0a4aa}.mh-buy{width:100%;border:0;border-radius:12px;padding:11px;background:#151515;color:#fff;font-weight:750;display:flex;justify-content:center;align-items:center;gap:7px;cursor:pointer}.mh-filters{max-width:1280px;margin:0 auto 20px;background:#fff;border:1px solid #e2e5e9;border-radius:18px;padding:13px;display:flex;gap:9px;flex-wrap:wrap;box-shadow:0 8px 24px rgba(20,25,30,.05)}.mh-filters select,.mh-filter-btn{border:1px solid #dfe3e7;background:#fff;color:#252a30;border-radius:11px;padding:10px 12px;font-size:13px;outline:none}.mh-filter-btn{display:flex;align-items:center;gap:6px;font-weight:750;cursor:pointer}.mh-empty{grid-column:1/-1;padding:42px 25px;text-align:center;background:#fafafa;border:1px dashed #d8dce1;border-radius:16px;color:#7c838d}.mh-catalog-head{max-width:1280px;margin:55px auto 15px;display:flex;justify-content:space-between;align-items:end;gap:15px}.mh-catalog-head h2{margin:4px 0 0;font-size:26px}.mh-count{font-size:13px;color:#747a83}.mh-mobile-filter{display:none}
        @media(max-width:1050px){.mh-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:760px){.mh-page{padding:12px 10px 70px}.mh-hero{padding:27px 18px;border-radius:22px;margin-bottom:27px}.mh-hero h1{font-size:34px}.mh-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mh-art{height:158px}.mh-body{padding:10px}.mh-body h3{font-size:14px}.mh-body p{font-size:11px;height:32px}.mh-rating span{display:none}.mh-price strong{font-size:16px}.mh-buy{padding:10px;font-size:11px}.mh-section{margin:27px auto;border-radius:16px}.mh-section-head{padding:12px}.mh-section-content{padding:0 12px 12px}.mh-title-text strong{font-size:17px}.mh-title-text small{font-size:10px}.mh-section-icon{width:38px;height:38px;border-radius:11px}.mh-see{font-size:11px;padding:8px 9px}.mh-search button{padding:0 13px}.mh-filters{display:grid;grid-template-columns:1fr 1fr}.mh-filters select{width:100%;min-width:0}.mh-catalog-head{margin-top:35px}.mh-catalog-head h2{font-size:21px}.mh-mobile-filter{display:flex}}
      `}</style>

      <section className="mh-hero">
        <div>
          <span className="mh-eyebrow">PJD MARKET · MARKETPLACE</span>
          <h1>Achetez, vendez et développez votre activité.</h1>
          <p>
            Découvrez les produits numériques, physiques et services disponibles sur PJD Maker.
          </p>
          <form className="mh-search" onSubmit={submitSearch}>
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

      <CollapsibleSection
        icon={<TrendingUp size={20} />}
        title="Produits tendance"
        subtitle="Les produits qui attirent le plus d'intérêt"
        items={trending}
        onSeeAll={() => scrollToCatalog("all")}
        {...sectionProps}
      />

      <CollapsibleSection
        icon={<Zap size={20} />}
        title="Les plus populaires"
        subtitle="Basé sur les ventes et téléchargements"
        items={popular}
        onSeeAll={() => scrollToCatalog("all")}
        {...sectionProps}
      />

      <CollapsibleSection
        icon={<Package size={20} />}
        title="Produits physiques"
        subtitle="Mode, électronique, maison, beauté et autres produits"
        items={physical}
        onSeeAll={() => scrollToCatalog("physical")}
        {...sectionProps}
      />

      <CollapsibleSection
        icon={<BookOpen size={20} />}
        title="Produits numériques"
        subtitle="APK, PDF, e-books, formations, templates et fichiers"
        items={digital}
        onSeeAll={() => scrollToCatalog("digital")}
        {...sectionProps}
      />

      <CollapsibleSection
        icon={<Clock3 size={20} />}
        title="Nouveautés"
        subtitle="Les derniers produits publiés"
        items={newest}
        onSeeAll={() => {
          setSort("newest");
          document.getElementById("mh-catalog")?.scrollIntoView({ behavior: "smooth" });
        }}
        {...sectionProps}
      />

      <section id="mh-catalog">
        <div className="mh-catalog-head">
          <div>
            <span className="mh-eyebrow">CATALOGUE</span>
            <h2>Tous les produits <span className="mh-count">({filtered.length})</span></h2>
          </div>
          <button
            type="button"
            className="mh-filter-btn mh-mobile-filter"
            onClick={() => setShowFilters((value) => !value)}
          >
            <SlidersHorizontal size={16} /> Filtres
          </button>
        </div>

        <div className="mh-filters" style={{ display: showFilters || window.innerWidth > 760 ? undefined : "none" }}>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Type">
            <option value="all">Tous les types</option>
            <option value="physical">Produits physiques</option>
            <option value="digital">Produits numériques</option>
          </select>

          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Catégorie">
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "all" ? "Toutes les catégories" : item}
              </option>
            ))}
          </select>

          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Trier">
            <option value="popular">Trier : populaires</option>
            <option value="newest">Trier : nouveautés</option>
            <option value="price-low">Prix : croissant</option>
            <option value="price-high">Prix : décroissant</option>
          </select>

          <button type="button" className="mh-filter-btn" onClick={() => { setFilter("all"); setCategory("all"); setSort("popular"); setQuery(""); setSearch(""); }}>
            <Tag size={15} /> Réinitialiser
          </button>
        </div>

        {loading ? (
          <div className="mh-empty">Chargement des produits...</div>
        ) : (
          <div className="mh-grid">
            {filtered.length ? (
              filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onFavorite={toggleFavorite}
                  isFavorite={favorites.some((item) => item.id === product.id)}
                />
              ))
            ) : (
              <div className="mh-empty">Aucun produit ne correspond aux filtres.</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
