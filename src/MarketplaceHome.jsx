import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Heart, Download, Star, Package, BookOpen, Search, ShoppingCart,
  ChevronRight, Flame, Sparkles, Store, MapPin, ArrowLeft, Grid3X3,
  Shirt, Home, BriefcaseBusiness,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { getProductImageCandidates } from "./productImageUtils";
import "./product-image-fix.css";
import "./home-product-carousel.css";
import "./pjd-navigation-fix.css";

const ACTIVE = ["approved", "active", "actif"];
const money = (value) => Number(value || 0) === 0 ? "Gratuit" : `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
const isDigital = (p) => p?.product_type === "digital" || p?.source_type === "digital";

async function requireAccount(action, product) {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) return true;
  window.dispatchEvent(new CustomEvent("pjd-require-auth", { detail: { action, product } }));
  return false;
}

async function addToCart(product) {
  try {
    const cart = JSON.parse(localStorage.getItem("pjd-cart") || "[]");
    const item = { ...product, product_type: product.product_type || "physical", quantity: 1 };
    const key = `${item.product_type}-${item.id}`;
    const index = cart.findIndex((x) => `${x.product_type || "physical"}-${x.id}` === key);
    if (index >= 0) cart[index] = { ...cart[index], quantity: Number(cart[index].quantity || 1) + 1 };
    else cart.push(item);
    localStorage.setItem("pjd-cart", JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent("pjd-cart-updated", { detail: { product: item, cart } }));
    window.dispatchEvent(new CustomEvent("pjd-cart-notification", { detail: { product: item, cart, count: cart.reduce((n, x) => n + Number(x.quantity || 0), 0) } }));
  } catch (e) { console.error("PJD cart error", e); }
}

async function downloadFree(product) {
  if (!(await requireAccount("download", product))) return;
  if (!product?.file_url) return alert("Le fichier de ce produit gratuit n’est pas encore disponible.");
  try {
    const response = await fetch(product.file_url);
    if (!response.ok) throw new Error("download");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = product.title || "produit";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { window.open(product.file_url, "_blank", "noopener,noreferrer"); }
}

function ProductImage({ product }) {
  const candidates = getProductImageCandidates(product);
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState([]);
  const safeCandidates = candidates.filter((src) => !failed.includes(src));
  const currentIndex = Math.min(selected, Math.max(0, safeCandidates.length - 1));
  const src = safeCandidates[currentIndex];

  useEffect(() => {
    setSelected(0);
    setFailed([]);
  }, [product?.id]);

  const handleError = () => {
    if (src) setFailed((prev) => prev.includes(src) ? prev : [...prev, src]);
  };

  if (!src) return <div className="mh-image-placeholder">{isDigital(product) ? <BookOpen size={54}/> : <Package size={54}/>}<span>Photo indisponible</span></div>;

  return <div className="mh-image-gallery">
    <div className="mh-image-frame">
      <img className="mh-product-image" src={src} alt={product.title || "Photo du produit"} loading="lazy" decoding="async" onError={handleError} />
    </div>
    {safeCandidates.length > 1 && <div className="mh-image-thumbs" aria-label="Photos du produit">
      {safeCandidates.map((image, index) => <button key={`${image}-${index}`} type="button" className={`mh-image-thumb ${index === currentIndex ? "active" : ""}`} onClick={(e) => { e.stopPropagation(); setSelected(index); }} aria-label={`Voir la photo ${index + 1}`}>
        <img src={image} alt="" loading="lazy" decoding="async" onError={() => setFailed((prev) => prev.includes(image) ? prev : [...prev, image])} />
      </button>)}
    </div>}
  </div>;
}

function ProductCard({ product, isFavorite, onFavorite }) {
  const digital = isDigital(product);
  const free = digital && (Boolean(product?.is_free) || Number(product?.price || 0) === 0);
  return <article className="product-card mh-product-card" data-pjd-product-id={product.id}>
    <div className="mh-art"><ProductImage product={product}/><span className="mh-type">{digital ? "NUMÉRIQUE" : "PHYSIQUE"}</span>{Number(product.promo_price) > 0 && Number(product.promo_price) < Number(product.price) && <span className="mh-sale">PROMO</span>}<button type="button" className={`mh-heart ${isFavorite ? "active" : ""}`} aria-label="Favori" onClick={(e) => { e.stopPropagation(); onFavorite(product); }}><Heart size={17} fill={isFavorite ? "currentColor" : "none"}/></button></div>
    <div className="mh-body"><span className="mh-cat">{product.category || (digital ? "Numérique" : "Produit physique")}</span><h3>{product.title}</h3><p>{product.description || "Découvrez ce produit sur PJD Market."}</p><div className="mh-rating"><Star size={14} fill="currentColor"/>4.8<span>{Number(product.sales || 0)} vente{Number(product.sales || 0) > 1 ? "s" : ""}</span></div>{!digital && <div className="mh-stock">{Number(product.stock) > 0 ? `${product.stock} en stock` : "Stock disponible"}</div>}<div className="mh-price"><strong>{money(product.promo_price ?? product.price)}</strong>{product.promo_price != null && Number(product.promo_price) < Number(product.price) && <del>{money(product.price)}</del>}</div><button className="mh-buy" type="button" onClick={async (e) => { e.stopPropagation(); if (free) await downloadFree(product); else await addToCart({ ...product, product_type: digital ? "digital" : "physical" }); }}>{free ? <><Download size={16}/> Télécharger gratuitement</> : <><ShoppingCart size={16}/> Ajouter au panier</>}</button></div>
  </article>;
}

function ProductPhotoCarousel({ products, onOpenProduct }) {
  const viewportRef = useRef(null);
  const timerRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const items = useMemo(() => products.filter((p) => getProductImageCandidates(p).length > 0).slice(0, 12), [products]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || items.length < 2 || paused) return undefined;
    timerRef.current = window.setInterval(() => {
      const first = viewport.querySelector(".mh-carousel-card");
      const step = first ? first.getBoundingClientRect().width + 14 : viewport.clientWidth * 0.82;
      const max = viewport.scrollWidth - viewport.clientWidth;
      if (viewport.scrollLeft >= max - 4) viewport.scrollTo({ left: 0, behavior: "smooth" });
      else viewport.scrollBy({ left: step, behavior: "smooth" });
    }, 2800);
    return () => window.clearInterval(timerRef.current);
  }, [items.length, paused]);

  if (!items.length) return null;

  const scroll = (direction) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const card = viewport.querySelector(".mh-carousel-card");
    const step = card ? card.getBoundingClientRect().width + 14 : viewport.clientWidth * 0.82;
    viewport.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return <section className="mh-product-carousel" aria-label="Produits à découvrir" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    <div className="mh-carousel-head">
      <div><span className="mh-eyebrow">PJD MARKET</span><h2>🔥 PRODUITS PJD MARKET</h2><p>Les photos des produits défilent automatiquement.</p></div>
      <div className="mh-carousel-controls"><button type="button" aria-label="Produits précédents" onClick={() => scroll(-1)}><ArrowLeft size={18}/></button><button type="button" aria-label="Produits suivants" onClick={() => scroll(1)}><ChevronRight size={18}/></button></div>
    </div>
    <div className="mh-carousel-viewport" ref={viewportRef}>
      {items.map((product) => {
        const image = getProductImageCandidates(product)[0];
        const digital = isDigital(product);
        return <button key={`${product.product_type}-${product.id}`} type="button" className="mh-carousel-card" onClick={() => onOpenProduct(product)}>
          <div className="mh-carousel-card-image"><img src={image} alt={product.title || "Produit"} loading="eager" decoding="async" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}/><span>{digital ? "NUMÉRIQUE" : "PHYSIQUE"}</span></div>
          <div className="mh-carousel-card-info"><small>{product.category || (digital ? "Produit numérique" : "Produit physique")}</small><strong>{product.title || "Produit PJD Market"}</strong><b>{money(product.promo_price ?? product.price)}</b></div>
        </button>;
      })}
    </div>
  </section>;
}

function Section({ title, eyebrow, icon: Icon, products, favorites, onFavorite, onSeeAll, empty = "Aucun produit dans cette sélection." }) {
  return <section className="mh-section"><div className="mh-section-head"><div><span className="mh-eyebrow-dark">{Icon && <Icon size={14}/>} {eyebrow}</span><h2>{title}</h2></div><button className="mh-see" type="button" onClick={onSeeAll}>Voir tout <ChevronRight size={17}/></button></div>{products.length ? <div className="mh-grid">{products.slice(0, 8).map((p) => <ProductCard key={`${p.product_type}-${p.id}`} product={p} onFavorite={onFavorite} isFavorite={favorites.some((f) => f.id === p.id && f.product_type === p.product_type)}/>)}</div> : <div className="mh-empty">{empty}</div>}</section>;
}

function ShopsSection({ shops, onOpenShop, onOpenAllShops }) {
  if (!shops.length) return null;
  return <section className="mh-section mh-shops-section"><div className="mh-section-head"><div><span className="mh-eyebrow-dark"><Store size={14}/> BOUTIQUES</span><h2>Meilleures boutiques</h2></div><button type="button" className="mh-see" onClick={onOpenAllShops}><Store size={17}/> Voir les boutiques <ChevronRight size={17}/></button></div><div className="mh-shops-grid">{shops.slice(0, 6).map((shop) => <button className="mh-shop-card" key={shop.id} type="button" onClick={() => onOpenShop(shop.id)}><div className="mh-shop-cover" style={shop.banner ? {backgroundImage:`url(${shop.banner})`} : undefined}/><div className="mh-shop-logo">{shop.logo ? <img src={shop.logo} alt=""/> : <Store size={24}/>}</div><div className="mh-shop-info"><strong>{shop.shop_name}</strong><span>{shop.category || "Boutique"}</span><small><Star size={13} fill="currentColor"/> {Number(shop.rating || 0).toFixed(1)} · {Number(shop.followers_count || 0)} abonnés</small>{shop.city && <small><MapPin size={13}/> {shop.city}</small>}</div></button>)}</div></section>;
}

const categoryDefs = [
  { id:"all", label:"Tous les produits", icon:Grid3X3 },
  { id:"physical", label:"Produits physiques", icon:Package },
  { id:"digital", label:"Produits numériques", icon:BookOpen },
  { id:"tendance", label:"Tendances", icon:Flame },
  { id:"mode", label:"Mode", icon:Shirt },
  { id:"maison", label:"Maison", icon:Home },
  { id:"services", label:"Services", icon:BriefcaseBusiness },
];

export default function MarketplaceHome() {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [page, setPage] = useState("home");
  const [categoryTitle, setCategoryTitle] = useState("Tous les produits");
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem("pjd-favorites") || "[]"); } catch { return []; } });

  useEffect(() => { loadProducts(); loadShops(); const channel = supabase.channel("marketplace-products-home-v16").on("postgres_changes", {event:"*",schema:"public",table:"digital_products"}, loadProducts).on("postgres_changes", {event:"*",schema:"public",table:"marketplace_products"}, loadProducts).subscribe(); return () => supabase.removeChannel(channel); }, []);
  useEffect(() => { localStorage.setItem("pjd-favorites", JSON.stringify(favorites)); }, [favorites]);

  async function loadProducts() {
    setLoading(true);
    const [d, p] = await Promise.all([
      supabase.from("digital_products").select("id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,image_url,file_type,file_url,is_free,downloads,sales,stock,status,created_at,source_type").in("status", ACTIVE).order("created_at", {ascending:false}),
      supabase.from("marketplace_products").select("id,seller_id,shop_id,title,description,category,price,stock,images,status,created_at,updated_at").in("status", ACTIVE).order("created_at", {ascending:false}),
    ]);

    const digital = (d.data || []).map((x) => ({
      ...x,
      product_type: x.source_type === "physical" ? "physical" : "digital",
      source_type: x.source_type || "digital",
    }));
    const physical = (p.data || []).map((x) => ({...x, product_type:"physical", source_type:"physical", cover_image:x.images?.[0] || null}));
    setProducts([...digital, ...physical].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)));
    setLoading(false);
  }
  async function loadShops() { const { data } = await supabase.from("shops").select("id,shop_name,logo,banner,category,rating,followers_count,city,status").order("created_at", {ascending:false}).limit(12); setShops(data || []); }

  const physical = useMemo(() => products.filter((p) => !isDigital(p)), [products]);
  const digital = useMemo(() => products.filter(isDigital), [products]);
  const trending = useMemo(() => [...products].sort((a,b) => (Number(b.sales||0)*4+Number(b.downloads||0))-(Number(a.sales||0)*4+Number(a.downloads||0))), [products]);
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products;
    if (activeFilter === "physical") list = physical;
    if (activeFilter === "digital") list = digital;
    if (activeFilter === "tendance") list = trending;
    if (!["all","physical","digital","tendance"].includes(activeFilter)) list = products.filter((p) => String(p.category || "").toLowerCase().includes(activeFilter));
    if (q) list = list.filter((p) => `${p.title} ${p.description || ""} ${p.category || ""}`.toLowerCase().includes(q));
    if (sort === "price-asc") list = [...list].sort((a,b) => Number(a.promo_price ?? a.price)-Number(b.promo_price ?? b.price));
    if (sort === "price-desc") list = [...list].sort((a,b) => Number(b.promo_price ?? b.price)-Number(a.promo_price ?? a.price));
    if (sort === "newest") list = [...list].sort((a,b) => new Date(b.created_at||0)-new Date(a.created_at||0));
    return list;
  }, [products, physical, digital, trending, activeFilter, search, sort]);

  const openCategory = (filter, title) => { setActiveFilter(filter); setCategoryTitle(title); setPage("category"); setSearch(""); window.scrollTo({top:0, behavior:"smooth"}); };
  const openHome = () => { setPage("home"); setActiveFilter("all"); setSearch(""); window.scrollTo({top:0, behavior:"smooth"}); };
  const favorite = (p) => setFavorites((prev) => prev.some((x) => x.id===p.id && x.product_type===p.product_type) ? prev.filter((x)=>!(x.id===p.id && x.product_type===p.product_type)) : [...prev, p]);
  const openProduct = (product) => window.dispatchEvent(new CustomEvent("pjd-open-product", { detail: { product, productId: product.id, productType: product.product_type } }));
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };
  const openAllShops = () => { const url = `${window.location.origin}${window.location.pathname}?pjd_shops_window=1`; window.open(url, "pjd-market-boutiques", "noopener,noreferrer"); };

  if (page === "category") return <main className="marketplace-home mh-category-page">
    <section className="mh-category-toolbar"><button type="button" className="mh-back" onClick={openHome}><ArrowLeft size={18}/> Accueil</button><div><span className="mh-eyebrow-dark"><Grid3X3 size={14}/> CATALOGUE</span><h1>{categoryTitle}</h1><p>{searched.length} produit{searched.length > 1 ? "s" : ""} disponible{searched.length > 1 ? "s" : ""} sur PJD Market</p></div></section>
    <div className="mh-category-tabs">{categoryDefs.map((c) => { const Icon=c.icon; return <button key={c.id} type="button" className={activeFilter===c.id ? "active" : ""} onClick={() => openCategory(c.id,c.label)}><Icon size={17}/>{c.label}</button>; })}</div>
    <section className="mh-section mh-all-products-section"><div className="mh-section-head"><div><span className="mh-eyebrow-dark"><Package size={14}/> PRODUITS DISPONIBLES</span><h2>{categoryTitle}</h2></div><span className="mh-count">{searched.length} résultat{searched.length>1?"s":""}</span></div>
      <div className="mh-category-tools"><label><Search size={16}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Rechercher dans cette catégorie…"/></label><select value={sort} onChange={(e)=>setSort(e.target.value)}><option value="relevance">Pertinence</option><option value="newest">Plus récents</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option></select></div>
      {loading ? <div className="mh-empty">Chargement des produits…</div> : searched.length ? <div className="mh-grid">{searched.map((p)=><ProductCard key={`${p.product_type}-${p.id}`} product={p} onFavorite={favorite} isFavorite={favorites.some((f)=>f.id===p.id&&f.product_type===p.product_type)}/>)}</div> : <div className="mh-empty">Aucun produit disponible dans cette catégorie.</div>}
    </section>
  </main>;

  return <main className="marketplace-home">
    <section className="mh-hero"><div className="mh-hero-copy"><span className="mh-eyebrow"><Sparkles size={15}/> PJD MARKET</span><h1>Tout ce dont vous avez besoin,<br/><em>au même endroit.</em></h1><p>Découvrez les produits physiques et numériques proposés par les vendeurs de PJD Market.</p><div className="mh-search"><Search size={19}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Rechercher un produit, une catégorie…"/><button type="button" onClick={()=>openCategory("all","Tous les produits")}>Rechercher</button></div><div className="mh-hero-actions"><button type="button" onClick={()=>openCategory("physical","Produits physiques")}><Package size={16}/> Produits physiques</button><button type="button" onClick={()=>openCategory("digital","Produits numériques")}><BookOpen size={16}/> Produits numériques</button><button type="button" onClick={()=>openCategory("tendance","Tendances")}><Flame size={16}/> Tendances</button><button type="button" onClick={openAllShops}><Store size={16}/> Boutiques</button></div></div></section>
    <section className="mh-category-strip"><div className="mh-section-head"><div><span className="mh-eyebrow-dark"><Grid3X3 size={14}/> CATÉGORIES</span><h2>Explorez par catégorie</h2></div><button type="button" className="mh-see" onClick={()=>openCategory("all","Tous les produits")}>Voir tout <ChevronRight size={17}/></button></div><div className="mh-category-grid">{categoryDefs.slice(1).map((c)=>{const Icon=c.icon;return <button type="button" key={c.id} onClick={()=>openCategory(c.id,c.label)}><Icon size={22}/><span>{c.label}</span><ChevronRight size={16}/></button>})}</div></section>
    {loading ? <div className="mh-empty">Chargement des produits…</div> : <><Section title="Tendances" eyebrow="EN CE MOMENT" icon={Flame} products={trending} favorites={favorites} onFavorite={favorite} onSeeAll={()=>openCategory("tendance","Tendances")}/><Section title="Produits numériques" eyebrow="DIGITAL" icon={BookOpen} products={digital} favorites={favorites} onFavorite={favorite} onSeeAll={()=>openCategory("digital","Produits numériques")}/><Section title="Produits physiques" eyebrow="BOUTIQUES" icon={Package} products={physical} favorites={favorites} onFavorite={favorite} onSeeAll={()=>openCategory("physical","Produits physiques")}/><ProductPhotoCarousel products={products} onOpenProduct={openProduct}/><ShopsSection shops={shops} onOpenShop={(id)=>window.dispatchEvent(new CustomEvent("pjd-open-shop", {detail:{shopId:id}}))} onOpenAllShops={openAllShops}/></>}
  </main>;
}