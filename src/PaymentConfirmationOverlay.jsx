import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import './payment-confirmation.css';

const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

export default function PaymentConfirmationOverlay() {
  const [visible, setVisible] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [total, setTotal] = useState(0);
  const lastTotalRef = useRef(0);
  const handledRef = useRef(false);

  useEffect(() => {
    const readCartTotal = (cart) => (Array.isArray(cart) ? cart : []).reduce(
      (sum, item) => sum + Number(item?.price || 0) * Math.max(1, Number(item?.quantity || 1)),
      0
    );

    const rememberCheckoutTotal = () => {
      const totalBox = document.querySelector('.mv-total');
      if (!totalBox) return;
      const values = [...totalBox.querySelectorAll('strong')].map((el) =>
        Number(String(el.textContent || '').replace(/[^0-9]/g, ''))
      ).filter(Number.isFinite);
      if (values.length) lastTotalRef.current = values[values.length - 1];
    };

    const onCartUpdated = (event) => {
      const cartTotal = readCartTotal(event.detail?.cart);
      if (cartTotal > 0) lastTotalRef.current = cartTotal;
      rememberCheckoutTotal();
    };

    window.addEventListener('pjd-cart-updated', onCartUpdated);
    try {
      const cart = JSON.parse(localStorage.getItem('pjd-cart') || '[]');
      const cartTotal = readCartTotal(cart);
      if (cartTotal > 0) lastTotalRef.current = cartTotal;
    } catch {}

    const checkConfirmation = () => {
      rememberCheckoutTotal();
      if (handledRef.current) return;
      const success = document.querySelector('.mv-success');
      if (!success) return;

      const strongs = [...success.querySelectorAll('strong')].map((el) => String(el.textContent || '').trim()).filter(Boolean);
      const reference = strongs[0] || '';
      const payment = strongs[1] || '';
      if (!reference) return;

      handledRef.current = true;
      setOrderId(reference);
      setPaymentRef(payment);
      setTotal(lastTotalRef.current || 0);
      setVisible(true);
    };

    const observer = new MutationObserver(checkConfirmation);
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = window.setInterval(checkConfirmation, 500);

    return () => {
      window.removeEventListener('pjd-cart-updated', onCartUpdated);
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  const close = () => {
    document.querySelector('.mv-modal header button')?.click();
    setVisible(false);
    handledRef.current = false;
  };

  if (!visible) return null;

  return (
    <div className="pjd-payment-confirmation" role="dialog" aria-modal="true" aria-label="Commande confirmée">
      <main className="pjd-payment-confirmation-card">
        <div className="pjd-confirm-icon"><Check size={46} strokeWidth={3} /></div>
        <h1>Commande confirmée</h1>
        <p className="pjd-confirm-message">
          Votre commande <span>{orderId}</span> a bien été enregistrée. Vous recevrez un appel pour la livraison.
        </p>

        <div className="pjd-confirm-order-card">
          <div>
            <span>Boutique</span>
            <strong>PJD Market</strong>
          </div>
          <div className="pjd-confirm-total-row">
            <strong>Total</strong>
            <strong>{money(total)}</strong>
          </div>
        </div>

        <p className="pjd-paid-total">Total payé : <strong>{money(total)}</strong></p>
        {paymentRef && <p className="pjd-payment-ref">Référence paiement : {paymentRef}</p>}

        <button className="pjd-confirm-back" type="button" onClick={close}>Retour à la boutique</button>
      </main>
    </div>
  );
}
