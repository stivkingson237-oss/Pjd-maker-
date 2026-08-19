import React from 'react';
import MarketplaceShell from './MarketplaceShell.jsx';
import AuthGate from './AuthGate.jsx';

export default function App() {
  return (
    <AuthGate>
      <MarketplaceShell />
    </AuthGate>
  );
}
