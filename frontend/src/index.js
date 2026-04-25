import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { register as registerSW } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA offline support (production only)
registerSW({
  onSuccess: () => console.log('[PWA] App cached for offline use.'),
  onUpdate:  () => console.log('[PWA] New version available — refresh to update.')
});

reportWebVitals();
