import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error handler to prevent SES/lockdown environment crashes from unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection caught globally:', event.reason);
  // Prevent the default browser behavior (crash/overlay in some environments)
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
