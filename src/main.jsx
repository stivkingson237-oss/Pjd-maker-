import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './responsive.css';
import './marketplace.css';
import './marketplace-extra.css';
import './product-detail.css';
import './interface-overrides.css';
import './ai/ai-modern.css';
import './pjd-market-fix.css';
import './pjd-ui-system.css';
import './public-shop-cart-bridge.js';

const App = React.lazy(() => import('./App.jsx'));
const PaymentConfirmationOverlay = React.lazy(() => import('./PaymentConfirmationOverlay.jsx'));

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('PJD Maker runtime/module error:', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error?.stack || this.state.error?.message || String(this.state.error);
    return React.createElement('div', { style: { minHeight: '100vh', padding: '32px 20px', background: '#f7f8fa', color: '#111827', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, React.createElement('div', { style: { maxWidth: 720, width: '100%', background: '#fff', padding: 24, borderRadius: 18, border: '1px solid #e5e7eb', boxShadow: '0 12px 40px rgba(0,0,0,.08)' } }, React.createElement('h1', { style: { marginTop: 0 } }, 'PJD Maker'), React.createElement('p', null, 'Le chargement de l’application a rencontré une erreur.'), React.createElement('pre', { style: { whiteSpace: 'pre-wrap', overflowX: 'auto', color: '#b42318', background: '#fff5f5', padding: 14, borderRadius: 10 } }, message), React.createElement('button', { onClick: () => window.location.reload(), style: { marginTop: 10, border: 0, borderRadius: 10, padding: '12px 18px', background: '#f97316', color: '#fff', fontWeight: 800 } }, 'Recharger PJD Maker')));
  }
}
function LoadingScreen() { return React.createElement('div', { style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa', color: '#111827', fontFamily: 'system-ui, sans-serif' } }, React.createElement('div', { style: { textAlign: 'center' } }, React.createElement('div', { style: { fontSize: 32, fontWeight: 900 } }, 'PJD Maker'), React.createElement('div', { style: { marginTop: 8, opacity: .7 } }, 'Chargement…'))); }

// Keep every open PJD Market tab aligned with the latest production deployment.
// Vercel serves index.html and version.json without cache; Vite assets are fingerprinted.
function watchForPjdUpdates() {
  if (typeof window === 'undefined' || window.__pjdUpdateWatcher) return;
  window.__pjdUpdateWatcher = true;
  let currentBuild = '';
  let updateAvailable = false;
  let notice = null;

  const canReloadSafely = () => {
    const active = document.activeElement;
    const editing = active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    const submitting = Boolean(document.querySelector('form [type="submit"]:disabled'));
    const modalOpen = Boolean(document.querySelector('[role="dialog"], .modal.show, .modal-overlay'));
    return !editing && !submitting && !modalOpen;
  };

  const showUpdateNotice = () => {
    if (notice || !document.body) return;
    notice = document.createElement('div');
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'position:fixed;z-index:2147483647;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:#101b2d;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.25);font:600 13px system-ui';
    const label = document.createElement('span');
    label.textContent = 'Une nouvelle version de PJD Market est disponible.';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Actualiser';
    button.style.cssText = 'border:0;border-radius:9px;padding:10px 13px;background:#f97316;color:white;font-weight:800;white-space:nowrap';
    button.addEventListener('click', () => window.location.reload());
    notice.append(label, button);
    document.body.appendChild(notice);
  };

  const check = async () => {
    try {
      const response = await fetch('/version.json?check=' + Date.now(), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.buildId) return;
      if (!currentBuild) {
        currentBuild = data.buildId;
        return;
      }
      if (data.buildId !== currentBuild) {
        updateAvailable = true;
        if (canReloadSafely()) window.location.reload();
        else showUpdateNotice();
      }
    } catch (_) {
      // A temporary offline/mobile connection must not interrupt the app.
    }
  };

  check();
  window.setInterval(() => { if (updateAvailable && canReloadSafely()) window.location.reload(); else check(); }, 60000);
  window.addEventListener('focus', () => { if (updateAvailable && canReloadSafely()) window.location.reload(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (updateAvailable && canReloadSafely()) window.location.reload();
      else check();
    }
  });
}
watchForPjdUpdates();

createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(AppErrorBoundary, null, React.createElement(Suspense, { fallback: React.createElement(LoadingScreen) }, React.createElement(React.Fragment, null, React.createElement(App), React.createElement(PaymentConfirmationOverlay))))));