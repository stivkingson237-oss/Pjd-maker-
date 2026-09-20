import React from 'react';

const sections = [
  {
    title: '1. Informations collectées',
    body: (
      <>
        <p>Lors de l’utilisation de PJD Market, nous pouvons collecter les informations nécessaires au fonctionnement du service :</p>
        <ul>
          <li>nom et prénom ;</li>
          <li>adresse e-mail ;</li>
          <li>numéro de téléphone, pays et indicatif ;</li>
          <li>adresse de livraison lorsque cela est nécessaire ;</li>
          <li>informations relatives aux commandes, achats et ventes ;</li>
          <li>informations nécessaires à la gestion d’une boutique vendeur.</li>
        </ul>
      </>
    )
  },
  {
    title: '2. Utilisation de vos données',
    body: (
      <>
        <p>Vos informations peuvent être utilisées pour créer et gérer votre compte, traiter les commandes et paiements, organiser les livraisons, permettre aux vendeurs de traiter les commandes qui les concernent, assurer la sécurité de la plateforme, vous contacter au sujet de votre compte ou de vos commandes et améliorer les services de PJD Market.</p>
      </>
    )
  },
  {
    title: '3. Données de paiement',
    body: (
      <>
        <p>PJD Market ne stocke pas directement les données sensibles de votre carte bancaire ou les identifiants confidentiels de vos moyens de paiement. Les paiements sont traités par les prestataires de paiement disponibles sur la plateforme. Leur propre politique de confidentialité peut également s’appliquer.</p>
      </>
    )
  },
  {
    title: '4. Partage des informations',
    body: (
      <>
        <p>Vos données personnelles ne sont pas vendues à des tiers. Lorsque cela est nécessaire au traitement d’une commande, certaines informations peuvent être communiquées à la boutique concernée, uniquement dans la mesure nécessaire à la préparation et à la livraison de la commande. Certaines informations peuvent également être transmises à des prestataires techniques ou de paiement lorsque cela est nécessaire au fonctionnement du service.</p>
      </>
    )
  },
  {
    title: '5. Produits numériques',
    body: (
      <>
        <p>Pour l’achat ou le téléchargement d’un produit numérique, les informations liées à la commande peuvent être utilisées pour vérifier le paiement, autoriser l’accès au produit et assurer le suivi de la transaction.</p>
      </>
    )
  },
  {
    title: '6. Sécurité',
    body: (
      <>
        <p>PJD Market met en œuvre des mesures techniques et organisationnelles raisonnables pour protéger les données personnelles contre l’accès non autorisé, la perte, la modification ou la divulgation. Aucun système informatique ne peut toutefois garantir une sécurité absolue.</p>
      </>
    )
  },
  {
    title: '7. Conservation des données',
    body: (
      <>
        <p>Les informations personnelles sont conservées aussi longtemps que nécessaire pour fournir nos services, gérer les commandes, respecter les obligations légales et résoudre d’éventuels litiges. Lorsqu’elles ne sont plus nécessaires, elles peuvent être supprimées ou anonymisées conformément aux règles applicables.</p>
      </>
    )
  },
  {
    title: '8. Vos droits',
    body: (
      <>
        <p>Vous pouvez demander, selon les conditions prévues par la réglementation applicable, l’accès à vos données personnelles, leur correction ou mise à jour, ainsi que la suppression de certaines données. Certaines modifications peuvent être effectuées directement depuis votre profil.</p>
      </>
    )
  },
  {
    title: '9. Cookies',
    body: (
      <>
        <p>PJD Market peut utiliser des cookies ou technologies similaires nécessaires au fonctionnement du site, à la sécurité, à la mémorisation de certaines préférences et à l’amélioration de l’expérience utilisateur.</p>
      </>
    )
  },
  {
    title: '10. Contact',
    body: (
      <>
        <p>Pour toute question concernant cette politique ou vos données personnelles, contactez l’administration de PJD Market via les moyens de contact disponibles sur la plateforme.</p>
      </>
    )
  }
];

export default function PrivacyPolicy({ onBack }) {
  return (
    <main className="pjd-privacy-page">
      <style>{`
        .pjd-privacy-page{min-height:100vh;background:#f7f7f8;color:#171717;padding:28px 16px 64px}
        .pjd-privacy-wrap{max-width:900px;margin:0 auto}
        .pjd-privacy-back{border:0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:10px 15px;font-weight:800;cursor:pointer;margin-bottom:22px}
        .pjd-privacy-card{background:#fff;border:1px solid #e7e7e7;border-radius:22px;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.05)}
        .pjd-privacy-kicker{color:#f97316;font-size:12px;font-weight:900;letter-spacing:.12em}
        .pjd-privacy-card h1{font-size:clamp(28px,5vw,42px);margin:8px 0 6px}
        .pjd-privacy-date{color:#6b7280;margin:0 0 28px}
        .pjd-privacy-section{padding:22px 0;border-top:1px solid #eee}
        .pjd-privacy-section:first-of-type{border-top:0}
        .pjd-privacy-section h2{font-size:20px;margin:0 0 10px}
        .pjd-privacy-section p,.pjd-privacy-section li{line-height:1.75;color:#454545}
        .pjd-privacy-section ul{padding-left:22px}
        @media(max-width:600px){.pjd-privacy-card{padding:20px;border-radius:18px}}
      `}</style>
      <div className="pjd-privacy-wrap">
        <button type="button" className="pjd-privacy-back" onClick={onBack}>← Retour à PJD Market</button>
        <article className="pjd-privacy-card">
          <span className="pjd-privacy-kicker">PJD MARKET</span>
          <h1>Politique de confidentialité</h1>
          <p className="pjd-privacy-date">Dernière mise à jour : septembre 2026</p>
          <p>PJD Market accorde une grande importance à la protection de vos données personnelles. Cette politique explique quelles informations nous collectons, pourquoi nous les utilisons et comment nous les protégeons.</p>
          {sections.map((section) => (
            <section className="pjd-privacy-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.body}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
