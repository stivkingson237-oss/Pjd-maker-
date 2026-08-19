import React, { useState } from "react";
import { Search, ShoppingCart, User, Menu, X, ChevronRight, Star, Heart, Download, ShieldCheck, Zap, Smartphone, BookOpen, Code2, GraduationCap, Palette, FileText, TrendingUp, Store, Package, BarChart3, Settings, Bell, MessageSquare, LogOut } from "lucide-react";
import "./marketplace.css";

const categories = [
  [Code2, "Applications & APK", "Développement"],
  [BookOpen, "E-books & PDF", "Livres numériques"],
  [GraduationCap, "Formations", "Apprendre en ligne"],
  [Palette, "Design & Création", "Ressources créatives"],
  [Smartphone, "Templates", "Sites & applications"],
  [FileText, "Documents", "Fichiers professionnels"],
];
const products = [
  { title: "Pack Business Pro", cat: "Templates", price: "15 000 FCFA", old: "25 000 FCFA", badge: "-40%", icon: Store },
  { title: "Formation Marketing Digital", cat: "Formations", price: "10 000 FCFA", old: "18 000 FCFA", badge: "Populaire", icon: GraduationCap },
  { title: "Kit Applications Android", cat: "Applications & APK", price: "25 000 FCFA", old: "35 000 FCFA", badge: "Nouveau", icon: Smartphone },
  { title: "Collection E-books Business", cat: "E-books & PDF", price: "7 500 FCFA", old: "12 000 FCFA", badge: "-37%", icon: BookOpen },
  { title: "UI Kit Marketplace", cat: "Design & Création", price: "12 500 FCFA", old: "20 000 FCFA", badge: "Top vente", icon: Palette },
  { title: "Pack Documents Pro", cat: "Documents", price: "5 000 FCFA", old: "8 000 FCFA", badge: "Nouveau", icon: FileText },
];

function ProductCard({ p }) {
  const Icon = p.icon;
  return <article className="product-card">
    <div className="product-art"><span className="product-badge">{p.badge}</span><button className="wish"><Heart size={18}/></button><Icon size={54}/></div>
    <div className="product-body"><div className="product-cat">{p.cat}</div><h3>{p.title}</h3><div className="rating"><Star size={15} fill="currentColor"/> 4.8 <span>(124)</span></div><div className="price"><strong>{p.price}</strong><del>{p.old}</del></div><button className="add"><ShoppingCart size={17}/> Ajouter au panier</button></div>
  </article>;
}

export default function MarketplaceShell() {
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("Accueil");
  const nav = ["Accueil", "Catalogue", "Formations", "Applications", "E-books", "Promotions"];
  return <div className="marketplace">
    <div className="topbar"><div>Livraison numérique instantanée · Paiement sécurisé</div><div className="toplinks"><span>Devenir vendeur</span><span>Aide</span><span>Français</span></div></div>
    <header className="header">
      <button className="mobile-menu" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button>
      <div className="brand"><span className="brand-mark">M</span><span>MARKET<span className="brand-dot">.</span></span></div>
      <div className="search"><Search size={20}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un produit, une formation..."/><button>Rechercher</button></div>
      <div className="actions"><button className="icon-btn"><Heart/><span>0</span></button><button className="icon-btn"><ShoppingCart/><span>0</span></button><button className="account"><User size={19}/><span>Mon compte</span></button></div>
    </header>
    <nav className={"nav " + (menu?"open":"")}>{nav.map(n=><button key={n} className={view===n?"active":""} onClick={()=>{setView(n);setMenu(false)}}>{n}</button>)}<button className="nav-promo">Offres du moment <Zap size={15}/></button></nav>

    {view === "Accueil" ? <>
      <main>
        <section className="hero"><div className="hero-copy"><span className="eyebrow">LA MARKETPLACE DIGITALE</span><h1>Tout ce qu’il vous faut.<br/><em>Au même endroit.</em></h1><p>Applications, formations, e-books, templates et ressources numériques sélectionnés pour vous aider à avancer plus vite.</p><div className="hero-buttons"><button className="primary" onClick={()=>setView("Catalogue")}>Explorer le catalogue <ChevronRight size={18}/></button><button className="secondary">Découvrir les nouveautés</button></div><div className="trust"><span><ShieldCheck/> Paiement sécurisé</span><span><Download/> Téléchargement immédiat</span></div></div><div className="hero-panel"><div className="hero-orb">M</div><div className="floating-card card-one"><TrendingUp/> <div><b>+2 500</b><small>produits disponibles</small></div></div><div className="floating-card card-two"><Star fill="currentColor"/> <div><b>4.9/5</b><small>avis clients</small></div></div></div></section>
        <section className="section"><div className="section-head"><div><span className="eyebrow">EXPLOREZ</span><h2>Catégories populaires</h2></div><button className="see-all" onClick={()=>setView("Catalogue")}>Voir toutes <ChevronRight size={17}/></button></div><div className="categories">{categories.map(([Icon,title,sub])=><button className="category" key={title}><span className="cat-icon"><Icon/></span><div><b>{title}</b><small>{sub}</small></div><ChevronRight/></button>)}</div></section>
        <section className="section muted"><div className="section-head"><div><span className="eyebrow">SÉLECTION</span><h2>Produits tendance</h2></div><button className="see-all" onClick={()=>setView("Catalogue")}>Tout voir <ChevronRight size={17}/></button></div><div className="products">{products.map(p=><ProductCard key={p.title} p={p}/>)}</div></section>
        <section className="seller-cta"><div><span className="eyebrow">POUR LES CRÉATEURS</span><h2>Transformez vos compétences en revenus.</h2><p>Publiez vos produits numériques, développez votre audience et suivez vos ventes depuis votre espace vendeur.</p><button className="primary">Commencer à vendre <ChevronRight size={18}/></button></div><div className="seller-stats"><div><strong>0%</strong><span>Frais de mise en ligne</span></div><div><strong>24/7</strong><span>Votre boutique active</span></div><div><strong>100%</strong><span>Digital & instantané</span></div></div></section>
      </main>
    </> : <main><section className="page-title"><span className="eyebrow">MARKETPLACE</span><h1>{view}</h1><p>Découvrez notre sélection de ressources numériques.</p></section><section className="catalog-layout"><aside className="filters"><b>Filtrer</b><label>Catégorie</label>{categories.slice(0,5).map(([,t])=><button key={t}>{t}</button>)}<label>Prix</label><button>Moins de 10 000 FCFA</button><button>10 000 – 25 000 FCFA</button><button>Plus de 25 000 FCFA</button></aside><div className="catalog-products"><div className="catalog-tools"><span>{products.length} produits</span><select><option>Trier : Pertinence</option><option>Prix croissant</option><option>Plus populaires</option></select></div><div className="products">{products.map(p=><ProductCard key={p.title} p={p}/>)}</div></div></section></main>}

    <footer><div className="footer-grid"><div><div className="brand footer-brand"><span className="brand-mark">M</span><span>MARKET<span className="brand-dot">.</span></span></div><p>La marketplace moderne pour vos ressources numériques.</p></div><div><b>Marketplace</b><span>Catalogue</span><span>Catégories</span><span>Promotions</span></div><div><b>Vendeurs</b><span>Devenir vendeur</span><span>Espace vendeur</span><span>Centre d'aide</span></div><div><b>Support</b><span>Contact</span><span>FAQ</span><span>Conditions</span></div></div><div className="footer-bottom">© 2026 Marketplace · Tous droits réservés <span>Paiement sécurisé · Téléchargement instantané</span></div></footer>
  </div>;
}
