import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Menu,
  X,
  ChevronRight,
  Star,
  Download,
  ShieldCheck,
  Zap,
  Store,
  LogIn,
  LogOut,
  Mail,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Share2,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";

import { supabase } from "./lib/supabase";
import "./marketplace.css";
import "./payment.css";

const nav = [
  "Accueil",
  "Catalogue",
  "Produits physiques",
  "Produits numériques",
  "Services",
  "Promotions",
];

const money = (value) =>
  Number(value || 0) === 0
    ? "Gratuit"
    : `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;

/* =========================================================
   PRODUIT GRATUIT
========================================================= */

async function downloadFreeProduct(product) {
  if (!product?.file_url) {
    alert("Le fichier de ce produit gratuit n’est pas encore disponible.");
    return;
  }

  try {
    const response = await fetch(product.file_url);

    if (!response.ok) {
      throw new Error("Téléchargement impossible");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = product.title || "produit-gratuit";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(product.file_url, "_blank", "noopener,noreferrer");
  }
}

/* =========================================================
   BADGE
========================================================= */

function Badge({ count }) {
  if (!count) return null;

  return (
    <span className="icon-badge">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
  p,
  onAdd,
  onFavorite,
  isFavorite,
}) {
  const [downloading, setDownloading] = useState(false);

  const free =
    Boolean(p.is_free) ||
    Number(p.price || 0) === 0;

  async function handleDownload() {
    setDownloading(true);

    await downloadFreeProduct(p);

    setDownloading(false);
  }

  return (
    <article className="product-card">
      <div className="product-art">
        {p.cover_image ? (
          <img
            src={p.cover_image}
            alt=""
            loading="lazy"
          />
        ) : (
          <Store size={54} />
        )}

        <button
          type="button"
          className={`wish ${isFavorite ? "active" : ""}`}
          aria-label={
            isFavorite
              ? "Retirer des favoris"
              : "Ajouter aux favoris"
          }
          aria-pressed={isFavorite}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite(p);
          }}
        >
          <Heart
            size={18}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className="product-body">
        <div className="product-cat">
          {p.category || "Produit"}
        </div>

        <h3>{p.title}</h3>

        <p className="product-description">
          {p.description ||
            "Découvrez ce produit et son contenu avant de télécharger ou d’acheter."}
        </p>

        <div className="rating">
          <Star size={15} fill="currentColor" />
          4.8
          <span>Vendeur vérifié</span>
        </div>

        <div className="price">
          <strong>
            {money(p.promo_price ?? p.price)}
          </strong>

          {p.promo_price != null &&
            Number(p.promo_price) <
              Number(p.price) && (
              <del>{money(p.price)}</del>
            )}
        </div>

        {free ? (
          <button
            className="add"
            type="button"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={17} />

            {downloading
              ? "Téléchargement..."
              : "Téléchargez gratuitement"}
          </button>
        ) : (
          <button
            className="add"
            type="button"
            onClick={() => onAdd(p)}
          >
            <ShoppingCart size={17} />
            Ajouter au panier
          </button>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   AUTH
========================================================= */

function AuthModal({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  code,
  setCode,
  onSignIn,
  onSignUp,
  onVerify,
  onClose,
  loading,
  message,
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="cart-modal auth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              PJD MARKET
            </span>

            <h2>
              {mode === "verify"
                ? "Vérifiez votre e-mail"
                : mode === "signup"
                ? "Créer un compte"
                : "Se connecter"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        {message && (
          <div className="account-message">
            {message}
          </div>
        )}

        {mode === "verify" ? (
          <form onSubmit={onVerify}>
            <div className="auth-icon">
              <Mail />
            </div>

            <p>
              Entrez le code à 6 chiffres reçu à{" "}
              <b>{email}</b>.
            </p>

            <label>
              <span>Code de confirmation</span>

              <input
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="000000"
                autoFocus
              />
            </label>

            <button
              className="primary auth-submit"
              disabled={loading}
            >
              {loading
                ? "Vérification..."
                : "Vérifier le code"}
            </button>

            <button
              type="button"
              className="secondary auth-link"
              onClick={() => setMode("signup")}
            >
              <ArrowLeft size={16} />
              Modifier l’adresse
            </button>
          </form>
        ) : (
          <form
            onSubmit={
              mode === "signup"
                ? onSignUp
                : onSignIn
            }
          >
            <label>
              <span>Adresse e-mail</span>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                required
              />
            </label>

            <label>
              <span>Mot de passe</span>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                required
                minLength={6}
              />
            </label>

            {mode === "signup" && (
              <p className="auth-help">
                Un code à 6 chiffres sera envoyé
                après l’inscription.
              </p>
            )}

            <button
              className="primary auth-submit"
              disabled={loading}
            >
              {loading
                ? "Patientez..."
                : mode === "signup"
                ? "Créer mon compte"
                : "Se connecter"}
            </button>

            <div className="auth-switch">
              {mode === "signup"
                ? "Vous avez déjà un compte ?"
                : "Pas encore de compte ?"}

              <button
                type="button"
                onClick={() =>
                  setMode(
                    mode === "signup"
                      ? "login"
                      : "signup"
                  )
                }
              >
                {mode === "signup"
                  ? "Se connecter"
                  : "Créer un compte"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   CART
========================================================= */

function CartModal({
  cart,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onCheckout,
}) {
  const total = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="cart-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              PJD MARKET
            </span>
            <h2>Mon panier</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        {!cart.length ? (
          <div className="empty">
            <ShoppingCart size={42} />

            <h3>Votre panier est vide</h3>

            <p>
              Ajoutez des produits pour les
              retrouver ici.
            </p>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div
                  className="cart-item"
                  key={item.product_id}
                >
                  <div className="cart-item-info">
                    <strong>
                      {item.name}
                    </strong>

                    <span>
                      {money(item.price)}
                    </span>
                  </div>

                  <div className="cart-controls">
                    <button
                      type="button"
                      onClick={() =>
                        onDecrease(
                          item.product_id
                        )
                      }
                    >
                      <Minus size={15} />
                    </button>

                    <span>
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onIncrease(
                          item.product_id
                        )
                      }
                    >
                      <Plus size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onRemove(
                          item.product_id
                        )
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cart-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <button
              className="primary auth-submit"
              type="button"
              onClick={onCheckout}
            >
              Passer la commande
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   FAVORITES
========================================================= */

function FavoritesModal({
  favorites,
  onClose,
  onRemove,
  onAdd,
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="cart-modal favorites-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              PJD MARKET
            </span>

            <h2>Mes favoris</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        {!favorites.length ? (
          <div className="empty">
            <Heart size={42} />

            <h3>Aucun favori</h3>

            <p>
              Cliquez sur le cœur d’un produit
              pour le retrouver ici.
            </p>
          </div>
        ) : (
          <div className="favorites-list">
            {favorites.map((product) => (
              <div
                className="favorite-item"
                key={product.id}
              >
                <div className="favorite-image">
                  {product.cover_image ? (
                    <img
                      src={product.cover_image}
                      alt=""
                    />
                  ) : (
                    <Store size={30} />
                  )}
                </div>

                <div className="favorite-info">
                  <strong>
                    {product.title}
                  </strong>

                  <span>
                    {money(
                      product.promo_price ??
                        product.price
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onRemove(product)
                  }
                  aria-label="Retirer des favoris"
                >
                  <Heart
                    size={18}
                    fill="currentColor"
                  />
                </button>

                {Number(product.price || 0) >
                  0 && (
                  <button
                    className="add"
                    type="button"
                    onClick={() =>
                      onAdd(product)
                    }
                  >
                    <ShoppingCart size={16} />
                    Ajouter
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   BOUTIQUE
========================================================= */

function ShopForm({
  session,
  onClose,
  onSaved,
  existing,
}) {
  const [form, setForm] = useState({
    name: existing?.shop_name || "",
    description: existing?.description || "",
    logo: existing?.logo || "",
    banner: existing?.banner || "",
    category: existing?.category || "",
  });

  const [saving, setSaving] =
    useState(false);

  const [msg, setMsg] = useState("");

  const set = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function save(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      setMsg(
        "Le nom de la boutique est obligatoire."
      );
      return;
    }

    setSaving(true);

    const slug =
      form.name
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      session.user.id.slice(0, 6);

    const payload = {
      owner_id: session.user.id,
      shop_name: form.name.trim(),
      slug,
      description: form.description.trim(),
      logo: form.logo.trim(),
      category: form.category.trim(),
      status: "pending",
    };

    const result = existing
      ? await supabase
          .from("shops")
          .update(payload)
          .eq("id", existing.id)
          .select()
          .single()
      : await supabase
          .from("shops")
          .insert(payload)
          .select()
          .single();

    if (result.error) {
      setMsg(result.error.message);
    } else {
      await supabase
        .from("users")
        .update({
          role: "vendeur",
          shop_id: result.data.id,
        })
        .eq("id", session.user.id);

      onSaved(result.data);

      setMsg(
        "Boutique enregistrée avec succès."
      );
    }

    setSaving(false);
  }

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <div
        className="cart-modal"
        style={{ maxWidth: 760 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">
              MA BOUTIQUE
            </span>

            <h2>
              {existing
                ? "Modifier ma boutique"
                : "Créer ma boutique"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
          >
            <X />
          </button>
        </div>

        {msg && (
          <div className="account-message">
            {msg}
          </div>
        )}

        <form onSubmit={save}>
          <div className="form-grid">
            <label>
              <span>
                Nom de la boutique *
              </span>

              <input
                value={form.name}
                onChange={(e) =>
                  set(
                    "name",
                    e.target.value
                  )
                }
                required
              />
            </label>

            <label>
              <span>Catégorie</span>

              <input
                value={form.category}
                onChange={(e) =>
                  set(
                    "category",
                    e.target.value
                  )
                }
              />
            </label>

            <label className="field-full">
              <span>
                Description de la boutique
              </span>

              <textarea
                value={form.description}
                onChange={(e) =>
                  set(
                    "description",
                    e.target.value
                  )
                }
                rows={4}
              />
            </label>

            <label>
              <span>Logo (URL)</span>

              <input
                value={form.logo}
                onChange={(e) =>
                  set(
                    "logo",
                    e.target.value
                  )
                }
              />
            </label>

            <label>
              <span>Bannière (URL)</span>

              <input
                value={form.banner}
                onChange={(e) =>
                  set(
                    "banner",
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          <div className="sub-card">
            <ImageIcon />

            <div>
              <b>
                Identité visuelle
              </b>

              <p>
                Le logo et la bannière
                seront utilisés sur votre
                boutique publique.
              </p>
            </div>
          </div>

          <button
            className="save-btn"
            disabled={saving}
          >
            <Store />

            {saving
              ? "Enregistrement..."
              : "Enregistrer ma boutique"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   BOUTIQUE PUBLIQUE
========================================================= */

function ShopView({
  shop,
  products,
  onBack,
  onAdd,
  onFavorite,
  favorites,
}) {
  const url = `${window.location.origin}${window.location.pathname}?boutique=${encodeURIComponent(
    shop.slug
  )}`;

  const [done, setDone] =
    useState(false);

  async function share() {
    try {
      await navigator.clipboard.writeText(url);

      setDone(true);

      setTimeout(
        () => setDone(false),
        2000
      );
    } catch {
      window.prompt(
        "Copiez le lien de votre boutique",
        url
      );
    }
  }

  return (
    <main>
      <section className="shop-public">
        <button
          className="secondary"
          onClick={onBack}
        >
          <ArrowLeft />
          Retour au catalogue
        </button>

        {shop.logo && (
          <img
            className="shop-logo"
            src={shop.logo}
            alt=""
          />
        )}

        <div
          className="shop-banner"
          style={
            shop.banner
              ? {
                  backgroundImage: `url(${shop.banner})`,
                }
              : undefined
          }
        />

        <div className="shop-head">
          <div>
            <span className="eyebrow">
              BOUTIQUE PJD MARKET
            </span>

            <h1>{shop.shop_name}</h1>

            <p>
              {shop.description ||
                "Bienvenue dans ma boutique."}
            </p>
          </div>

          <button
            className="primary"
            onClick={share}
          >
            {done ? (
              <CheckCircle />
            ) : (
              <Share2 />
            )}

            {done
              ? "Lien copié"
              : "Partager la boutique"}
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">
              CATALOGUE
            </span>

            <h2>
              Produits de{" "}
              {shop.shop_name}
            </h2>
          </div>
        </div>

        <div className="products">
          {products.length ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                p={product}
                onAdd={onAdd}
                onFavorite={onFavorite}
                isFavorite={favorites.some(
                  (item) =>
                    item.id === product.id
                )}
              />
            ))
          ) : (
            <div className="empty">
              Cette boutique ne contient
              pas encore de produit publié.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* =========================================================
   MARKETPLACE
========================================================= */

export default function MarketplaceShell() {
  const [menu, setMenu] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [view, setView] =
    useState("Accueil");

  const [products, setProducts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [session, setSession] =
    useState(null);

  const [authOpen, setAuthOpen] =
    useState(false);

  const [authMode, setAuthMode] =
    useState("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [code, setCode] =
    useState("");

  const [authMessage, setAuthMessage] =
    useState("");

  /* =====================================================
     PANIER
  ===================================================== */

  const [cart, setCart] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "pjd-cart"
          ) || "[]"
        );
      } catch {
        return [];
      }
    });

  const [cartOpen, setCartOpen] =
    useState(false);

  /* =====================================================
     FAVORIS
  ===================================================== */

  const [favorites, setFavorites] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "pjd-favorites"
          ) || "[]"
        );
      } catch {
        return [];
      }
    });

  const [favoritesOpen, setFavoritesOpen] =
    useState(false);

  const [shop, setShop] =
    useState(null);

  const [myShop, setMyShop] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(false);

  /* =====================================================
     INITIALISATION
  ===================================================== */

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) =>
        setSession(data.session)
      );

    const {
      data: listener,
    } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
        }
      );

    loadProducts();

    return () =>
      listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadMyShop(session.user.id);
    }
  }, [session]);

  /* =====================================================
     SAUVEGARDE PANIER
  ===================================================== */

  useEffect(() => {
    localStorage.setItem(
      "pjd-cart",
      JSON.stringify(cart)
    );
  }, [cart]);

  /* =====================================================
     SAUVEGARDE FAVORIS
  ===================================================== */

  useEffect(() => {
    localStorage.setItem(
      "pjd-favorites",
      JSON.stringify(favorites)
    );
  }, [favorites]);

  /* =====================================================
     BOUTIQUE VIA URL
  ===================================================== */

  useEffect(() => {
    const slug =
      new URLSearchParams(
        window.location.search
      ).get("boutique");

    if (slug) {
      openPublicShop(slug);
    }
  }, []);

  /* =====================================================
     PRODUITS
  ===================================================== */

  async function loadProducts() {
    setLoading(true);

    const { data } =
      await supabase
        .from("digital_products")
        .select(
          "id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,file_type,file_url,is_free,downloads,sales,status,created_at"
        )
        .in("status", [
          "approved",
          "active",
          "actif",
        ])
        .order("created_at", {
          ascending: false,
        });

    setProducts(data || []);
    setLoading(false);
  }

  async function loadMyShop(id) {
    const { data } =
      await supabase
        .from("shops")
        .select("*")
        .eq("owner_id", id)
        .maybeSingle();

    setMyShop(data);
  }

  async function openPublicShop(slug) {
    const { data: shopData } =
      await supabase
        .from("shops")
        .select("*")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();

    if (!shopData) return;

    const { data: shopProducts } =
      await supabase
        .from("digital_products")
        .select(
          "id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,file_type,file_url,is_free,downloads,sales,status,created_at"
        )
        .eq("shop_id", shopData.id)
        .in("status", [
          "approved",
          "active",
          "actif",
        ])
        .order("created_at", {
          ascending: false,
        });

    setShop(shopData);
    setProducts(shopProducts || []);
  }

  /* =====================================================
     AUTH
  ===================================================== */

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setAuthMessage("");
    setCode("");
    setAuthOpen(true);
  }

  async function signIn(event) {
    event.preventDefault();

    setAuthLoading(true);

    const { error } =
      await supabase.auth.signInWithPassword(
        {
          email: email.trim().toLowerCase(),
          password,
        }
      );

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthOpen(false);
      setView("Accueil");
    }

    setAuthLoading(false);
  }

  async function signUp(event) {
    event.preventDefault();

    setAuthLoading(true);

    const clean =
      email.trim().toLowerCase();

    const { error } =
      await supabase.auth.signUp({
        email: clean,
        password,
        options: {
          data: {
            name: clean.split("@")[0],
          },
        },
      });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMode("verify");

      setAuthMessage(
        "Compte créé. Consultez votre e-mail pour le code à 6 chiffres."
      );
    }

    setAuthLoading(false);
  }

  async function verifyCode(event) {
    event.preventDefault();

    setAuthLoading(true);

    const { data, error } =
      await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "signup",
      });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setSession(data.session);
      setAuthOpen(false);
      setView("Accueil");
    }

    setAuthLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();

    setSession(null);
    setView("Accueil");
  }

  /* =====================================================
     PANIER
  ===================================================== */

  async function addToCart(product) {
    const existing =
      cart.find(
        (item) =>
          item.product_id === product.id
      );

    const next = existing
      ? cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity:
                  item.quantity + 1,
              }
            : item
        )
      : [
          ...cart,
          {
            product_id: product.id,
            name: product.title,
            price: Number(
              product.promo_price ??
                product.price ??
                0
            ),
            quantity: 1,
          },
        ];

    setCart(next);

    /*
      On ouvre automatiquement le panier
      après l'ajout.
    */
    setCartOpen(true);

    /*
      Synchronisation Supabase
    */
    if (session) {
      let { data: existingCart } =
        await supabase
          .from("carts")
          .select("id")
          .eq(
            "user_id",
            session.user.id
          )
          .maybeSingle();

      if (!existingCart) {
        const result =
          await supabase
            .from("carts")
            .insert({
              user_id:
                session.user.id,
            })
            .select("id")
            .single();

        existingCart = result.data;
      }

      if (existingCart) {
        const item =
          next.find(
            (x) =>
              x.product_id ===
              product.id
          );

        await supabase
          .from("cart_items")
          .upsert(
            {
              cart_id:
                existingCart.id,
              product_id: product.id,
              name: product.title,
              price:
                product.promo_price ??
                product.price,
              quantity:
                item.quantity,
            },
            {
              onConflict:
                "cart_id,product_id",
            }
          );
      }
    }
  }

  function increaseCart(productId) {
    setCart((current) =>
      current.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity:
                item.quantity + 1,
            }
          : item
      )
    );
  }

  function decreaseCart(productId) {
    setCart((current) =>
      current
        .map((item) =>
          item.product_id === productId
            ? {
                ...item,
                quantity:
                  item.quantity - 1,
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        )
    );
  }

  function removeFromCart(productId) {
    setCart((current) =>
      current.filter(
        (item) =>
          item.product_id !== productId
      )
    );
  }

  /*
    Nombre total d'articles.
    Exemple:
    produit A x2 + produit B x1 = badge 3
  */
  const cartCount = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  /* =====================================================
     FAVORIS
  ===================================================== */

  function toggleFavorite(product) {
    setFavorites((current) => {
      const exists = current.some(
        (item) =>
          item.id === product.id
      );

      if (exists) {
        return current.filter(
          (item) =>
            item.id !== product.id
        );
      }

      return [...current, product];
    });
  }

  function removeFavorite(product) {
    setFavorites((current) =>
      current.filter(
        (item) =>
          item.id !== product.id
      )
    );
  }

  const favoriteCount =
    favorites.length;

  /* =====================================================
     BOUTIQUE
  ===================================================== */

  function createShop() {
    if (!session) {
      openAuth("login");
      return;
    }

    setView("Ma boutique");
  }

  /* =====================================================
     RECHERCHE
  ===================================================== */

  const filtered = products.filter(
    (product) => {
      if (!search) return true;

      const text =
        `${product.title} ${
          product.category
        } ${
          product.description || ""
        }`.toLowerCase();

      return text.includes(
        search.toLowerCase()
      );
    }
  );

  /* =====================================================
     CHECKOUT
  ===================================================== */

  function checkout() {
    if (!session) {
      setCartOpen(false);
      openAuth("login");
      return;
    }

    /*
      Le checkout existant de PJD Maker
      peut prendre le relais ici.
    */
    setCartOpen(false);
    setView("Catalogue");
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="marketplace">
      {/* TOPBAR */}

      <div className="topbar">
        <div>
          🚚 Livraison · 🔒 Paiement sécurisé · 💬 Support
        </div>

        <div className="toplinks">
          <button
            onClick={() =>
              openAuth("signup")
            }
          >
            Créer un compte
          </button>

          <button onClick={createShop}>
            Créer ma boutique
          </button>
        </div>
      </div>

      {/* HEADER */}

      <header className="header">
        <button
          className="mobile-menu"
          onClick={() =>
            setMenu(!menu)
          }
        >
          {menu ? <X /> : <Menu />}
        </button>

        <div className="brand">
          <span className="brand-mark">
            P
          </span>

          <span>
            PJD{" "}
            <span className="brand-dot">
              MARKET
            </span>
          </span>
        </div>

        <div className="search">
          <Search size={20} />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Rechercher un produit, une boutique, un service..."
          />

          <button
            onClick={() =>
              setView("Catalogue")
            }
          >
            Rechercher
          </button>
        </div>

        {/* ACTIONS */}

        <div className="actions">
          {/* FAVORIS */}

          <button
            type="button"
            className="icon-btn icon-with-badge"
            aria-label={`Favoris (${favoriteCount})`}
            onClick={() =>
              setFavoritesOpen(true)
            }
          >
            <Heart
              fill={
                favoriteCount
                  ? "currentColor"
                  : "none"
              }
            />

            <Badge
              count={favoriteCount}
            />
          </button>

          {/* PANIER */}

          <button
            type="button"
            className="icon-btn icon-with-badge"
            aria-label={`Panier (${cartCount})`}
            onClick={() =>
              setCartOpen(true)
            }
          >
            <ShoppingCart />

            <Badge count={cartCount} />
          </button>

          {/* COMPTE */}

          <button
            className="account"
            onClick={() =>
              session
                ? signOut()
                : openAuth("login")
            }
          >
            {session ? (
              <LogOut size={19} />
            ) : (
              <LogIn size={19} />
            )}

            <span>
              {session
                ? "Déconnexion"
                : "Se connecter"}
            </span>
          </button>

          {session && (
            <button
              className="account account-signup"
              onClick={createShop}
            >
              <Store size={19} />

              <span>
                {myShop
                  ? "Ma boutique"
                  : "Créer ma boutique"}
              </span>
            </button>
          )}
        </div>
      </header>

      <div className="brand-slogan">
        Achetez. Vendez. Développez votre
        activité.
      </div>

      {/* NAVIGATION */}

      <nav
        className={
          "nav " +
          (menu ? "open" : "")
        }
      >
        {nav.map((item) => (
          <button
            key={item}
            className={
              view === item
                ? "active"
                : ""
            }
            onClick={() => {
              setView(item);
              setMenu(false);
            }}
          >
            {item}
          </button>
        ))}

        <button
          className="nav-promo"
          onClick={() =>
            setView("Promotions")
          }
        >
          Offres du moment{" "}
          <Zap size={15} />
        </button>
      </nav>

      {/* CONTENU */}

      {shop ? (
        <ShopView
          shop={shop}
          products={products}
          onBack={() => {
            setShop(null);
            loadProducts();

            history.replaceState(
              {},
              "",
              window.location.pathname
            );
          }}
          onAdd={addToCart}
          onFavorite={toggleFavorite}
          favorites={favorites}
        />
      ) : (
        <main>
          {view === "Accueil" && (
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow">
                  PJD MARKET · MARKETPLACE
                </span>

                <h1>
                  Achetez, vendez et{" "}
                  <em>
                    développez votre activité.
                  </em>
                </h1>

                <p>
                  Une marketplace complète
                  pour les produits physiques,
                  numériques et services.
                </p>

                <div className="hero-buttons">
                  <button
                    className="primary"
                    onClick={() =>
                      setView("Catalogue")
                    }
                  >
                    Explorer les catalogues
                    <ChevronRight size={18} />
                  </button>

                  <button
                    className="secondary"
                    onClick={createShop}
                  >
                    <Store size={18} />
                    Créer ma boutique
                  </button>
                </div>
              </div>
            </section>
          )}

          {view !== "Accueil" && (
            <section className="section">
              <div className="section-head">
                <div>
                  <span className="eyebrow">
                    PJD MARKET
                  </span>

                  <h2>{view}</h2>
                </div>
              </div>

              {loading ? (
                <div className="empty">
                  Chargement...
                </div>
              ) : (
                <div className="products">
                  {filtered.length ? (
                    filtered.map(
                      (product) => (
                        <ProductCard
                          key={product.id}
                          p={product}
                          onAdd={
                            addToCart
                          }
                          onFavorite={
                            toggleFavorite
                          }
                          isFavorite={favorites.some(
                            (item) =>
                              item.id ===
                              product.id
                          )}
                        />
                      )
                    )
                  ) : (
                    <div className="empty">
                      Aucun produit trouvé.
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      )}

      {/* AUTH */}

      {authOpen && (
        <AuthModal
          mode={authMode}
          setMode={setAuthMode}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          code={code}
          setCode={setCode}
          onSignIn={signIn}
          onSignUp={signUp}
          onVerify={verifyCode}
          onClose={() =>
            setAuthOpen(false)
          }
          loading={authLoading}
          message={authMessage}
        />
      )}

      {/* PANIER */}

      {cartOpen && (
        <CartModal
          cart={cart}
          onClose={() =>
            setCartOpen(false)
          }
          onIncrease={
            increaseCart
          }
          onDecrease={
            decreaseCart
          }
          onRemove={
            removeFromCart
          }
          onCheckout={checkout}
        />
      )}

      {/* FAVORIS */}

      {favoritesOpen && (
        <FavoritesModal
          favorites={favorites}
          onClose={() =>
            setFavoritesOpen(false)
          }
          onRemove={
            removeFavorite
          }
          onAdd={addToCart}
        />
      )}
    </div>
  );
}
