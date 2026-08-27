export const SELLER_NAVIGATION = [
  { id: 'dashboard', label: '📊 Tableau de bord', domain: 'analytics' },
  { id: 'shop', label: '🏪 Ma boutique', domain: 'shop' },
  { id: 'products', label: '📦 Produits & prix', domain: 'catalog' },
  { id: 'stock', label: '📦 Stock', domain: 'catalog' },
  { id: 'orders', label: '📋 Commandes', domain: 'orders' },
  { id: 'crm', label: '👥 Clients / CRM', domain: 'customers' },
  { id: 'messages', label: '💬 Messages', domain: 'communication' },
  { id: 'finance', label: '💰 Finances', domain: 'finance' },
  { id: 'marketing', label: '📣 Marketing', domain: 'growth' },
  { id: 'loyalty', label: '🎁 Fidélité', domain: 'growth' },
  { id: 'referral', label: '🚀 Parrainage', domain: 'growth' },
  { id: 'ads', label: '📢 PJD Ads', domain: 'growth' },
  { id: 'ai', label: '🤖 PJD AI', domain: 'growth' },
  { id: 'opportunities', label: '💡 Opportunités', domain: 'growth' },
  { id: 'notifications', label: '🔔 Notifications', domain: 'communication' },
  { id: 'settings', label: '⚙️ Paramètres', domain: 'settings' },
];

export const SELLER_ROUTES = Object.fromEntries(SELLER_NAVIGATION.map(item => [item.id, item.id]));
