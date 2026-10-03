import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { PresentationApp } from './presentation/PresentationApp';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Element #root fehlt in index.html');

createRoot(root).render(
  <StrictMode>
    {/* Dieselbe Seite dient als Beamer-Fenster, wenn sie mit ?view=presentation geöffnet wird. */}
    {new URLSearchParams(window.location.search).get('view') === 'presentation' ? (
      <PresentationApp />
    ) : (
      <App />
    )}
  </StrictMode>,
);
