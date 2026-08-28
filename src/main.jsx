import React from 'react';
import { createRoot } from 'react-dom/client';
import './responsive.css';
import './marketplace.css';
import './marketplace-extra.css';
import './interface-overrides.css';
import App from './App.jsx';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('PJD Maker runtime error:', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.message || String(this.state.error);
    return React.createElement('div', {
      style: {
        minHeight: '100vh', padding: '32px 20px', background: '#f7f8fa',
        color: '#111827', fontFamily: 'system-ui, sans-serif',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }
    }, React.createElement('div', {
      style: { maxWidth: 620, width: '100%', background: '#fff', padding: 24,
        borderRadius: 18, border: '1px solid #e5e7eb', boxShadow: '0 12px 40px rgba(0,0,0,.08)' }
    },
      React.createElement('h1', { style: { marginTop: 0 } }, 'PJD Maker'),
      React.createElement('p', null, 'Une erreur JavaScript empêche l’interface de se charger.'),
      React.createElement('pre', { style: { whiteSpace: 'pre-wrap', color: '#b42318', background: '#fff5f5', padding: 14, borderRadius: 10 } }, message),
      React.createElement('button', {
        onClick: () => window.location.reload(),
        style: { marginTop: 10, border: 0, borderRadius: 10, padding: '12px 18px', background: '#f97316', color: '#fff', fontWeight: 800 }
      }, 'Recharger PJD Maker')
    ));
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
