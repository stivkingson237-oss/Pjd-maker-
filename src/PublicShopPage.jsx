import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Store,
  ShoppingCart,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
  Download,
  Bell,
  BellOff,
  Star,
  Send,
  Edit3,
  Trash2,
  Users,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import './public-shop.css';

const money = (v) =>
  Number(v || 0) === 0
    ? 'Gratuit'
    : `${Number(v || 0).toLocaleString('fr-FR')} FCFA`;

async function downloadFreeProduct(product) {
  if (!product?.file_url) {
    alert('Le fichier de ce produit gratuit n’est pas encore disponible.');
    return;
  }

  try {
    const response = await fetch(product.file_url);
    if (!response.ok) throw new Error('Téléchargement impossible');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = product.title || 'produit-gratuit';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    window.open(product.file_url, '_blank', 'noopener,noreferrer');
  }
}

function Stars({ value = 0, interactive = false, onChange }) {
  const rounded = Math.round(Number(value) || 0);

  return (
    <div className="shop-stars" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? 'button' : undefined}
          className={`shop-star ${star <= rounded ? 'active' : ''} ${interactive ? 'interactive' : ''}`}
          onClick={() => interactive && onChange?.(star)}
          aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
        >
          <Star size={interactive ? 28 : 17} fill={star <= rounded ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function formatDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function PublicShopPage({ shopId, onBack, onAdd }) {
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [user, setUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    let alive = true;

    const loadUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (alive) setUser(currentUser || null);
    };

    loadUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setUser(session?.user || null);
    });

    return () => {
      alive = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let alive = true;

    const loadShop = async () => {
      setLoading(true);
      setError('');

      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', shopId)
        .maybeSingle();

      if (shopError) {
        if (alive) {
          setError(shopError.message);
          setLoading(false);
        }
        return;
      }

      if (!shopData) {
        if (alive) {
          setError('Boutique introuvable.');
          setLoading(false);
        }
        return;
      }

      const { data: productData, error: productError } = await supabase
        .from('digital_products')
        .select('id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,file_type,file_url,is_free,downloads,sales,stock,status,created_at')
        .eq('shop_id', shopData.id)
        .in('status', ['active', 'approved', 'actif'])
        .order('created_at', { ascending: false });

      if (alive) {
        setShop(shopData);
        setProducts(productError ? [] : productData || []);
        if (productError) setError(productError.message);
        setLoading(false);
      }
    };

    loadShop();
    return () => { alive = false; };
  }, [shopId]);

  const loadReviews = async () => {
    setReviewsLoading(true);
    setReviewError('');

    const { data, error: reviewsError } = await supabase
      .from('shop_reviews')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      setReviewError(reviewsError.message);
      setReviews([]);
    } else {
      setReviews(data || []);
    }

    setReviewsLoading(false);
  };

  const loadUserShopData = async (currentUser) => {
    if (!currentUser || !shopId) {
      setIsFollowing(false);
      setMyReview(null);
      return;
    }

    const { data: followData } = await supabase
      .from('shop_followers')
      .select('id')
      .eq('shop_id', shopId)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    setIsFollowing(Boolean(followData));

    const { data: reviewData } = await supabase
      .from('shop_reviews')
      .select('*')
      .eq('shop_id', shopId)
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (reviewData) {
      setMyReview(reviewData);
      setRating(Number(reviewData.rating) || 5);
      setComment(reviewData.comment || '');
    } else {
      setMyReview(null);
      setRating(5);
      setComment('');
    }
  };

  useEffect(() => {
    if (!shopId) return;
    loadReviews();
  }, [shopId]);

  useEffect(() => {
    loadUserShopData(user);
  }, [user, shopId]);

  async function handleFollow() {
    if (!user) {
      alert('Connectez-vous pour vous abonner à cette boutique.');
      return;
    }
    if (!shop) return;

    setFollowLoading(true);
    setError('');

    if (isFollowing) {
      const { error: deleteError } = await supabase
        .from('shop_followers')
        .delete()
        .eq('shop_id', shop.id)
        .eq('user_id', user.id);

      if (deleteError) {
        setError(deleteError.message);
      } else {
        setIsFollowing(false);
        setShop((current) => current ? {
          ...current,
          followers_count: Math.max(0, Number(current.followers_count || 0) - 1),
        } : current);
      }
    } else {
      const { error: insertError } = await supabase
        .from('shop_followers')
        .insert({ shop_id: shop.id, user_id: user.id });

      if (insertError) {
        if (insertError.code === '23505') setIsFollowing(true);
        else setError(insertError.message);
      } else {
        setIsFollowing(true);
        setShop((current) => current ? {
          ...current,
          followers_count: Number(current.followers_count || 0) + 1,
        } : current);
      }
    }

    setFollowLoading(false);
  }

  function openReviewForm() {
    if (!user) {
      alert('Connectez-vous pour donner votre avis sur cette boutique.');
      return;
    }

    if (myReview) {
      setRating(Number(myReview.rating) || 5);
      setComment(myReview.comment || '');
    } else {
      setRating(5);
      setComment('');
    }

    setReviewError('');
    setReviewFormOpen(true);
  }

  async function handleSubmitReview(event) {
    event.preventDefault();

    if (!user) {
      setReviewError('Vous devez être connecté pour publier un avis.');
      return;
    }
    if (!shop) return;
    if (rating < 1 || rating > 5) {
      setReviewError('Veuillez choisir une note entre 1 et 5 étoiles.');
      return;
    }
    if (!comment.trim()) {
      setReviewError('Veuillez écrire un commentaire.');
      return;
    }

    setReviewSubmitting(true);
    setReviewError('');

    const payload = {
      shop_id: shop.id,
      user_id: user.id,
      rating: Number(rating),
      comment: comment.trim(),
    };

    let result;
    if (myReview) {
      result = await supabase
        .from('shop_reviews')
        .update({
          rating: payload.rating,
          comment: payload.comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', myReview.id)
        .eq('user_id', user.id);
    } else {
      result = await supabase.from('shop_reviews').insert(payload);
    }

    if (result.error) {
      setReviewError(result.error.message);
      setReviewSubmitting(false);
      return;
    }

    await loadReviews();
    await loadUserShopData(user);
    setReviewFormOpen(false);
    setReviewSubmitting(false);
  }

  async function handleDeleteReview() {
    if (!myReview || !user) return;

    const confirmed = window.confirm('Voulez-vous vraiment supprimer votre avis ?');
    if (!confirmed) return;

    setReviewError('');

    const { error: deleteError } = await supabase
      .from('shop_reviews')
      .delete()
      .eq('id', myReview.id)
      .eq('user_id', user.id);

    if (deleteError) {
      setReviewError(deleteError.message);
      return;
    }

    setMyReview(null);
    setRating(5);
    setComment('');
    await loadReviews();
  }

  async function handleFreeDownload(product) {
    setDownloading(product.id);
    await downloadFreeProduct(product);
    setDownloading(null);
  }

  const calculatedRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : Number(shop?.rating || 0);

  const roundedRating = calculatedRating ? calculatedRating.toFixed(1) : '0.0';

  if (loading) {
    return (
      <main className="public-shop-page">
        <div className="public-shop-loading"><Loader2 className="spin" /> Chargement de la boutique...</div>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="public-shop-page">
        <div className="public-shop-error">
          <Store size={42} />
          <h2>{error || 'Boutique introuvable'}</h2>
          <button className="secondary" onClick={onBack}><ArrowLeft /> Retour à la marketplace</button>
        </div>
      </main>
    );
  }

  return (
    <main className="public-shop-page">
      <button className="secondary public-shop-back" onClick={onBack}><ArrowLeft /> Retour à la marketplace</button>

      <section className="public-shop-hero">
        <div className="public-shop-banner">
          {shop.banner ? <img src={shop.banner} alt="Bannière de la boutique" /> : <div className="public-shop-banner-empty"><ImageIcon /></div>}
        </div>

        <div className="public-shop-identity">
          <div className="public-shop-logo">
            {shop.logo ? <img src={shop.logo} alt={`Logo de ${shop.shop_name}`} /> : <Store />}
          </div>

          <div className="public-shop-info">
            <div className="public-shop-title-row">
              <div>
                <span className="eyebrow">BOUTIQUE PJD MARKET</span>
                <h1>{shop.shop_name}</h1>
                <p>{shop.description || 'Bienvenue dans cette boutique.'}</p>
              </div>
              <span className="public-shop-badge"><ShieldCheck size={16} /> Boutique</span>
            </div>

            <div className="public-shop-meta">
              <span>{shop.category || 'Marketplace'}</span>
              {shop.city && <span>{shop.city}{shop.country ? `, ${shop.country}` : ''}</span>}
            </div>

            <div className="public-shop-stats">
              <div className="shop-stat">
                <Star size={18} fill="currentColor" />
                <strong>{roundedRating}</strong>
                <span>{reviews.length} avis</span>
              </div>

              <div className="shop-stat">
                <Users size={18} />
                <strong>{Number(shop.followers_count || 0).toLocaleString('fr-FR')}</strong>
                <span>abonnés</span>
              </div>

              <button className={`shop-follow-button ${isFollowing ? 'following' : ''}`} onClick={handleFollow} disabled={followLoading}>
                {followLoading ? <Loader2 size={17} className="spin" /> : isFollowing ? <BellOff size={17} /> : <Bell size={17} />}
                {isFollowing ? 'Se désabonner' : "S'abonner"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {error && <div className="account-message">{error}</div>}

      <section className="section public-shop-products">
        <div className="section-head">
          <div>
            <span className="eyebrow">CATALOGUE</span>
            <h2>Produits de {shop.shop_name}</h2>
            <p>{products.length} produit{products.length > 1 ? 's' : ''} disponible{products.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="products">
          {products.length ? products.map((product) => {
            const free = Boolean(product.is_free) || Number(product.price || 0) === 0;
            return (
              <article className="product-card" key={product.id}>
                <div className="product-art">
                  {product.cover_image ? <img src={product.cover_image} alt={product.title} loading="lazy" /> : <Store size={54} />}
                </div>
                <div className="product-body">
                  <div className="product-cat">{product.category || 'Produit'}</div>
                  <h3>{product.title}</h3>
                  <p>{product.description || ''}</p>
                  <div className="price">
                    <strong>{money(product.promo_price ?? product.price)}</strong>
                    {product.promo_price != null && Number(product.promo_price) < Number(product.price) && <del>{money(product.price)}</del>}
                  </div>
                  {free ? (
                    <button className="add" type="button" onClick={() => handleFreeDownload(product)} disabled={downloading === product.id}>
                      <Download size={17} />
                      {downloading === product.id ? 'Téléchargement...' : 'Téléchargez gratuitement'}
                    </button>
                  ) : (
                    <button className="add" onClick={() => onAdd?.(product)}><ShoppingCart size={17} /> Ajouter au panier</button>
                  )}
                </div>
              </article>
            );
          }) : <div className="empty">Cette boutique ne contient pas encore de produit publié.</div>}
        </div>
      </section>

      <section className="section shop-reviews-section">
        <div className="section-head">
          <div>
            <span className="eyebrow">AVIS CLIENTS</span>
            <h2>Ce que pensent les clients</h2>
            <p>{reviews.length} avis sur cette boutique</p>
          </div>
          {user && (
            <button className="shop-review-button" onClick={openReviewForm}>
              {myReview ? <><Edit3 size={17} /> Modifier mon avis</> : <><Star size={17} /> Donner mon avis</>}
            </button>
          )}
        </div>

        <div className="shop-rating-summary">
          <div className="shop-rating-number">
            <strong>{roundedRating}</strong>
            <Stars value={calculatedRating} />
            <span>{reviews.length} avis</span>
          </div>
          <div className="shop-rating-text">Votre avis aide les autres clients à choisir une boutique de confiance.</div>
        </div>

        {reviewFormOpen && (
          <form className="shop-review-form" onSubmit={handleSubmitReview}>
            <div className="shop-review-form-header">
              <div>
                <h3>{myReview ? 'Modifier votre avis' : 'Donner votre avis'}</h3>
                <p>Partagez votre expérience avec cette boutique.</p>
              </div>
              <button type="button" className="shop-review-close" onClick={() => setReviewFormOpen(false)}>×</button>
            </div>

            <label>Votre note</label>
            <Stars value={rating} interactive onChange={setRating} />
            <label>Votre commentaire</label>
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Écrivez votre avis sur cette boutique..." rows={5} maxLength={1000} />

            <div className="shop-review-form-footer">
              <span>{comment.length}/1000</span>
              <button type="submit" className="shop-review-submit" disabled={reviewSubmitting}>
                {reviewSubmitting ? <><Loader2 size={17} className="spin" /> Publication...</> : <><Send size={17} /> {myReview ? 'Enregistrer' : 'Publier mon avis'}</>}
              </button>
            </div>

            {reviewError && <div className="account-message">{reviewError}</div>}
          </form>
        )}

        <div className="shop-reviews-list">
          {reviewsLoading ? (
            <div className="shop-reviews-loading"><Loader2 className="spin" /> Chargement des avis...</div>
          ) : reviews.length ? (
            reviews.map((review) => {
              const isMine = user?.id === review.user_id;
              return (
                <article className="shop-review-card" key={review.id}>
                  <div className="shop-review-avatar">{(review.user_id || 'U').slice(0, 1).toUpperCase()}</div>
                  <div className="shop-review-content">
                    <div className="shop-review-top">
                      <div>
                        <div className="shop-review-stars"><Stars value={review.rating} /></div>
                        <span className="shop-review-date">
                          {formatDate(review.created_at)}
                          {review.updated_at && review.updated_at !== review.created_at && <> · Modifié</>}
                        </span>
                      </div>
                      {isMine && (
                        <div className="shop-review-actions">
                          <button type="button" onClick={openReviewForm} title="Modifier mon avis"><Edit3 size={16} /></button>
                          <button type="button" onClick={handleDeleteReview} title="Supprimer mon avis"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>
                    <p>{review.comment}</p>
                    {isMine && <span className="shop-review-owner">Votre avis</span>}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="empty shop-no-reviews">
              <Star size={36} />
              <h3>Aucun avis pour le moment</h3>
              <p>Soyez le premier client à donner votre avis sur cette boutique.</p>
              {user && <button className="shop-review-button" onClick={openReviewForm}><Star size={17} /> Donner mon avis</button>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
