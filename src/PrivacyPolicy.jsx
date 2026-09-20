import React from 'react';

export default function PrivacyPolicy({ onBack }) {
  return (
    <main className="pjd-privacy-page">
      <style>{`
        .pjd-privacy-page{min-height:100vh;background:#f7f7f8;color:#171717;padding:28px 16px 64px}
        .pjd-privacy-wrap{max-width:900px;margin:0 auto}
        .pjd-privacy-back{border:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 15px;font-weight:800;cursor:pointer;margin-bottom:22px}
        .pjd-privacy-card{background:#fff;border:1px solid #e7e7e7;border-radius:22px;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.05)}
        .pjd-privacy-card h1{font-size:clamp(28px,5vw,42px);margin:0 0 24px}
        .pjd-privacy-card p{font-size:16px;line-height:1.8;color:#454545;margin:0 0 20px}
        @media(max-width:600px){.pjd-privacy-card{padding:20px;border-radius:18px}}
      `}</style>
      <div className="pjd-privacy-wrap">
        <button type="button" className="pjd-privacy-back" onClick={onBack}>← Retour à PJD Market</button>
        <article className="pjd-privacy-card">
          <h1>Politique de confidentialité</h1>
          <p>PJD Maker collecte les informations nécessaires à la création de votre compte (nom, e-mail, téléphone) et à la livraison de vos commandes (adresse).</p>
          <p>Les données de paiement ne sont jamais stockées par PJD Maker ; elles transitent uniquement par les prestataires de paiement choisis.</p>
          <p>Vos informations ne sont partagées qu'avec la boutique concernée par votre commande, dans la stricte mesure nécessaire à son traitement.</p>
          <p>Vous pouvez à tout moment demander la mise à jour ou la suppression de vos données personnelles depuis votre profil ou en contactant l'administration.</p>
          <p>PJD Maker met en œuvre des mesures raisonnables pour protéger vos données, sans pouvoir garantir une sécurité absolue face à des attaques externes.</p>
        </article>
      </div>
    </main>
  );
}
