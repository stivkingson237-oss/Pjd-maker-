import { supabase } from "./lib/supabase";
import "./pjd-product-price-ticker.css";

const ACTIVE = ["approved", "active", "actif"];
const money = (value) => Number(value || 0) === 0 ? "Gratuit" : `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;

let mounted = false;
let products = [];

function imageOf(product) {
  const value = product?.images?.[0] || product?.cover_image || product?.image_url;
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const base = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  return base ? `${base}/storage/v1/object/public/public-assets/${String(value).replace(/^\/+/, "")}` : String(value);
}

function priceOf(product) {
  const price = product?.promo_price != null && Number(product.promo_price) < Number(product.price) ? product.promo_price : product?.price;
  return money(price);
}

function mount(productsToShow) {
  if (mounted || !productsToShow.length) return;
  const input = Array.from(document.querySelectorAll("input")).find((el) => /rechercher/i.test(el.placeholder || ""));
  if (!input) return;

  const anchor = input.closest("form") || input.parentElement;
  if (!anchor || !anchor.parentElement) return;

  const panel = document.createElement("section");
  panel.className = "pjd-price-ticker";
  panel.setAttribute("aria-label", "Produits PJD Market");
  panel.innerHTML = `<div class="pjd-price-ticker-head"><div><span>🔥 PRODUITS PJD MARKET</span><strong>Découvrez les offres disponibles</strong></div><small>Défilement automatique</small></div><div class="pjd-price-ticker-viewport"><div class="pjd-price-ticker-track"></div></div>`;
  anchor.parentElement.insertBefore(panel, anchor.nextSibling);

  const track = panel.querySelector(".pjd-price-ticker-track");
  const cards = productsToShow.slice(0, 16).map((product) => {
    const image = imageOf(product);
    const digital = product.product_type === "digital";
    const card = document.createElement("article");
    card.className = "pjd-price-ticker-card";
    card.innerHTML = `${image ? `<img src="${image}" alt="" loading="lazy">` : `<div class="pjd-price-ticker-placeholder">${digital ? "📘" : "📦"}</div>`}<div class="pjd-price-ticker-info"><span>${digital ? "NUMÉRIQUE" : "PHYSIQUE"}</span><strong>${product.title || "Produit PJD Market"}</strong><b>${priceOf(product)}</b></div>`;
    return card;
  });
  cards.forEach((card) => track.appendChild(card));
  cards.forEach((card) => track.appendChild(card.cloneNode(true)));
  mounted = true;
}

async function loadTickerProducts() {
  const [digitalResult, physicalResult] = await Promise.all([
    supabase.from("digital_products").select("id,title,price,promo_price,cover_image,image_url,status,created_at").in("status", ACTIVE).order("created_at", { ascending: false }).limit(16),
    supabase.from("marketplace_products").select("id,title,price,images,status,created_at").in("status", ACTIVE).order("created_at", { ascending: false }).limit(16),
  ]);
  const digital = (digitalResult.data || []).map((x) => ({ ...x, product_type: "digital" }));
  const physical = (physicalResult.data || []).map((x) => ({ ...x, product_type: "physical" }));
  products = [...digital, ...physical].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  mount(products);
}

function boot() {
  if (mounted) return;
  loadTickerProducts().catch((error) => console.warn("PJD price ticker", error));
}

if (typeof window !== "undefined") {
  const observer = new MutationObserver(() => {
    if (!mounted) boot();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}
