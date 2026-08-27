// Registre fonctionnel unique de PJD Maker.
// Les écrans existants restent compatibles; ce registre sert de référence pour la navigation,
// les permissions, les tests et la migration progressive vers une architecture par domaines.
export const APP_REGISTRY = {
  marketplace: {
    label: 'Marketplace',
    features: ['home','search','categories','product-detail','public-shops','favorites'],
  },
  auth: {
    label: 'Authentification',
    features: ['login','signup','session','profile'],
  },
  customer: {
    label: 'Espace client',
    features: ['cart','checkout','payments','orders','deliveries','reviews'],
  },
  seller: {
    label: 'Espace vendeur',
    features: ['dashboard','shop','products','stock','orders','crm','messages','finance','marketing','loyalty','referral','ads','ai','opportunities','notifications','settings'],
  },
  commerce: {
    label: 'Commerce',
    features: ['promo-codes','commissions','affiliate','subscriptions'],
  },
  admin: {
    label: 'Administration',
    features: ['users','sellers','products','orders','payments','commissions','withdrawals','promotions','configuration'],
  },
  platform: {
    label: 'Plateforme',
    features: ['supabase-auth','postgres','rls','storage','edge-functions','notifications'],
  },
};

export const ALL_FEATURES = Object.values(APP_REGISTRY).flatMap(domain => domain.features);
