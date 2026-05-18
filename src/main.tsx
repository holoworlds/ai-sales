import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppLogger } from './services/logger';

// Nexus Persistent Monitoring initialized
AppLogger.updateContext(undefined, 'booting');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
