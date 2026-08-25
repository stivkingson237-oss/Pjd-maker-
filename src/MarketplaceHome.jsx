import React, { useEffect, useMemo, useState } from "react";
import { Heart, Download, Star, Package, BookOpen, Search, ShoppingCart, ChevronRight, SlidersHorizontal, Flame, Sparkles, Tag, Store, X } from "lucide-react";
import { supabase } from "./lib/supabase";

const ACTIVE = ["approved", "active", "actif"];
const PHYSICAL_RE = /mode|électronique|maison|beauté|alimentation|accessoire|chaussure|vêtement|meuble|matériel|physique/i;
const money = (v) => Number(v || 0) === 0 ? "Gratuit" : `${Number(v || 0).toLocaleString("fr-FR")} FCFA`;
const isDigital = (p) => Boolean(p?.file_url || p?.file_type) && !PHYSICAL_RE.test(`${p?.category || ""} ${p?.title || ""}`);
const score = (p) => Number(p?.sales || 0) * 4 + Number(p?.downloads || 0) + (Number(p?.is_free) ? 1 : 0);

async function downloadFree(product) {
  if (!product?.file_url) return alert("Le fichier de ce produit gratuit n’est pas encore disponible.");
  try {
    const response = await fetch(product.file_url);
    if (!response.ok) throw new Error("download");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = product.title || "produit";
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch { window.open(product.file_url, "_blank", "noopener,noreferrer"); }
}

function ProductCard({ product, isFavorite, onFavorite, compact = false }) {
  const digital = isDigital(product); const free = Boolean(product?.is_free) || Number(product?.price || 0) === 0;
  return <article className={`product-card mh-product-card ${compact ? "mh-compact" : ""}`}>
    <div className="mh-art">
      {product.cover_image || product.image_url ? <img src={product.cover_image || product.image_url} alt={product.title || "Produit"} loading="lazy" /> : digital ? <BookOpen size={46} /> : <Package size={46} />}
      <span className="mh-type">{digital ? "NUMÉRIQUE" : "PHYSIQUE"}</span>
      {Number(product.promo_price) > 0 && Number(product.promo_price) < Number(product.price) && <span className="mh-sale">PROMO</span>}
      <button type="button" className={`mh-heart ${isFavorite ? "active" : ""}`} aria-label="Favori" onClick={(e) => { e.stopPropagation(); onFavorite(product); }}><Heart size={17} fill={isFavorite ? "currentColor" : "none"} /></button>
    </div>
    <div className="mh-body">
      <span className="mh-cat">{product.category || (digital ? "Numérique" : "Produit")}</span>
      <h3>{product.title}</h3>
      {!compact && <p>{product.description || "Découvrez ce produit sur PJD Maker."}</p>}
      <div className="mh-rating"><Star size={14} fill="currentColor" /> 4.8 <span>{Number(product.sales || 0)} vente{Number(product.sales || 0) > 1 ? "s" : ""}</span></div>
      <div className="mh-price"><strong>{money(product.promo_price ?? product.price)}</strong>{product.promo_price != null && Number(product.promo_price) < Number(product.price) && <del>{money(product.price)}</del>}</div>
      {free && digital ? <button className="mh-buy" type="button" onClick={() => downloadFree(product)}><Download size={16} /> Télécharger gratuitement</button> : <button className="mh-buy" type="button" onClick={() => document.dispatchEvent(new CustomEvent("pjd-add-to-cart", { detail: product }))}><ShoppingCart size={16} /> Ajouter au panier</button>}
    </div>
  </article>;
}

function Section({ title, eyebrow, icon: Icon, products, favorites, onFavorite, empty = "Aucun produit dans cette sélection." }) {
  return <section className="mh-section"><div className="mh-section-head"><div><span className="mh-eyebrow-dark">{Icon && <Icon size={14} />} {eyebrow}</span><h2>{title}</h2></div><span className="mh-see">Voir tout <ChevronRight size={17} /></span></div>{products.length ? <div className="mh-grid">{products.slice(0, 8).map(p => <ProductCard key={p.id} product={p} onFavorite={onFavorite} isFavorite={favorites.some(f => f.id === p.id)} />)}</div> : <div className="mh-empty">{empty}</div>}</section>;
}

export default function MarketplaceHome() {
  const [products, setProducts] = useState([]), [loading, setLoading] = useState(true), [search, setSearch] = useState(""), [activeFilter, setActiveFilter] = useState("all"), [showFilters, setShowFilters] = useState(false), [sort, setSort] = useState("relevance");
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem("pjd-favorites") || "[]"); } catch { return []; } });

  useEffect(() => { loadProducts(); const channel = supabase.channel("marketplace-products-home-v2").on("postgres_changes", { event: "*", schema: "public", table: "digital_products" }, loadProducts).subscribe(); return () => supabase.removeChannel(channel); }, []);
  useEffect(() => localStorage.setItem("pjd-favorites", JSON.stringify(favorites)), [favorites]);

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase.from("digital_products").select("id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,image_url,file_type,file_url,preview_url,is_free,downloads,sales,stock,status,created_at").in("status", ACTIVE).order("created_at", { ascending: false });
    setProducts(error ? [] : data || []); setLoading(false);
  }
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].slice(0, 10), [products]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase(); let list = products.filter(p => `${p.title || ""} ${p.description || ""} ${p.category || ""}`.toLowerCase().includes(term));
    if (activeFilter === "digital") list = list.filter(isDigital); if (activeFilter === "physical") list = list.filter(p => !isDigital(p)); if (activeFilter === "free") list = list.filter(p => Boolean(p.is_free) || Number(p.price || 0) === 0); if (activeFilter === "promo") list = list.filter(p => Number(p.promo_price) > 0 && Number(p.promo_price) < Number(p.price));
    if (sort === "price-asc") list.sort((a,b) => Number(a.promo_price ?? a.price)-Number(b.promo_price ?? b.price)); if (sort === "price-desc") list.sort((a,b) => Number(b.promo_price ?? b.price)-Number(a.promo_price ?? a.price)); if (sort === "popular") list.sort((a,b) => score(b)-score(a));
    return list;
  }, [products, search, activeFilter, sort]);
  const trending = useMemo(() => [...filtered].sort((a,b) => score(b)-score(a)), [filtered]);
  const newest = useMemo(() => [...filtered].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)), [filtered]);
  const physical = useMemo(() => filtered.filter(p => !isDigital(p)), [filtered]);
  const digital = useMemo(() => filtered.filter(isDigital), [filtered]);
  const popular = useMemo(() => [...filtered].sort((a,b) => Number(b.sales||0)-Number(a.sales||0)), [filtered]);
  const free = useMemo(() => filtered.filter(p => Boolean(p.is_free) || Number(p.price||0)===0), [filtered]);
  const promo = useMemo(() => filtered.filter(p => Number(p.promo_price)>0 && Number(p.promo_price)<Number(p.price)), [filtered]);
  function toggleFavorite(p) { setFavorites(c => c.some(x => x.id === p.id) ? c.filter(x => x.id !== p.id) : [...c, p]); }
  const filter = (id) => setActiveFilter(id);

  return <div className="mh-page">
    <section className="mh-hero"><div className="mh-hero-inner"><div className="mh-hero-copy"><span className="mh-eyebrow">PJD MAKER · MARKETPLACE</span><h1>Tout ce dont vous avez besoin, <em>au même endroit.</em></h1><p>Découvrez les produits tendance, les meilleures ventes, les nouveautés et les produits numériques de vendeurs vérifiés.</p><form className="mh-search" onSubmit={e => e.preventDefault()}><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit, une boutique, un service..."/><button type="submit">Rechercher</button></form><div className="mh-hero-badges"><span>🔒 Paiement sécurisé</span><span>🚚 Livraison</span><span>✓ Vendeurs vérifiés</span></div></div><div className="mh-hero-card"><Flame size={28}/><strong>{products.length}</strong><span>produits disponibles</span><small>Mis à jour automatiquement</small></div></div></section>
    <nav className="mh-category-bar"><button className={activeFilter==="all"?"active":""} onClick={()=>filter("all")}>Tout</button><button className={activeFilter==="digital"?"active":""} onClick={()=>filter("digital")}>Produits numériques</button><button className={activeFilter==="physical"?"active":""} onClick={()=>filter("physical")}>Produits physiques</button><button className={activeFilter==="free"?"active":""} onClick={()=>filter("free")}>Gratuits</button><button className={activeFilter==="promo"?"active":""} onClick={()=>filter("promo")}>Promotions</button>{categories.map(c=><button key={c} onClick={()=>setSearch(c)}>{c}</button>)}</nav>
    <main className="mh-main">
      <div className="mh-toolbar"><div><span className="mh-eyebrow-dark">CATALOGUE</span><h2>Découvrez nos produits</h2><p>{filtered.length} résultat{filtered.length>1?"s":""}</p></div><div className="mh-actions"><button onClick={()=>setShowFilters(!showFilters)}><SlidersHorizontal size={16}/> Filtres</button><select value={sort} onChange={e=>setSort(e.target.value)}><option value="relevance">Pertinence</option><option value="popular">Plus populaires</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option></select></div></div>
      {showFilters && <div className="mh-filter-panel"><button onClick={()=>setActiveFilter("all")}>Tous</button><button onClick={()=>setActiveFilter("digital")}>Numériques</button><button onClick={()=>setActiveFilter("physical")}>Physiques</button><button onClick={()=>setActiveFilter("free")}>Gratuits</button><button onClick={()=>setActiveFilter("promo")}>Promotions</button><button className="mh-close" onClick={()=>setShowFilters(false)}><X size={16}/></button></div>}
      {loading ? <div className="mh-empty">Chargement des produits...</div> : <>{!search && activeFilter==="all" && <Section eyebrow="TENDANCE" title="Tendance" icon={Flame} products={trending} favorites={favorites} onFavorite={toggleFavorite}/>}<Section eyebrow="PLUS POPULAIRES" title="Plus populaires" icon={Star} products={popular} favorites={favorites} onFavorite={toggleFavorite}/><Section eyebrow="NOUVEAUTÉS" title="Nouveautés" icon={Sparkles} products={newest} favorites={favorites} onFavorite={toggleFavorite}/><Section eyebrow="PRODUITS PHYSIQUES" title="Produits physiques" icon={Package} products={physical} favorites={favorites} onFavorite={toggleFavorite}/><Section eyebrow="PRODUITS NUMÉRIQUES" title="Produits numériques" icon={BookOpen} products={digital} favorites={favorites} onFavorite={toggleFavorite}/>{promo.length>0 && <Section eyebrow="OFFRES" title="Promotions" icon={Tag} products={promo} favorites={favorites} onFavorite={toggleFavorite}/>}<Section eyebrow="GRATUITS" title="Produits gratuits" icon={Download} products={free} favorites={favorites} onFavorite={toggleFavorite}/>{search && <Section eyebrow="RECHERCHE" title={`Résultats pour « ${search} »`} icon={Search} products={filtered} favorites={favorites} onFavorite={toggleFavorite}/>}</>}
      <section className="mh-seller-cta"><div><span className="mh-eyebrow">VENDEURS</span><h2>Vous avez quelque chose à vendre ?</h2><p>Créez votre boutique, publiez vos produits et développez votre activité avec PJD Maker.</p></div><button onClick={()=>document.dispatchEvent(new CustomEvent("pjd-open-seller"))}><Store size={17}/> Commencer à vendre</button></section>
    </main>
  </div>;
}
