import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register service worker for offline play
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Eko Monopoly Offline Service Worker registered:', reg.scope);
      })
      .catch((err) => {
        console.warn('Service worker registration error:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
