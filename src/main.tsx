import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// كود إجباري لتنظيف ومسح كاش الـ Service Worker القديم من الخلفية
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().then((success) => {
        if (success) {
          console.log('Old Service Worker cache cleared successfully!');
          window.location.reload(); // إعادة تحميل تلقائية لعرض سيستم إنجاز الحقيقي
        }
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
