import React, { useEffect, useState } from "react";
import { Heart, ShoppingCart, Store, User, LogIn, UserPlus, Gift, Mail, X } from "lucide-react";
import { supabase } from "./lib/supabase";
import MultiVendorCheckout from "./MultiVendorCheckout";

export default function MarketplaceTopNav({ session, shop, onOpenAffiliate, onOpenAccount, onOpenCart, onOpenSeller, onOpenAuth }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartPulse, setCartPulse] = useState(false);
  const [cartNotice, setCartNotice] = useState("");

  useEffect(() => {
    const read = () => {
      try {
        const cart = JSON.parse(localStorage.getItem("pjd-cart") || "[]");
        setCartCount(cart.reduce((total, item) => total + Number(item.quantity || 0), 0));
      } catch {
        setCartCount(0);
      }
    };

    const added = (event) => {
      read();
      setCartPulse(true);
      window.setTimeout(() => setCartPulse(false), 450);
      const product = event.detail?.product;
      setCartNotice(`✓ ${product?.name || product?.title || "Produit"} ajouté au panier`);
      window.setTimeout(() => setCartNotice(""), 1800);
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("pjd-open-cart")), 60);
    };

    read();
    window.addEventListener("storage", read);
    window.addEventListener("pjd-cart-updated", added);
    const timer = window.setInterval(read, 500);

    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("pjd-cart-updated", added);
      window.clearInterval(timer);
    };
  }, []);

  const openShop = () => {
    if (shop) {
      window.dispatchEvent(new CustomEvent("pjd-open-shop", { detail: { shopId: shop.id, shop } }));
      return;
    }
    onOpenSeller?.(null);
  };

  return (
    <>
      <MultiVendorCheckout session={session} />
      <style>{`@keyframes pjdCartPulse{0%{transform:scale(1)}35%{transform:scale(1.16)}65%{transform:scale(.94)}100%{transform:scale(1)}}@keyframes pjdBadgePop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes pjdNoticeIn{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}.pjd-cart-action{position:relative}.pjd-cart-action.pjd-pulse svg{animation:pjdCartPulse .45s ease}.pjd-cart-badge{position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#f97316;color:#fff;border:2px solid #fff;font:800 11px/16px Inter,system-ui,sans-serif;text-align:center;z-index:3;animation:pjdBadgePop .28s ease}.pjd-cart-notice{position:fixed;right:16px;bottom:18px;z-index:100000;background:#111827;color:#fff;padding:12px 16px;border-radius:14px;box-shadow:0 12px 35px rgba(0,0,0,.25);font:800 14px/1.3 Inter,system-ui,sans-serif;animation:pjdNoticeIn .25s ease}`}</style>
      <div className="pjd-topnav">
        <div className="pjd-topnav-brand"><b>PJD</b><span>MARKET</span></div>
        <div className="pjd-topnav-actions">
          {session ? (
            <>
              <button className="pjd-action" onClick={() => onOpenAffiliate?.()}><Gift /><span>Affiliation</span></button>
              <button className="pjd-action" onClick={() => onOpenAccount?.("favorites")}><Heart /><span>Favoris</span></button>
              <button className={`pjd-action pjd-cart-action ${cartPulse ? "pjd-pulse" : ""}`} onClick={onOpenCart} aria-label={`Panier${cartCount ? ` (${cartCount})` : ""}`}>
                <ShoppingCart />
                {cartCount > 0 && <span className="pjd-cart-badge">{cartCount > 99 ? "99+" : cartCount}</span>}
                <span>Panier</span>
              </button>
              <button className="pjd-action pjd-shop" onClick={openShop}><Store /><span>{shop ? "Ma boutique" : "Créer ma boutique"}</span></button>
              <button className="pjd-action" onClick={() => onOpenAccount?.("account")}><User /><span>Mon compte</span></button>
            </>
          ) : (
            <>
              <button className="pjd-action" onClick={() => onOpenAuth?.("login")}><LogIn /><span>Se connecter</span></button>
              <button className="pjd-action pjd-create-shop" onClick={() => onOpenAuth?.("signup")}><UserPlus /><span>S'inscrire</span></button>
            </>
          )}
        </div>
      </div>
      {cartNotice && <div className="pjd-cart-notice" role="status">{cartNotice}</div>}
    </>
  );
}

export function CreateShopFlow({ session, onDone, onClose }) {
  const [mode, setMode] = useState(session ? "checking" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeSession, setActiveSession] = useState(session || null);
  const [form, setForm] = useState({ name: "", category: "", description: "", phone: "", city: "", country: "Cameroun" });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const finishShop = async (shopRecord) => {
    await supabase.from("users").update({ role: "vendeur", shop_id: shopRecord.id }).eq("id", shopRecord.owner_id);
    window.dispatchEvent(new CustomEvent("pjd-shop-updated", { detail: shopRecord }));
    window.dispatchEvent(new CustomEvent("pjd-open-shop", { detail: { shopId: shopRecord.id, shop: shopRecord } }));
    onDone?.(shopRecord);
    onClose?.();
  };

  useEffect(() => {
    if (!session?.user?.id) return undefined;
    let alive = true;
    setActiveSession(session);
    setBusy(true);

    supabase.from("shops").select("*").eq("owner_id", session.user.id).limit(1).maybeSingle().then(({ data, error }) => {
      if (!alive) return;
      setBusy(false);
      if (error) {
        setMsg(error.message);
        setMode("shop");
        return;
      }
      if (data) {
        finishShop(data);
        return;
      }
      setMode("shop");
      setMsg("Votre compte est connecté. Configurez votre boutique une seule fois.");
    });

    return () => { alive = false; };
  }, [session?.user?.id]);

  async function signup(event) {
    event.preventDefault();
    setBusy(true);
    setMsg("");
    const { error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
    if (error) {
      setMsg(error.message);
    } else {
      setMode("verify");
      setMsg("Compte créé. Entrez le code de confirmation reçu par e-mail.");
    }
    setBusy(false);
  }

  async function resend() {
    if (!email) return;
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: email.trim().toLowerCase() });
    setMsg(error ? error.message : "Un nouveau code vient d’être envoyé.");
    setBusy(false);
  }

  async function verify(event) {
    event.preventDefault();
    if (code.length !== 8) {
      setMsg("Le code doit contenir exactement 8 chiffres.");
      return;
    }
    setBusy(true);
    setMsg("");
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: "signup" });
    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }
    setActiveSession(data.session);
    if (!data.session?.user?.id) {
      setMsg("Compte confirmé. Connectez-vous pour continuer la création de la boutique.");
      setBusy(false);
      return;
    }
    const existing = await supabase.from("shops").select("*").eq("owner_id", data.session.user.id).limit(1).maybeSingle();
    if (existing.data) {
      await finishShop(existing.data);
    } else if (existing.error) {
      setMsg(existing.error.message);
    } else {
      setMode("shop");
      setMsg("Compte confirmé. Configurez votre boutique une seule fois.");
    }
    setBusy(false);
  }

  async function saveShop(event) {
    event.preventDefault();
    if (!activeSession?.user?.id) {
      setMsg("Session utilisateur introuvable. Reconnectez-vous puis réessayez.");
      return;
    }
    if (!form.name.trim() || !form.category.trim()) {
      setMsg("Le nom et la catégorie de la boutique sont obligatoires.");
      return;
    }

    setBusy(true);
    setMsg("");

    const existing = await supabase.from("shops").select("*").eq("owner_id", activeSession.user.id).limit(1).maybeSingle();
    if (existing.error) {
      setMsg(existing.error.message);
      setBusy(false);
      return;
    }
    if (existing.data) {
      await finishShop(existing.data);
      setBusy(false);
      return;
    }

    const slugBase = form.name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${slugBase || "boutique"}-${activeSession.user.id.slice(0, 6)}`;
    const payload = {
      owner_id: activeSession.user.id,
      shop_name: form.name.trim(),
      slug,
      description: form.description.trim(),
      category: form.category.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      country: form.country.trim() || "Cameroun",
      status: "active"
    };

    const { data, error } = await supabase.from("shops").insert(payload).select().single();
    if (error) {
      setMsg(error.message);
    } else {
      await finishShop(data);
    }
    setBusy(false);
  }

  if (mode === "checking") {
    return (
      <div className="pjd-flow-backdrop">
        <div className="pjd-flow">
          <div className="pjd-flow-title"><Store /><span>Ma boutique</span></div>
          <h2>Vérification de votre boutique</h2>
          <p>Nous vérifions votre boutique enregistrée...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pjd-flow-backdrop">
      <div className="pjd-flow">
        <button className="pjd-flow-close" onClick={onClose} type="button" aria-label="Fermer"><X /></button>

        {mode === "signup" && (
          <div>
            <div className="pjd-flow-title"><UserPlus /><span>Inscription</span></div>
            <h2>Créez votre compte</h2>
            <p>Inscrivez-vous pour accéder à votre compte PJD Market.</p>
            <form onSubmit={signup}>
              <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
              <label>Mot de passe<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>
              <button className="pjd-primary" disabled={busy} type="submit">Créer mon compte</button>
            </form>
          </div>
        )}

        {mode === "verify" && (
          <div>
            <div className="pjd-flow-title"><Mail /><span>Vérification</span></div>
            <h2>Confirmez votre e-mail</h2>
            <p>Entrez le code à 8 chiffres reçu à <b>{email}</b>.</p>
            <form onSubmit={verify}>
              <input className="pjd-code" inputMode="numeric" maxLength={8} minLength={8} pattern="[0-9]{8}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" required />
              <button className="pjd-primary" disabled={busy || code.length !== 8} type="submit">Continuer</button>
            </form>
            <button type="button" className="pjd-secondary" onClick={resend} disabled={busy}>Renvoyer le code</button>
          </div>
        )}

        {mode === "shop" && (
          <div>
            <div className="pjd-flow-title"><Store /><span>Créer ma boutique</span></div>
            <h2>Configurez votre boutique</h2>
            <p>Ces informations sont enregistrées une seule fois. Une boutique existante sera ouverte automatiquement.</p>
            <form onSubmit={saveShop}>
              <label>Nom de la boutique *<input value={form.name} onChange={(event) => update("name", event.target.value)} required /></label>
              <label>Catégorie *<input value={form.category} onChange={(event) => update("category", event.target.value)} required /></label>
              <label>Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={3} /></label>
              <div className="pjd-two">
                <label>Téléphone<input value={form.phone} onChange={(event) => update("phone", event.target.value)} /></label>
                <label>Ville<input value={form.city} onChange={(event) => update("city", event.target.value)} /></label>
              </div>
              <button className="pjd-primary" disabled={busy} type="submit">Créer ma boutique</button>
            </form>
          </div>
        )}

        {msg && <div className="pjd-flow-msg" role="alert">{msg}</div>}
      </div>
    </div>
  );
}
