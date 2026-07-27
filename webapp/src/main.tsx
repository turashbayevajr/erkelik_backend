import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css';
import { initTelegram } from './telegram';
import { App } from './App';

initTelegram();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
