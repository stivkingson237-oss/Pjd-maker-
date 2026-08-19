import React, { useState } from 'react';
import MarketplaceShell from './MarketplaceShell.jsx';
import AuthGate from './AuthGate.jsx';
import SellerDashboard from './SellerDashboard.jsx';

export default function App() {
  const [sellerOpen, setSellerOpen] = useState(false);
  const handleMarketplaceClick = (event) => {
    const button = event.target.closest?.('button');
    if (button && button.textContent?.includes('Commencer à vendre')) {
      event.preventDefault();
      setSellerOpen(true);
    }
  };
  return (
    <AuthGate>
      <div onClickCapture={handleMarketplaceClick}>
        {sellerOpen ? <SellerDashboard onBack={() => setSellerOpen(false)} /> : <MarketplaceShell />}
      </div>
    </AuthGate>
  );
}
